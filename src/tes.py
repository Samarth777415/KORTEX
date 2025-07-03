import streamlit as st
import os
from langchain_core.messages import AIMessage, HumanMessage
from langchain_community.document_loaders import WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_huggingface import HuggingFaceEmbeddings
from huggingface_hub import InferenceClient

load_dotenv()

# Set USER_AGENT to avoid warnings
if not os.getenv("USER_AGENT"):
    os.environ["USER_AGENT"] = "chat-with-websites-app"

# Initialize the Novita client
client = InferenceClient(
    provider="novita",
    api_key=os.environ["HF_TOKEN"],
)

def get_vectorstore_from_url(url):
    try:
        # get the text in document form
        loader = WebBaseLoader(url)
        document = loader.load()
        
        # split the document into chunks
        text_splitter = RecursiveCharacterTextSplitter()
        document_chunks = text_splitter.split_documents(document)
        
        embedding = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

        vector_store = FAISS.from_documents(document_chunks, embedding)
        return vector_store
    except Exception as e:
        st.error(f"Error loading website: {str(e)}")
        return None

def get_context_retriever_chain(vector_store):
    try:
        retriever = vector_store.as_retriever()
        
        # Create a simple retriever that will be used with our custom RAG chain
        return retriever
    except Exception as e:
        st.error(f"Error creating retriever chain: {str(e)}")
        return None

def format_chat_history(chat_history):
    """Format chat history for the model"""
    formatted_history = []
    for message in chat_history:
        if isinstance(message, HumanMessage):
            formatted_history.append({"role": "user", "content": message.content})
        elif isinstance(message, AIMessage):
            formatted_history.append({"role": "assistant", "content": message.content})
    return formatted_history

def get_response(user_input):
    try:
        retriever = get_context_retriever_chain(st.session_state.vector_store)
        if retriever is None:
            return "Sorry, I couldn't process your request due to an error with the retriever."
        
        # Get relevant documents
        relevant_docs = retriever.get_relevant_documents(user_input)
        context = "\n\n".join([doc.page_content for doc in relevant_docs])
        
        # Format chat history
        formatted_history = format_chat_history(st.session_state.chat_history)
        
        # Create the messages for the API call
        messages = formatted_history + [
            {
                "role": "system",
                "content": f"Answer the user's questions based on the below context:\n\n{context}"
            },
            {
                "role": "user",
                "content": user_input
            }
        ]
        
        # Call the DeepSeek-V3 model via Novita
        completion = client.chat.completions.create(
            model="deepseek-ai/DeepSeek-V3",
            messages=messages,
            max_tokens=512,
            temperature=0.7
        )
        
        return completion.choices[0].message.content
        
    except Exception as e:
        return f"Sorry, I encountered an error: {str(e)}"

# app config
st.set_page_config(page_title="Chat with websites", page_icon="🤖")
st.title("Chat with websites")

# sidebar
with st.sidebar:
    st.header("Settings")
    website_url = st.text_input("Website URL")

if website_url is None or website_url == "":
    st.info("Please enter a website URL")
else:
    # session state
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = [
            AIMessage(content="Hello, I am a bot. How can I help you?"),
        ]
    
    # Only create vector store if URL has changed or doesn't exist
    if "vector_store" not in st.session_state or st.session_state.get("current_url") != website_url:
        with st.spinner("Loading website content..."):
            vector_store = get_vectorstore_from_url(website_url)
            if vector_store:
                st.session_state.vector_store = vector_store
                st.session_state.current_url = website_url
                st.success("Website loaded successfully!")
            else:
                st.error("Failed to load website. Please check the URL and try again.")

    # Only show chat interface if vector store exists
    if "vector_store" in st.session_state:
        # user input
        user_query = st.chat_input("Type your message here...")
        if user_query is not None and user_query != "":
            response = get_response(user_query)
            st.session_state.chat_history.append(HumanMessage(content=user_query))
            st.session_state.chat_history.append(AIMessage(content=response))

        # conversation
        for message in st.session_state.chat_history:
            if isinstance(message, AIMessage):
                with st.chat_message("AI"):
                    st.write(message.content)
            elif isinstance(message, HumanMessage):
                with st.chat_message("Human"):
                    st.write(message.content)