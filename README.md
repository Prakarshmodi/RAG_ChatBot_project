# RAG Chatbot - AI-Powered Question Answering System

A full-stack RAG (Retrieval-Augmented Generation) chatbot application with FastAPI backend and React frontend. This system uses Google's Gemini LLM with HuggingFace embeddings for intelligent document-based Q&A.

## 📋 Project Structure

```
rag-chatbot/
├── BACKEND/
│   ├── rag_chatbot.py       # FastAPI server
│   ├── rag.py              # RAG chatbot logic
│   └── requirements_new.txt # Python dependencies
├── FRONTEND/
│   ├── src/                # React source code
│   ├── public/             # Static assets
│   └── package.json        # NPM dependencies
└── DATA/                   # Vector store data
```

## 🚀 Features

- **RAG-based Search**: Retrieves relevant documents before generating responses
- **File Upload**: Upload and process documents for Q&A
- **Modern UI**: React-based interactive interface with Tailwind CSS
- **Chat History**: Maintains conversation context
- **CORS Support**: Ready for cross-origin requests

## 📦 Tech Stack

**Backend:**
- FastAPI
- Python 3.x
- Google Generative AI (Gemini)
- HuggingFace Embeddings
- FAISS Vector Store

**Frontend:**
- React 18
- Tailwind CSS
- Lucide React Icons

## 🛠️ Installation

### Backend Setup

1. Navigate to backend folder:
```bash
cd BACKEND
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements_new.txt
```

4. Set up environment variables:
```bash
# Create .env file
echo GOOGLE_API_KEY=your_api_key_here > .env
```

5. Run the server:
```bash
python rag_chatbot.py
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend folder:
```bash
cd FRONTEND
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## 📖 API Endpoints

- `POST /chat` - Send a chat message
- `POST /upload` - Upload documents
- `GET /health` - Health check
- `POST /clear-history` - Clear chat history

## 🔑 Configuration

Create a `.env` file in the BACKEND folder with:
```
GOOGLE_API_KEY=your_google_gemini_api_key
```

## 📝 Usage

1. Start the backend server
2. Start the frontend application
3. Upload documents using the file upload feature
4. Ask questions about the uploaded documents
5. Get AI-generated responses based on document retrieval

## 🤝 Contributing

Feel free to fork and submit pull requests for any improvements.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## ⚠️ Important Notes

- This project requires a valid Google Gemini API key
- Uploaded documents are processed and vectorized for retrieval
- The vector store is stored in the DATA folder
- Sensitive data should not be committed (use .gitignore)

## 📧 Support

For issues or questions, please open an issue on GitHub.
