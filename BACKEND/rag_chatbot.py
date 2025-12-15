from fastapi import FastAPI, HTTPException, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
import json
import asyncio
import logging  
from datetime import datetime
import uuid
from pathlib import Path

# Import your RAG chatbot class
from rag import SimpleRAGChatbot

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models
class ChatMessage(BaseModel):
    message: str
    chat_id: Optional[str] = "1"
    
class ChatResponse(BaseModel):
    response: str
    chat_id: str
    timestamp: str
    status: str = "success"
    sources: Optional[List[Dict[str, Any]]] = None

class ChatSession(BaseModel):
    chat_id: str
    messages: List[Dict[str, Any]]
    created_at: str
    last_updated: str

# Initialize FastAPI app
app = FastAPI(
    title="MiTra AI RAG Backend",
    description="RAG-based chatbot backend using Gemini LLM and HuggingFace embeddings",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","*"],  # In production, replace with your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
chatbot_instance = None
chat_sessions: Dict[str, Dict] = {}
UPLOAD_DIRECTORY = "uploaded_documents"
VECTORSTORE_DIRECTORY = "vectorstores"

# Ensure directories exist
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)
os.makedirs(VECTORSTORE_DIRECTORY, exist_ok=True)

# Configuration
GEMINI_API_KEY = "AIzaSyDyW7zxlEd8PiWqkpmY4SNRS-m1SNkGhDY"  # Replace with your actual API key or use environment variable

async def initialize_chatbot():
    """Initialize the RAG chatbot"""
    global chatbot_instance
    try:
        logger.info("Initializing RAG chatbot...")
        chatbot_instance = SimpleRAGChatbot(GEMINI_API_KEY)
        logger.info("RAG chatbot initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize chatbot: {e}")
        return False

async def load_default_document():
    """Load default document if available"""
    global chatbot_instance
    # default_pdf_path = "D:/main_RAG_bot/newdata.pdf"
    
    default_pdf_path = r"C:\Users\prakarsh.modi\python_work\delivered_RAG_bot\DATA\newdata.pdf"
 

    
    if os.path.exists(default_pdf_path) and chatbot_instance:
        try:
            vectorstore_path = default_pdf_path.replace('.pdf', '_hf_vectorstore')
            
            # Try to load existing vectorstore first
            if not chatbot_instance.load_vectorstore(vectorstore_path):
                logger.info("Loading default document...")
                success = chatbot_instance.load_document(default_pdf_path)
                if success:
                    chatbot_instance.save_vectorstore(vectorstore_path)
                    logger.info("Default document loaded successfully")
                else:
                    logger.warning("Failed to load default document")
            else:
                logger.info("Loaded existing vectorstore for default document")
        except Exception as e:
            logger.error(f"Error loading default document: {e}")

