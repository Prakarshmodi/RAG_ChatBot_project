import os
from langchain_google_genai import GoogleGenerativeAI
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain_huggingface import HuggingFaceEmbeddings

class SimpleRAGChatbot:
    def __init__(self, gemini_api_key):
        """
        Initialize the RAG chatbot with Gemini LLM and HuggingFace embeddings
        """
        # Set API key
        os.environ["GOOGLE_API_KEY"] = gemini_api_key
        
        # Initialize Gemini LLM
        self.llm = GoogleGenerativeAI(
            model="gemini-1.5-flash",
            temperature=0.1,
            google_api_key=gemini_api_key
        )
        
        # Initialize HuggingFace embeddings (free, runs locally)
        print("Loading HuggingFace embeddings model (first time may take a few minutes)...")
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",  # Lightweight model
            model_kwargs={'device': 'cpu'},  # Use CPU
            encode_kwargs={'normalize_embeddings': True}
        )
        
        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        
        # Vector store will be initialized after loading documents
        self.vectorstore = None
        self.qa_chain = None
        
        print("RAG Chatbot initialized successfully!")
    
    def load_document(self, pdf_path):
        """
        Load and process PDF document for RAG
        """
        try:
            print(f"Loading document: {pdf_path}")
            
            # Load PDF using LangChain
            loader = PyPDFLoader(pdf_path)
            documents = loader.load()
            
            if not documents:
                print("No content found in the PDF")
                return False
            
            print(f"Loaded {len(documents)} pages from PDF")
            
            # Split documents into chunks
            texts = self.text_splitter.split_documents(documents)
            print(f"Split into {len(texts)} chunks")
            
            # Create vector store (this will be much faster with local embeddings)
            print("Creating embeddings and vector store...")
            self.vectorstore = FAISS.from_documents(texts, self.embeddings)
            
            # Create custom prompt template
            prompt_template = """
Use the following pieces of context to answer the question. If you cannot find the answer in the context, just say "I don't know". Do not make up an answer.

Context: {context}

Question: {question}

Answer:"""
            
            PROMPT = PromptTemplate(
                template=prompt_template,
                input_variables=["context", "question"]
            )
            
            # Create QA chain
            self.qa_chain = RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=self.vectorstore.as_retriever(
                    search_type="similarity",
                    search_kwargs={"k": 3}  # Retrieve top 3 most similar chunks
                ),
                chain_type_kwargs={"prompt": PROMPT},
                return_source_documents=False
            )
            
            print("Document loaded and processed successfully!")
            return True
            
        except Exception as e:
            print(f"Error loading document: {e}")
            return False
    
    def save_vectorstore(self, path: str):
        """Save the vector store to disk"""
        if self.vectorstore:
            self.vectorstore.save_local(path)
            print(f"Vector store saved to {path}")
    
    def load_vectorstore(self, path: str) -> bool:
        """Load the vector store from disk"""
        try:
            if os.path.exists(path):
                self.vectorstore = FAISS.load_local(path, self.embeddings, allow_dangerous_deserialization=True)
                self._setup_qa_chain()
                print(f"Vector store loaded from {path}")
                return True
        except Exception as e:
            print(f"Error loading vector store: {e}")
        return False
    
    def _setup_qa_chain(self):
        """Setup the QA chain after vector store is ready"""
        prompt_template = """
Use the following pieces of context to answer the question. If you cannot find the answer in the context, just say "I don't know". Do not make up an answer.

Context: {context}

Question: {question}

Answer:"""
        
        PROMPT = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"]
        )
        
        self.qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.vectorstore.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 3}
            ),
            chain_type_kwargs={"prompt": PROMPT},
            return_source_documents=False
        )
    
    def chat(self, query):
        """
        Main chat function
        """
        if not self.qa_chain:
            return "Please load a PDF document first using load_document() method."
        
        try:
            print(f"\nQuestion: {query}")
            
            # Get answer from QA chain
            result = self.qa_chain.invoke({"query": query})
            answer = result["result"].strip()
            
            # Clean up the answer
            if not answer or answer.lower() in ["i don't know", "i don't know.", ""]:
                answer = "I don't know"
            
            print(f"Answer: {answer}")
            return answer
            
        except Exception as e:
            print(f"Error processing query: {e}")
            return "I don't know"
    
    def chat_with_sources(self, query):
        """
        Chat function that also returns source information
        """
        if not self.vectorstore:
            return "Please load a PDF document first.", []
        
        try:
            # Get relevant documents
            docs = self.vectorstore.similarity_search(query, k=3)
            
            if not docs:
                return "I don't know", []
            
            # Create context from retrieved documents
            context = "\n\n".join([doc.page_content for doc in docs])
            
            # Create prompt
            prompt = f"""
Based on the following context, answer the question. If you cannot find the answer in the context, just say "I don't know".

Context: {context}

Question: {query}

Answer:"""
            
            # Get answer from LLM
            answer = self.llm.invoke(prompt).strip()
            
            if not answer or "i don't know" in answer.lower():
                answer = "I don't know"
            
            # Extract source information
            sources = []
            for doc in docs:
                source_info = {
                    'content': doc.page_content[:200] + "...",
                    'metadata': doc.metadata
                }
                sources.append(source_info)
            
            return answer, sources
            
        except Exception as e:
            print(f"Error: {e}")
            return "I don't know", []

def main():
    """
    Main function to run the chatbot
    """
    print("Simple RAG Chatbot with HuggingFace Embeddings and Gemini LLM")
    print("=" * 65)
    
    # Get API key
    # api_key = "AIzaSyBw6L-p9-lY4MD1JPSNddHeHqt0yhByhcw"
    api_key="AIzaSyDyW7zxlEd8PiWqkpmY4SNRS-m1SNkGhDY"
 
    
    # Initialize chatbot
    try:
        chatbot = SimpleRAGChatbot(api_key)
    except Exception as e:
        print(f"Error initializing chatbot: {e}")
        return
    
    # Load PDF document
    # pdf_path = "C:\Users\khevaiya.ghode\khevaiya\python3_work\knwledge_base\newdata.pdf"

    
    pdf_path = r"C:\Users\prakarsh.modi\python_work\delivered_RAG_bot\DATA\newdata.pdf"

    # Try to load existing vectorstore first
    vectorstore_path = pdf_path.replace('.pdf', '_hf_vectorstore')
    if not chatbot.load_vectorstore(vectorstore_path):
        success = chatbot.load_document(pdf_path)
        if not success:
            print("Failed to load document!")
            return
        # Save vectorstore for future use
        chatbot.save_vectorstore(vectorstore_path)
    
    print("\n" + "="*65)
    print("RAG Chatbot is ready! Type 'quit' to exit.")
    print("You can also type 'sources' to see source information.")
    print("="*65)
    
    # Chat loop
    while True:
        user_input = input("\nYour question: ").strip()
        
        if user_input.lower() in ['quit', 'exit', 'bye']:
            print("Goodbye!")
            break
        
        if not user_input:
            continue
        
        if user_input.lower() == 'sources':
            user_input = input("Question with sources: ").strip()
            if not user_input:
                continue
            
            answer, sources = chatbot.chat_with_sources(user_input)
            print(f"\nAnswer: {answer}")
            
            if sources and answer != "I don't know":
                print("\nSources:")
                for i, source in enumerate(sources, 1):
                    print(f"{i}. {source['content']}")
                    if 'page' in source['metadata']:
                        print(f"   (Page: {source['metadata']['page']})")
        else:
            chatbot.chat(user_input)

if __name__ == "__main__":
    main()