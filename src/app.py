from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict
import os

from langchain_core.messages import AIMessage, HumanMessage
from langchain_community.document_loaders import WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from huggingface_hub import InferenceClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set default user agent
if not os.getenv("USER_AGENT"):
    os.environ["USER_AGENT"] = "chat-with-websites-app"

# Initialize the model client
client = InferenceClient(
    provider="novita",
    api_key=os.environ["HF_TOKEN"],
)

# FastAPI app initialization
app = FastAPI()

# Enable CORS so Chrome extension can access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Ideally replace with ["chrome-extension://<extension_id>"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session store (in-memory)
sessions: Dict[str, Dict] = {}

# Request models
class InitRequest(BaseModel):
    url: str

class ChatRequest(BaseModel):
    url: str
    message: str

# Helper functions
def get_vectorstore_from_url(url: str):
    loader = WebBaseLoader(url)
    document = loader.load()

    text_splitter = RecursiveCharacterTextSplitter()
    document_chunks = text_splitter.split_documents(document)

    embedding = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"}  )

    vector_store = FAISS.from_documents(document_chunks, embedding)
    return vector_store

def get_context_retriever_chain(vector_store):
    return vector_store.as_retriever()

def format_chat_history(chat_history):
    formatted_history = []
    for message in chat_history:
        if isinstance(message, HumanMessage):
            formatted_history.append({"role": "user", "content": message.content})
        elif isinstance(message, AIMessage):
            formatted_history.append({"role": "assistant", "content": message.content})
    return formatted_history

def get_response(user_input, chat_history, vector_store):
    retriever = get_context_retriever_chain(vector_store)
    relevant_docs = retriever.get_relevant_documents(user_input)
    context = "\n\n".join([doc.page_content for doc in relevant_docs])

    formatted_history = format_chat_history(chat_history)
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

    completion = client.chat.completions.create(
        model="deepseek-ai/DeepSeek-V3",
        messages=messages,
        max_tokens=512,
        temperature=0.7
    )

    return completion.choices[0].message.content

# FastAPI Routes
@app.post("/init")
def init(payload: InitRequest):
    url = payload.url
    if url not in sessions:
        sessions[url] = {
            "chat_history": [AIMessage(content="Hello, I am a bot. How can I help you?")],
            "vector_store": None
        }

    if sessions[url]["vector_store"] is None:
        sessions[url]["vector_store"] = get_vectorstore_from_url(url)

    return {"status": "initialized"}

@app.post("/chat")
def chat(payload: ChatRequest):
    url = payload.url
    user_message = payload.message

    if url not in sessions:
        return {"error": "URL not initialized. Call /init first."}

    session = sessions[url]
    response = get_response(user_message, session["chat_history"], session["vector_store"])

    session["chat_history"].append(HumanMessage(content=user_message))
    session["chat_history"].append(AIMessage(content=response))

    return {"response": response}