@app.on_event("startup")
async def startup_event():
    """Initialize chatbot on startup"""
    success = await initialize_chatbot()
    if success:
        await load_default_document()
    else:
        logger.error("Failed to initialize chatbot. Some endpoints may not work.")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "MiTra AI RAG Backend is running",
        "status": "active",
        "endpoints": {
            "chat": "/chat/send",
            "upload": "/documents/upload",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    document_loaded = False
    vectorstore_exists = False
    qa_chain_ready = False
    
    if chatbot_instance:
        document_loaded = chatbot_instance.vectorstore is not None
        qa_chain_ready = chatbot_instance.qa_chain is not None
        vectorstore_path = DEFAULT_PDF_PATH.replace('.pdf', '_hf_vectorstore')
        vectorstore_exists = os.path.exists(vectorstore_path)
    
    return {
        "status": "healthy" if chatbot_instance and qa_chain_ready else "unhealthy",
        "timestamp": datetime.now().isoformat(),
        "chatbot_initialized": chatbot_instance is not None,
        "document_loaded": document_loaded,
        "qa_chain_ready": qa_chain_ready,
        "vectorstore_exists": vectorstore_exists,
        "default_pdf_path": DEFAULT_PDF_PATH,
        "default_pdf_exists": os.path.exists(DEFAULT_PDF_PATH)
    }

@app.post("/chat/send")
async def send_message(
    message: str = Form(...),
    chat_id: str = Form(default="1")
):
    """Send a message to the chatbot and get response"""
    try:
        if not chatbot_instance:
            raise HTTPException(
                status_code=503, 
                detail="Chatbot not initialized. Please try again later."
            )
        
        if not message or not message.strip():
            raise HTTPException(
                status_code=400, 
                detail="Message cannot be empty"
            )
        
        logger.info(f"Processing message for chat_id: {chat_id}")
        
        # Initialize chat session if doesn't exist
        if chat_id not in chat_sessions:
            chat_sessions[chat_id] = {
                "chat_id": chat_id,
                "messages": [],
                "created_at": datetime.now().isoformat(),
                "last_updated": datetime.now().isoformat()
            }
        
        # Add user message to session
        user_message = {
            "id": str(uuid.uuid4()),
            "text": message,
            "sender": "user",
            "timestamp": datetime.now().isoformat()
        }
        chat_sessions[chat_id]["messages"].append(user_message)
        
        # Get response from chatbot
        try:
            bot_response = chatbot_instance.chat(message)
            
            if not bot_response:
                bot_response = "I apologize, but I couldn't generate a response. Please try again."
            
        except Exception as e:
            logger.error(f"Error getting chatbot response: {e}")
            bot_response = "I'm experiencing some technical difficulties. Please try again later."
        
        # Add bot response to session
        bot_message = {
            "id": str(uuid.uuid4()),
            "text": bot_response,
            "sender": "bot",
            "timestamp": datetime.now().isoformat()
        }
        chat_sessions[chat_id]["messages"].append(bot_message)
        chat_sessions[chat_id]["last_updated"] = datetime.now().isoformat()
        
        response_data = {
            "response": bot_response,
            "message": bot_response,  # Alternative field name for compatibility
            "chat_id": chat_id,
            "timestamp": datetime.now().isoformat(),
            "status": "success"
        }
        
        return JSONResponse(content=response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in send_message: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/chat/send_with_sources")
async def send_message_with_sources(
    message: str = Form(...),
    chat_id: str = Form(default="1")
):
    """Send a message and get response with source information"""
    try:
        if not chatbot_instance:
            raise HTTPException(
                status_code=503, 
                detail="Chatbot not initialized. Please try again later."
            )
        
        if not message or not message.strip():
            raise HTTPException(
                status_code=400, 
                detail="Message cannot be empty"
            )
        
        logger.info(f"Processing message with sources for chat_id: {chat_id}")
        
        # Get response with sources
        try:
            bot_response, sources = chatbot_instance.chat_with_sources(message)
        except Exception as e:
            logger.error(f"Error getting chatbot response with sources: {e}")
            bot_response = "I'm experiencing some technical difficulties. Please try again later."
            sources = []
        
        response_data = {
            "response": bot_response,
            "chat_id": chat_id,
            "timestamp": datetime.now().isoformat(),
            "status": "success",
            "sources": sources
        }
        
        return JSONResponse(content=response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in send_message_with_sources: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and process a PDF document for RAG"""
    try:
        if not chatbot_instance:
            raise HTTPException(
                status_code=503, 
                detail="Chatbot not initialized. Please try again later."
            )
        
        # Check file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400, 
                detail="Only PDF files are supported"
            )
        
        # Save uploaded file
        file_path = os.path.join(UPLOAD_DIRECTORY, file.filename)
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        logger.info(f"File saved: {file_path}")
        
        # Process document with chatbot
        try:
            vectorstore_path = os.path.join(VECTORSTORE_DIRECTORY, f"{Path(file.filename).stem}_vectorstore")
            
            # Load document
            success = chatbot_instance.load_document(file_path)
            
            if success:
                # Save vectorstore
                chatbot_instance.save_vectorstore(vectorstore_path)
                
                return JSONResponse(content={
                    "message": "Document uploaded and processed successfully",
                    "filename": file.filename,
                    "status": "success",
                    "vectorstore_path": vectorstore_path
                })
            else:
                raise HTTPException(
                    status_code=500, 
                    detail="Failed to process the uploaded document"
                )
                
        except Exception as e:
            logger.error(f"Error processing document: {e}")
            # Clean up file if processing failed
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=500, 
                detail=f"Error processing document: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in upload_document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/chat/sessions")
async def get_chat_sessions():
    """Get all chat sessions"""
    return {
        "sessions": list(chat_sessions.values()),
        "total_sessions": len(chat_sessions)
    }

@app.get("/chat/sessions/{chat_id}")
async def get_chat_session(chat_id: str):
    """Get a specific chat session"""
    if chat_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    return chat_sessions[chat_id]

@app.delete("/chat/sessions/{chat_id}")
async def delete_chat_session(chat_id: str):
    """Delete a chat session"""
    if chat_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    del chat_sessions[chat_id]
    return {"message": f"Chat session {chat_id} deleted successfully"}

@app.post("/chat/sessions/{chat_id}/clear")
async def clear_chat_session(chat_id: str):
    """Clear messages in a chat session but keep the session"""
    if chat_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    chat_sessions[chat_id]["messages"] = []
    chat_sessions[chat_id]["last_updated"] = datetime.now().isoformat()
    
    return {"message": f"Chat session {chat_id} cleared successfully"}

@app.get("/documents/list")
async def list_documents():
    """List all uploaded documents"""
    try:
        documents = []
        
        # List uploaded files
        if os.path.exists(UPLOAD_DIRECTORY):
            for filename in os.listdir(UPLOAD_DIRECTORY):
                file_path = os.path.join(UPLOAD_DIRECTORY, filename)
                if os.path.isfile(file_path) and filename.lower().endswith('.pdf'):
                    stat = os.stat(file_path)
                    documents.append({
                        "filename": filename,
                        "size": stat.st_size,
                        "uploaded_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "vectorstore_exists": os.path.exists(os.path.join(VECTORSTORE_DIRECTORY, f"{Path(filename).stem}_vectorstore"))
                    })
        
        return {
            "documents": documents,
            "total_documents": len(documents)
        }
        
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving document list")

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "Endpoint not found", "status": "error"}
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "status": "error"}
    )

if __name__ == "__main__":
    import uvicorn
    
    # Run the server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,  # Set to False in production
        log_level="info"
    )