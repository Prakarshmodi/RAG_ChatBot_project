import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Bot, User, Menu, X,
  MessageSquare, Plus, RefreshCw, Zap, Shield, Search,
  Minimize2, Maximize2, Sun, Moon, Star, Trash2,
  Copy, Bookmark, AlertCircle, Clock, Square
} from 'lucide-react';

// Import the company logo SVG
import CompanyLogoSVG from './assets/yash-logo-new.svg'; 

// Company Logo Component
const CompanyLogo = ({ className }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <img src={CompanyLogoSVG} alt="Company Logo" className="w-full h-full object-contain" />
  </div>
);

// Typing Animation Component with auto-scroll and stop functionality
const TypewriterText = ({ text, speed = 50, onComplete, onTextUpdate, shouldStop, onStop }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStopped, setIsStopped] = useState(false);

  useEffect(() => {
    if (shouldStop && !isStopped) {
      setIsStopped(true);
      if (onStop) {
        onStop(displayedText);
      }
      return;
    }

    if (currentIndex < text.length && !isStopped) {
      const timer = setTimeout(() => {
        const newText = text.slice(0, currentIndex + 1);
        setDisplayedText(newText);
        setCurrentIndex(currentIndex + 1);
        
        // Trigger auto-scroll during typing
        if (onTextUpdate) {
          onTextUpdate();
        }
      }, speed);

      return () => clearTimeout(timer);
    } else if ((currentIndex >= text.length || isStopped) && onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete, onTextUpdate, shouldStop, isStopped, displayedText, onStop]);

  return <span className="whitespace-pre-wrap">{displayedText}</span>;
};

