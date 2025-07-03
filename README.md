### 🧠 Kortex – Chat with Any Website Using GenAI

**Kortex** is a Chrome Extension powered by **Generative AI (GenAI)** that lets you chat with any webpage like you're talking to ChatGPT. It reads and understands the content of the current tab and answers your questions in context.

> Think of it as your **personal AI assistant for the web**, intelligently tailored to each page you visit.

---

### 🚀 Features

* 🔍 **Context-Aware Chat**: Understands and chats based on the current webpage using Retrieval-Augmented Generation (RAG)
* 🧠 **GenAI-Powered Responses**: Uses Hugging Face LLMs (like DeepSeek) via LangChain to generate accurate, fluent answers
* 🗂️ **Per-Page Memory**: Maintains your chat history for each website per day
* 💬 **ChatGPT-like UI**: Clean, responsive interface inspired by modern messaging apps
* 🔄 **Auto Loads URL Context**: Automatically detects the active tab and fetches relevant content
* ⚡ **FastAPI Backend**: Lightweight, fast backend for RAG + inference logic

---

### 🧰 Tech Stack

| Layer         | Technology                                         |
| ------------- | -------------------------------------------------- |
| 🧠 LLM        | Hugging Face (`DeepSeek`, etc.)                    |
| 🔗 LangChain  | RAG Pipeline (Vectorstore + Retriever + Prompting) |
| 🧩 Embeddings | `sentence-transformers/all-MiniLM-L6-v2`           |
| 🧠 Backend    | Python, FastAPI                                    |
| 🧱 Vector DB  | FAISS                                              |
| 🌐 Frontend   | HTML, CSS, JavaScript (Chrome Extension APIs)      |
| 📦 Storage    | localStorage for per-day chat history              |

---



### 🧪 How It Works

1. **User opens the extension** → current tab URL is auto-detected
2. **Web content is loaded** and embedded using Hugging Face transformers
3. **User sends a question** → LangChain fetches relevant content from FAISS
4. **Prompt is built** → LLM generates a context-aware response
5. **Response is shown** in a chat-style UI, and history is saved locally

---

### 🛠️ Installation

1. Clone this repo
2. Run the backend:

   ```bash
   uvicorn app:app --reload
   ```
3. Open `chrome://extensions/`
4. Enable **Developer Mode**
5. Click **Load Unpacked** and select the `extension/` folder

---

### 📌 Project Structure

```
📁 src/
   └── app.py               # FastAPI app with LangChain pipeline
📁 extension/
   ├── popup.html           # Chat UI
   ├── popup.js             # Frontend logic (with RAG & chat history)
   ├── style.css            # ChatGPT-like styles
```

---

### 🔐 Environment Variables (Backend)

Create a `.env` file in `src/` with:

```env
HF_TOKEN=your_huggingface_token
```

---

### ✨ Name Meaning

> **Kortex** is derived from “cortex” — the part of the brain responsible for reasoning and decision-making — reflecting the AI’s ability to understand and generate intelligent answers from complex web content.

---
### 🖼️ Kortex Architecture – RAG Pipeline

Here’s how  Kortex Architecture looks:

![Kortex Architecture](docs/HTML-rag-diagram.jpg) 

---
### 📌 Future Plans

* ✅ Chat history cloud sync (beyond localStorage)
* ✅ User login + personalization
* ✅ GPT-style typing animation
* ✅ PDF / file upload support

---

### 📄 License

MIT License