const ChatbotUI = () => {
  // Store messages for each chat separately
  const [chatMessages, setChatMessages] = useState({
    1: [{
      id: 1,
      text: "Hello! I'm your MiTra AI Assistant. How can I assist you today?",
      sender: 'bot',
      timestamp: new Date(),
      typing: false,
      isAnimating: false,
      status: 'delivered'
    }]
  });

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shouldStopGeneration, setShouldStopGeneration] = useState(false);
  const [currentAbortController, setCurrentAbortController] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      id: 1,
      title: "Getting Started",
      lastMessage: "Hello! I'm your MiTra AI Assistant...",
      timestamp: new Date(),
      isActive: true,
      messageCount: 1,
      isPinned: false,
      category: 'general'
    }
  ]);
  const [activeChat, setActiveChat] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState('light');
  const [showMessageActions, setShowMessageActions] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // API Configuration
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  // Get current chat messages
  const currentMessages = chatMessages[activeChat] || [];

  // Enhanced scroll function with smooth behavior
  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior,
        block: 'end',
        inline: 'nearest'
      });
    }
  };

  // Auto-scroll during typing animation
  const handleTextUpdate = () => {
    // Use a slight delay to ensure the DOM is updated
    setTimeout(() => {
      scrollToBottom('smooth');
    }, 10);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  // Additional scroll trigger for typing state changes
  useEffect(() => {
    if (isTyping) {
      scrollToBottom();
    }
  }, [isTyping]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Stop generation function
  const handleStopGeneration = () => {
    setShouldStopGeneration(true);
    setIsGenerating(false);
    
    // Abort the API call if it's in progress
    if (currentAbortController) {
      currentAbortController.abort();
      setCurrentAbortController(null);
    }
  };

  // Handle when typewriter stops
  const handleTypewriterStop = (currentText) => {
    // Update the message with the current text and mark it as complete
    updateChatMessages(activeChat, prev => 
      prev.map(msg => 
        msg.isAnimating ? { ...msg, text: currentText, isAnimating: false } : msg
      )
    );
    
    setIsTyping(false);
    setIsGenerating(false);
    setShouldStopGeneration(false);
  };

  // API call to send message to backend
  const sendMessageToAPI = async (message, abortController) => {
    try {
      setError(null);
      
      const formData = new FormData();
      formData.append('message', message);
      formData.append('chat_id', activeChat.toString());

      const response = await fetch(`${API_BASE_URL}/chat/send`, {
        method: 'POST',
        body: formData,
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return null;
      }
      console.error('Error sending message:', error);
      throw error;
    }
  };

  // Update messages for specific chat
  const updateChatMessages = (chatId, updater) => {
    setChatMessages(prev => ({
      ...prev,
      [chatId]: updater(prev[chatId] || [])
    }));
  };

  const simulateTypingAndGetResponse = async (text) => {
    setIsTyping(true);
    setIsLoading(true);
    setIsGenerating(true);
    setShouldStopGeneration(false);

    // Create abort controller for this request
    const abortController = new AbortController();
    setCurrentAbortController(abortController);

    const typingMessage = {
      id: Date.now() + Math.random(),
      text: '',
      sender: 'bot',
      timestamp: new Date(),
      typing: true
    };

    // Add typing indicator to current chat
    updateChatMessages(activeChat, prev => [...prev, typingMessage]);

    try {
      // Call the API
      const responseData = await sendMessageToAPI(text, abortController);
      
      // If request was aborted, don't proceed
      if (!responseData) {
        // Remove typing indicator
        updateChatMessages(activeChat, prev => prev.filter(msg => !msg.typing));
        setIsTyping(false);
        setIsLoading(false);
        setIsGenerating(false);
        setCurrentAbortController(null);
        return;
      }
      
      // Remove typing indicator from current chat
      updateChatMessages(activeChat, prev => prev.filter(msg => !msg.typing));

      // Add the actual response with animation to current chat
      const response = {
        id: Date.now() + Math.random(),
        text: responseData.response || responseData.message || "I received your message but couldn't generate a proper response.",
        sender: 'bot',
        timestamp: new Date(),
        typing: false,
        isAnimating: true,
        status: 'delivered',
        apiResponse: responseData
      };

      updateChatMessages(activeChat, prev => [...prev, response]);
      updateChatHistory(response.text);
      
    } catch (error) {
      // Remove typing indicator from current chat
      updateChatMessages(activeChat, prev => prev.filter(msg => !msg.typing));
      
      // Add error message to current chat
      const errorResponse = {
        id: Date.now() + Math.random(),
        text: `I apologize, but I'm having trouble connecting to my services right now.  Error: ${error.message}. Please try again later.`,
        sender: 'bot',
        timestamp: new Date(),
        typing: false,
        isAnimating: true,
        status: 'error',
        isError: true
      };

      updateChatMessages(activeChat, prev => [...prev, errorResponse]);
      setError(error.message);
    } finally {
      setIsLoading(false);
      setCurrentAbortController(null);
    }
  };

  const updateChatHistory = (lastMessage) => {
    setChatHistory(prev => prev.map(chat =>
      chat.id === activeChat
        ? {
            ...chat,
            lastMessage: lastMessage.substring(0, 60) + (lastMessage.length > 60 ? '...' : ''),
            timestamp: new Date(),
            messageCount: (chatMessages[activeChat] || []).filter(msg => !msg.typing).length + 1
          }
        : chat
    ));
  };

  const handleSend = async () => {
    if (!inputText.trim() || isTyping || isLoading) return;

    const newMessage = {
      id: Date.now(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
      typing: false,
      status: 'sent'
    };

    // Add message to current chat
    updateChatMessages(activeChat, prev => [...prev, newMessage]);
    updateChatHistory(inputText);
    
    const messageText = inputText;
    setInputText('');

    // Send to API
    await simulateTypingAndGetResponse(messageText);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const createNewChat = () => {
    const newChatId = Date.now();
    const newChat = {
      id: newChatId,
      title: `New Chat ${chatHistory.length + 1}`,
      lastMessage: "New conversation started",
      timestamp: new Date(),
      messageCount: 0,
      isActive: false,
      isPinned: false,
      category: 'general'
    };

    // Initialize messages for new chat with welcome message
    const welcomeMessage = {
      id: 1,
      text: "Hello! I'm your MiTra AI Assistant. How can I help you today?",
      sender: 'bot',
      timestamp: new Date(),
      typing: false,
      status: 'delivered'
    };

    setChatMessages(prev => ({
      ...prev,
      [newChatId]: [welcomeMessage]
    }));

    setChatHistory(prev => prev.map(chat => ({ ...chat, isActive: false })));
    setChatHistory(prev => [...prev, { ...newChat, isActive: true, messageCount: 1 }]);
    setActiveChat(newChatId);
    setError(null);
  };

  const switchChat = (chatId) => {
    setChatHistory(prev => prev.map(chat => ({
      ...chat,
      isActive: chat.id === chatId
    })));
    setActiveChat(chatId);
    setSidebarOpen(false);
    setError(null);
  };

  const deleteChat = (chatId) => {
    if (chatHistory.length > 1) {
      setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
      
      // Remove chat messages
      setChatMessages(prev => {
        const newChatMessages = { ...prev };
        delete newChatMessages[chatId];
        return newChatMessages;
      });

      if (chatId === activeChat) {
        const remainingChats = chatHistory.filter(chat => chat.id !== chatId);
        if (remainingChats.length > 0) {
          switchChat(remainingChats[0].id);
        }
      }
    }
  };

  const pinChat = (chatId) => {
    setChatHistory(prev => prev.map(chat =>
      chat.id === chatId ? { ...chat, isPinned: !chat.isPinned } : chat
    ));
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredHistory = chatHistory
    .filter(chat =>
      chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

  const copyMessage = (text) => {
    navigator.clipboard.writeText(text);
    setShowMessageActions(null);
  };

  const handleAnimationComplete = (messageId) => {
    updateChatMessages(activeChat, prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isAnimating: false } : msg
    ));
    setIsGenerating(false);
    setIsTyping(false);
    setShouldStopGeneration(false);
  };

  const TypingIndicator = () => (
    <div className="flex items-start space-x-3 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-md">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl px-5 py-4 shadow-sm">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );

  // Error Banner Component
  const ErrorBanner = () => {
    if (!error) return null;
    
    return (
      <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-800 rounded transition-colors"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>
    );
  };

  // Calculate sidebar and main content positioning for better balance
  const sidebarWidth = sidebarMinimized ? 'w-16' : 'w-72';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-inter">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 ${sidebarWidth} bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 transform transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 shadow-xl`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className={`flex items-center ${sidebarMinimized ? 'justify-center p-3' : 'justify-between p-4'} border-b border-gray-200/50 dark:border-gray-700/50`}>
            {/* Logo and Company Name */}
            <div className={`flex items-center ${sidebarMinimized ? 'justify-center' : 'space-x-3'}`}>
              <CompanyLogo className={`${sidebarMinimized ? 'w-10 h-10' : 'w-12 h-12'} flex-shrink-0`} />
              {!sidebarMinimized && (
                <h2
                className="font-extrabold text-3xl md:text-4xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap ml-3"
                style={{ 
                fontFamily: "'Gill Sans Ultra Bold', 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif", 
                letterSpacing: '0.08em'
                }}
            >
                MiTra
            </h2>
            )}
        </div>

            {/* Controls */}
            {!sidebarMinimized && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors lg:hidden"
                  aria-label="Close sidebar"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSidebarMinimized(!sidebarMinimized)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors hidden lg:block"
                  title="Minimize Sidebar"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {sidebarMinimized && (
              <button
                onClick={() => setSidebarMinimized(false)}
                className="absolute -right-3 top-4 p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-md hover:shadow-lg transition-all"
                title="Expand Sidebar"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* New Chat Button */}
          <div className={`${sidebarMinimized ? 'p-2' : 'p-4'}`}>
            <button
              onClick={createNewChat}
              disabled={isLoading}
              className={`w-full flex items-center ${sidebarMinimized ? 'justify-center p-2.5' : 'justify-center space-x-2 px-4 py-3'} bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-400 hover:to-purple-400 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
              title={sidebarMinimized ? "New Chat" : ""}
            >
              <Plus className="w-5 h-5 flex-shrink-0" />
              {!sidebarMinimized && <span className="font-medium">New Chat</span>}
            </button>
          </div>

          {/* Search */}
          {!sidebarMinimized && (
            <div className="px-4 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                />
              </div>
            </div>
          )}

          {/* Chat History */}
          <div className={`flex-1 overflow-y-auto ${sidebarMinimized ? 'px-2' : 'px-4'} space-y-1`}>
            {!sidebarMinimized && (
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                Conversations
              </h3>
            )}
            {filteredHistory.map((chat) => (
              <div
                key={chat.id}
                className={`group relative ${sidebarMinimized ? 'flex justify-center' : 'flex items-center justify-between'} p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 ${chat.isActive ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700/50 shadow-sm' : ''}`}
                onClick={() => switchChat(chat.id)}
              >
                <div className={`flex items-center ${sidebarMinimized ? 'justify-center' : 'space-x-3'} flex-1 min-w-0`}>
                  <div className={`${sidebarMinimized ? 'w-8 h-8' : 'w-9 h-9'} bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <MessageSquare className={`${sidebarMinimized ? 'w-4 h-4' : 'w-5 h-5'} text-white`} />
                  </div>
                  {!sidebarMinimized && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1">
                        {chat.isPinned && <Star className="w-3 h-3 text-yellow-500 fill-current" />}
                        <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm">
                          {chat.title}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {chat.lastMessage}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {formatTime(chat.timestamp)}
                        </p>
                        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                          {chat.messageCount}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {!sidebarMinimized && (
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        pinChat(chat.id);
                      }}
                      className={`p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all ${chat.isPinned ? 'text-yellow-500' : 'text-gray-400'}`}
                      title="Pin/Unpin Chat"
                    >
                      <Star className={`w-3 h-3 ${chat.isPinned ? 'fill-current' : ''}`} />
                    </button>
                    {!chat.isActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded transition-all"
                        title="Delete Chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {sidebarMinimized && chat.isActive && (
                  <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-full"></div>
                )}
              </div>
            ))}
          </div>

          {/* Sidebar Footer - Only Theme Toggle */}
          <div className={`${sidebarMinimized ? 'p-2' : 'p-4'} border-t border-gray-200/50 dark:border-gray-700/50`}>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className={`w-full flex items-center ${sidebarMinimized ? 'justify-center p-2.5' : 'space-x-3 px-3 py-2.5'} text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors`}
            >
              {theme === 'light' ? <Moon className="w-4 h-4 flex-shrink-0" /> : <Sun className="w-4 h-4 flex-shrink-0" />}
              {!sidebarMinimized && <span className="text-sm">{theme === 'light' ? 'Dark' : 'Light'} Mode</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="relative">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-10 to-purple-20 rounded-xl shadow-lg">
                <CompanyLogo className="w-10 h-10" />
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${isOnline ? 'bg-green-500' : 'bg-gray-400'} border-2 border-white dark:border-gray-800 rounded-full`}></div>
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900 dark:text-white">MiTra AI Assistant</h1>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 ${isOnline ? 'bg-green-500' : 'bg-gray-400'} rounded-full`}></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isLoading ? 'Processing...' : isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => window.location.reload()}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors" 
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        <ErrorBanner />

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scroll-smooth" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {currentMessages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-4 ${
                message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              } animate-in slide-in-from-bottom-4 duration-300 group`}
              onMouseEnter={() => setShowMessageActions(message.id)}
              onMouseLeave={() => setShowMessageActions(null)}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 shadow-md">
                {message.sender === 'user' ? (
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              <div className={`${
                message.sender === 'user' 
                  ? 'max-w-xs sm:max-w-md lg:max-w-2xl items-end' 
                  : 'flex-1 items-start'
              } flex flex-col space-y-1`}>
                <div
                  className={`px-4 py-3 rounded-2xl relative ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-100 to-purple-100 text-gray-900 ml-auto shadow-lg'
                      : message.isError
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 shadow-lg border border-red-200 dark:border-red-700 w-full'
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-lg border border-gray-100 dark:border-gray-600 w-full'
                  } hover:shadow-xl transition-all duration-200 transform hover:scale-[1.01]`}
                >
                  {message.isError && (
                    <div className="flex items-center space-x-2 mb-2 text-xs font-semibold text-red-600 dark:text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      <span>ERROR</span>
                    </div>
                  )}
                  
                  {message.isAnimating ? (
                    <div className="text-sm leading-relaxed">
                      <TypewriterText 
                        text={message.text} 
                        speed={2} 
                        onComplete={() => handleAnimationComplete(message.id)}
                        onTextUpdate={handleTextUpdate}
                        shouldStop={shouldStopGeneration}
                        onStop={handleTypewriterStop}
                      />
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                  )}

                  {/* Message status indicator */}
                  {message.sender === 'user' && message.status && (
                    <div className="flex items-center justify-end mt-2 space-x-1">
                      <span className="text-xs text-gray-500 opacity-75">
                        {message.status === 'sent' ? 'Sent' : 'Delivered'}
                      </span>
                      <div className={`w-1 h-1 rounded-full ${message.status === 'delivered' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    </div>
                  )}
                </div>

                {/* Message actions */}
                {showMessageActions === message.id && !message.typing && (
                  <div className={`flex items-center space-x-1 ${message.sender === 'user' ? 'justify-end' : 'justify-start'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <button
                      onClick={() => copyMessage(message.text)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Copy message"
                    >
                      <Copy className="w-3 h-3 text-gray-400" />
                    </button>
                    {message.sender === 'bot' && !message.isError && (
                      <>
                        <button 
                          onClick={() => simulateTypingAndGetResponse("Please regenerate your last response with more details.")}
                          disabled={isLoading}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50" 
                          title="Regenerate response"
                        >
                          <RefreshCw className="w-3 h-3 text-gray-400" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Bookmark">
                          <Bookmark className="w-3 h-3 text-gray-400" />
                        </button>
                      </>
                    )}
                  </div>
                )}

                <div className={`flex items-center space-x-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(message.timestamp)}
                  </span>
                  {message.sender === 'bot' && (
                    <div className="flex items-center space-x-1">
                      <Zap className="w-3 h-3 text-blue-500" />
                      <span className="text-xs text-blue-500 font-medium">AI</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions Bar */}
        <div className="px-6 py-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { icon: <Zap className="w-3 h-3" />, text: 'Quick Analysis', color: 'from-blue-500 to-blue-600' },
              { icon: <Search className="w-3 h-3" />, text: 'Research Topic', color: 'from-blue-500 to-blue-600' },
              { icon: <Shield className="w-3 h-3" />, text: 'Code Review', color: 'from-blue-500 to-blue-600' }
            ].map((action, index) => (
              <button
                key={index}
                onClick={() => setInputText(action.text.toLowerCase())}
                disabled={isLoading}
                className={`flex items-center space-x-2 px-3 py-2 text-xs bg-gradient-to-r ${action.color} text-white rounded-full hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {action.icon}
                <span className="font-medium">{action.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border-t border-gray-200/50 dark:border-gray-700/50 shadow-lg">
          <div className="flex items-end space-x-3 max-w-4xl mx-auto">
            {/* Input Field */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                placeholder={isLoading ? "Processing your request..." : "Ask me anything.."}
                className="w-full px-4 py-3 pr-20 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-2xl border border-gray-200 dark:border-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 max-h-32 shadow-inner text-sm leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
                rows="1"
                style={{ minHeight: '48px' }}
              />
              <div className="absolute right-3 bottom-3 flex items-center space-x-2">
                <span className={`text-xs ${inputText.length > 1800 ? 'text-red-500' : 'text-gray-400'}`}>
                  {inputText.length}/2000
                </span>
              </div>
            </div>

            {/* Send/Stop Button */}
            <div className="flex space-x-2">
              {/* Stop Button - Shows when generating */}
              {isGenerating && (
                <button
                  onClick={handleStopGeneration}
                  className="p-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  title="Stop Generation"
                >
                  <Square className="w-4 h-4" />
                </button>
              )}

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isTyping || isLoading}
                className={`p-3 rounded-2xl transition-all duration-200 transform hover:scale-105 ${
                  inputText.trim() && !isTyping && !isLoading
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-purple-700'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed shadow-md'
                }`}
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotUI;