"use client"

import { useState, useEffect, useRef } from "react";
import { BsSendFill, BsTrash, BsChatDots, BsArrowRepeat, BsPaperclip, BsX } from "react-icons/bs";
import { MdOutlineMic, MdOutlineStop } from "react-icons/md";
import { HiSpeakerWave, HiSpeakerXMark } from "react-icons/hi2";
import { v4 as uuidv4 } from 'uuid';
import { createWorker } from 'tesseract.js';

// Add this right after the imports at the top

// Add this before the ChatBot component
const typingIndicatorStyles = `
@keyframes blink {
  0% { transform: scale(1); opacity: 0.4; }
  20% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.4; }
}

@keyframes pulse-gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes progress-indeterminate {
  0% { 
    transform: translateX(-100%);
    width: 40%; 
  }
  100% { 
    transform: translateX(200%);
    width: 40%; 
  }
}

@keyframes shimmer {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}

@keyframes thinking-dots {
  0%, 20% { content: '.'; }
  40%, 60% { content: '..'; }
  80%, 100% { content: '...'; }
}

.typing-indicator {
  display: flex;
  align-items: center;
}

.typing-indicator .dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 4px;
  background-color: #6366f1;
  border-radius: 50%;
  opacity: 0.4;
}

.typing-indicator .dot:nth-child(1) {
  animation: blink 1.4s infinite 0s;
}

.typing-indicator .dot:nth-child(2) {
  animation: blink 1.4s infinite 0.2s;
}

.typing-indicator .dot:nth-child(3) {
  animation: blink 1.4s infinite 0.4s;
}

.indeterminate-progress-bar {
  position: relative;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0);
}

.indeterminate-progress-bar::after {
  content: '';
  position: absolute;
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, 
    rgba(99, 102, 241, 0.1), 
    rgba(99, 102, 241, 1), 
    rgba(99, 102, 241, 0.1));
  border-radius: 9999px;
  animation: progress-indeterminate 1.5s infinite ease-in-out;
}

.indeterminate-progress-bar::before {
  content: '';
  position: absolute;
  height: 100%;
  width: 20%;
  background: linear-gradient(90deg, 
    rgba(129, 140, 248, 0), 
    rgba(129, 140, 248, 0.8), 
    rgba(129, 140, 248, 0));
  border-radius: 9999px;
  animation: progress-indeterminate 2.3s infinite ease-in-out 0.5s;
  opacity: 0.7;
}

.thinking-text::after {
  content: '...';
  display: inline-block;
  animation: thinking-dots 1.5s infinite;
  width: 1.2em;
  text-align: left;
}

.shimmer-effect {
  animation: shimmer 1.5s infinite ease-in-out;
}
`;

// Add this right after the ChatBot function starts
const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isChatStarted, setIsChatStarted] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastBotMessage, setLastBotMessage] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [fileInfo, setFileInfo] = useState(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isOcrReady, setIsOcrReady] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [character, setCharacter] = useState("blockchain-advisor");
  const [isCharacterMenuOpen, setIsCharacterMenuOpen] = useState(false);
  const [llm, setLlm] = useState("nilai");
  const [isLlmMenuOpen, setIsLlmMenuOpen] = useState(false);
  const [responseProgress, setResponseProgress] = useState(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const tesseractWorker = useRef(null);
  const characterMenuRef = useRef(null);
  const llmMenuRef = useRef(null);

  const recognition = useRef(null);
  const speechSynthesis = useRef(null);
  const utterance = useRef(null);

  // Define blockchain-focused characters instead of the previous ones
  const characters = [
    { id: "blockchain-advisor", name: "Blockchain Advisor", description: "Expert on blockchain fundamentals and technology", emoji: "⛓️" },
    { id: "defi-specialist", name: "DeFi Specialist", description: "Expertise in decentralized finance protocols and strategies", emoji: "💸" },
    { id: "nft-guru", name: "NFT Guru", description: "Specialist in NFT creation, markets, and trends", emoji: "🖼️" },
    { id: "crypto-trader", name: "Crypto Trader", description: "Focused on cryptocurrency markets and trading concepts", emoji: "📈" },
    { id: "smart-contract-dev", name: "Smart Contract Dev", description: "Expert in smart contract development and security", emoji: "📝" },
    { id: "dao-strategist", name: "DAO Strategist", description: "Specialized in decentralized autonomous organizations", emoji: "🏛️" },
    { id: "web3-architect", name: "Web3 Architect", description: "Focused on web3 infrastructure and development", emoji: "🌐" },
    { id: "metaverse-guide", name: "Metaverse Guide", description: "Expert on virtual worlds and metaverse concepts", emoji: "🌌" },
    { id: "token-economist", name: "Token Economist", description: "Specialist in tokenomics and crypto economics", emoji: "💰" },
    { id: "blockchain-security", name: "Security Expert", description: "Focused on blockchain security and best practices", emoji: "🔒" },
  ];

  // Define available LLM models with correct IDs
  const llmModels = [
    { id: "nilai", name: "Nilai", description: "Primary language model" },
    { id: "0g", name: "0G", description: "Alternative language model" },
  ];

  // Close character menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (characterMenuRef.current && !characterMenuRef.current.contains(event.target)) {
        setIsCharacterMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load character preference from localStorage
  useEffect(() => {
    const storedCharacter = localStorage.getItem('aiCharacter');
    if (storedCharacter) {
      setCharacter(storedCharacter);
    }
  }, []);

  // Close LLM menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (llmMenuRef.current && !llmMenuRef.current.contains(event.target)) {
        setIsLlmMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load LLM preference from localStorage
  useEffect(() => {
    const storedLlm = localStorage.getItem('aiLlm');
    if (storedLlm) {
      setLlm(storedLlm);
    }
  }, []);

  // Initialize Tesseract worker - completely different approach
  useEffect(() => {
    let isMounted = true;
    
    const initWorker = async () => {
      if (isMounted) setIsOcrLoading(true);
      console.log('Initializing Tesseract...');
      
      try {
        // Skip worker initialization entirely and just set OCR as ready
        // We'll use the direct recognition method for all image processing
        setTimeout(() => {
          if (isMounted) {
            setIsOcrReady(true);
            setIsOcrLoading(false);
            console.log('Using direct OCR recognition mode');
          }
        }, 1000);
      } catch (error) {
        console.error('Failed to initialize Tesseract:', error);
        if (isMounted) {
          setIsOcrReady(false);
          setIsOcrLoading(false);
        }
      }
    };

    initWorker();

    return () => {
      isMounted = false;
      // No worker to terminate
    };
  }, [retryCount]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load chat history from localStorage on component mount
  useEffect(() => {
    const storedConversationId = localStorage.getItem('conversationId');
    const storedMessages = localStorage.getItem('chatHistory');
    
    if (storedConversationId) {
      setConversationId(storedConversationId);
    }
    
    if (storedMessages) {
      try {
        const parsedMessages = JSON.parse(storedMessages);
        setMessages(parsedMessages);
        if (parsedMessages.length > 0) {
          setIsChatStarted(true);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatHistory', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  // Initialize window-dependent objects safely
  useEffect(() => {
    // Initialize speechSynthesis after component mounts (client-side only)
    if (typeof window !== 'undefined') {
      speechSynthesis.current = window.speechSynthesis;
    }
  }, []);

  // Initialize speech recognition safely
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      recognition.current = new webkitSpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;

      recognition.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }

    return () => {
      if (recognition.current) {
        recognition.current.stop();
      }
      if (speechSynthesis.current) {
        speechSynthesis.current.cancel();
      }
    };
  }, []);

  const toggleSpeechToText = () => {
    if (isListening) {
      recognition.current.stop();
    } else {
      setInput('');
      recognition.current.start();
    }
    setIsListening(!isListening);
  };

  const speakText = (text) => {
    if (isSpeaking) {
      speechSynthesis.current.cancel();
      setIsSpeaking(false);
      return;
    }

    utterance.current = new SpeechSynthesisUtterance(text);
    utterance.current.onend = () => setIsSpeaking(false);
    speechSynthesis.current.speak(utterance.current);
    setIsSpeaking(true);
  };

  // Basic file reader for fallback when OCR isn't available
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = event => {
        try {
          resolve(event.target.result);
        } catch (e) {
          reject(new Error('Failed to read file contents'));
        }
      };
      
      reader.onerror = () => reject(new Error('Error reading file'));
      
      if (file.type === 'application/pdf') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  // Replace the extract text function with a direct implementation
  const extractTextFromFile = async (fileUrl, fileType) => {
    try {
      console.log(`Starting OCR for ${fileType}...`);
      
      // Set up a progress update mechanism
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 5;
        if (progress > 95) progress = 95;
        setOcrProgress(progress);
      }, 200);
      
      // Directly process the image with Tesseract.js imports
      const Tesseract = await import('tesseract.js');
      
      const result = await Tesseract.recognize(
        fileUrl,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              clearInterval(progressInterval);
              setOcrProgress(Math.round(m.progress * 100));
            }
          }
        }
      );
      
      clearInterval(progressInterval);
      setOcrProgress(100);
      
      if (!result || !result.data || !result.data.text) {
        throw new Error('No text data returned');
      }
      
      return result.data.text || `No text detected in ${fileType.toLowerCase()}`;
    } catch (error) {
      console.error(`OCR error for ${fileType}:`, error);
      return `Failed to extract text from ${fileType.toLowerCase()}. Error: ${error.message}`;
    }
  };

  const clearFileAttachment = () => {
    setFileContent("");
    setFileInfo(null);
  };

  // Function to handle file selection - modify this part
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessingFile(true);
    setFileContent("");
    setFileInfo(null);
    setOcrProgress(0);

    try {
      let extractedText = "";
      const fileType = file.type.split('/')[0];
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (fileType === 'image') {
        try {
          // Always use direct processing for images
          const imageUrl = URL.createObjectURL(file);
          
          if (file.size > 5 * 1024 * 1024) {
            alert('Large image detected. Processing may take longer.');
          }
          
          // Always use direct processing instead of worker
          extractedText = await extractTextFromFile(imageUrl, 'Image');
          
          // Clean up URL
          URL.revokeObjectURL(imageUrl);
          
          if (!extractedText || extractedText.trim() === '') {
            extractedText = "No text detected in image. Please describe the content manually.";
          }
          
          setFileContent(extractedText);
          setFileInfo({
            name: file.name,
            size: (file.size / 1024).toFixed(2),
            type: 'image',
            mimeType: file.type,
            preview: URL.createObjectURL(file)
          });
        } catch (error) {
          console.error('Image processing error:', error);
          setFileContent("Failed to extract text from image. Please describe the content manually.");
          setFileInfo({
            name: file.name,
            size: (file.size / 1024).toFixed(2),
            type: 'image',
            mimeType: file.type,
            error: true
          });
        }
      } else if (fileType === 'application' && (fileExtension === 'pdf' || file.type === 'application/pdf')) {
        // PDF handling remains the same
        extractedText = "PDF content attached. Please note that PDF text extraction is limited.";
        setFileContent(extractedText);
        setFileInfo({
          name: file.name,
          size: (file.size / 1024).toFixed(2),
          type: 'pdf',
          mimeType: file.type
        });
      } else if (fileType === 'text' || fileExtension === 'txt') {
        // Text file handling remains the same
        try {
          extractedText = await readFileAsText(file);
          setFileContent(extractedText);
          setFileInfo({
            name: file.name,
            size: (file.size / 1024).toFixed(2),
            type: 'text',
            mimeType: file.type
          });
        } catch (error) {
          console.error('Text file processing error:', error);
          setFileContent("Failed to read text file.");
          setFileInfo({
            name: file.name,
            size: (file.size / 1024).toFixed(2),
            type: 'text',
            mimeType: file.type,
            error: true
          });
        }
      } else {
        setFileContent("Unsupported file type. Please upload an image, PDF, or text file.");
        alert('Unsupported file type. Please upload an image, PDF, or text file.');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert(`Failed to process the file: ${error.message}`);
      setFileContent(`Error processing file: ${error.message}`);
    } finally {
      setIsProcessingFile(false);
      setOcrProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Modified progress interval logic for both regenerateResponse and handleSendMessage functions
  const regenerateResponse = async () => {
    if (isLoading) return;
    
    // Get the last user message
    const lastUserMessage = messages.findLast(msg => msg.sender === 'user')?.text;
    if (!lastUserMessage) return;
    
    setIsLoading(true);
    setStreamingText("");
    setResponseProgress(0);
    
    // Progressive animation variables
    let progressInterval;
    let artificialProgress = 0;
    
    try {
      // Include LLM model in the API call
      const response = await fetch(`http://127.0.0.1:5000/chat?query=${encodeURIComponent(lastUserMessage)}&conversation_id=${conversationId}&regenerate=true&character=${character}&llm=${llm}`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let completeResponse = "";
      let totalBytes = 0;
      let startTime = Date.now();

      // Create improved artificial progress animation
      progressInterval = setInterval(() => {
        // Calculate a smooth progression curve that slows down as it approaches 95%
        if (totalBytes === 0) {
          // Start with small increments that get smaller over time
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          
          if (elapsedSeconds > 1) {
            // Begin progress after 1 second
            const remainingPercentage = 95 - artificialProgress;
            // Smaller increments as we go higher
            const increment = Math.max(0.2, remainingPercentage / 100);
            
            artificialProgress += increment;
            artificialProgress = Math.min(artificialProgress, 95);
            setResponseProgress(artificialProgress);
          }
        }
      }, 300);

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          clearInterval(progressInterval);
          setResponseProgress(100);
          break;
        }
        
        const chunk = decoder.decode(value);
        completeResponse += chunk;
        totalBytes += chunk.length;
        setStreamingText(completeResponse);
        
        // When real data starts coming in, switch to content-based progress
        if (totalBytes > 0) {
          // Calculate a more realistic progress percentage
          const estimatedTotal = Math.max(5000, completeResponse.length * 1.2);
          const calculatedProgress = Math.min((totalBytes / estimatedTotal) * 100, 95);
          
          // Ensure progress never decreases and always moves forward
          setResponseProgress(prev => Math.max(prev, calculatedProgress));
        }
      }

      // Update the last bot message in the messages array
      setMessages(prev => {
        const newMessages = [...prev];
        const lastBotIndex = newMessages.findLastIndex(msg => msg.sender === 'bot');
        if (lastBotIndex !== -1) {
          newMessages[lastBotIndex] = {
            text: completeResponse,
            sender: 'bot',
            character: character,
            llm: llm
          };
        }
        return newMessages;
      });
      setStreamingText("");
      setLastBotMessage(completeResponse);
    } catch (error) {
      console.error('Error regenerating response:', error);
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
      // Ensure a smooth transition to 0
      setTimeout(() => {
        setResponseProgress(0);
      }, 500);
    }
  };

  const handleSendMessage = async () => {
    const hasFileContent = fileContent && fileContent.trim() !== "";
    const hasTextInput = input.trim() !== "";
    
    if (!hasFileContent && !hasTextInput) return;

    setIsLoading(true);
    setStreamingText("");
    setResponseProgress(0);
    
    // Combine fileContent and text input if both exist
    let finalMessage = "";
    
    if (hasFileContent && hasTextInput) {
      // File with user message
      if (fileInfo) {
        // Format differently based on file type
        if (fileInfo.type === 'image') {
          finalMessage = `${input.trim()}\n\n[Image Content]: ${fileContent}\n(File: ${fileInfo.name})`;
        } else if (fileInfo.type === 'pdf') {
          finalMessage = `${input.trim()}\n\n[PDF Content]: ${fileContent}\n(File: ${fileInfo.name})`;
        } else if (fileInfo.type === 'text') {
          finalMessage = `${input.trim()}\n\n[Text File]: ${fileContent}\n(File: ${fileInfo.name})`;
        }
      }
    } else if (hasFileContent) {
      // Only file, no text input
      if (fileInfo) {
        if (fileInfo.type === 'image') {
          finalMessage = `[Image Content]: ${fileContent}\n(File: ${fileInfo.name})`;
        } else if (fileInfo.type === 'pdf') {
          finalMessage = `[PDF Content]: ${fileContent}\n(File: ${fileInfo.name})`;
        } else if (fileInfo.type === 'text') {
          finalMessage = `[Text File]: ${fileContent}\n(File: ${fileInfo.name})`;
        }
      } else {
        finalMessage = fileContent;
      }
    } else {
      // Only text input, no file
      finalMessage = input.trim();
    }
    
    // Add file information to message (if any)
    const userMessageObj = {
      text: finalMessage,
      sender: 'user'
    };
    
    // Add file metadata to message object
    if (fileInfo) {
      userMessageObj.file = {
        ...fileInfo,
        content: fileContent
      };
    }
    
    // Reset input fields
    setInput("");
    setFileContent("");
    setFileInfo(null);

    // Add user message to chat
    setMessages(prev => [...prev, userMessageObj]);

    // Generate new conversation ID if this is the first message
    if (!conversationId) {
      const newConversationId = uuidv4();
      setConversationId(newConversationId);
      localStorage.setItem('conversationId', newConversationId);
    }

    // Progressive animation variables
    let progressInterval;
    let artificialProgress = 0;
    
    try {
      // Include LLM model in the API call
      const response = await fetch(`http://127.0.0.1:5000/chat?query=${encodeURIComponent(finalMessage)}&conversation_id=${conversationId}&character=${character}&llm=${llm}`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let completeResponse = "";
      let totalBytes = 0;
      let startTime = Date.now();
      
      // Create improved artificial progress animation
      progressInterval = setInterval(() => {
        // Calculate a smooth progression curve that slows down as it approaches 95%
        if (totalBytes === 0) {
          // Start with small increments that get smaller over time
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          
          if (elapsedSeconds > 1) {
            // Begin progress after 1 second
            const remainingPercentage = 95 - artificialProgress;
            // Smaller increments as we go higher
            const increment = Math.max(0.2, remainingPercentage / 100);
            
            artificialProgress += increment;
            artificialProgress = Math.min(artificialProgress, 95);
            setResponseProgress(artificialProgress);
          }
        }
      }, 300);

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          clearInterval(progressInterval);
          setResponseProgress(100);
          break;
        }
        
        const chunk = decoder.decode(value);
        completeResponse += chunk;
        totalBytes += chunk.length;
        setStreamingText(completeResponse);
        
        // When real data starts coming in, switch to content-based progress
        if (totalBytes > 0) {
          // Calculate a more realistic progress percentage
          const estimatedTotal = Math.max(5000, completeResponse.length * 1.2);
          const calculatedProgress = Math.min((totalBytes / estimatedTotal) * 100, 95);
          
          // Ensure progress never decreases and always moves forward
          setResponseProgress(prev => Math.max(prev, calculatedProgress));
        }
      }

      // Add the complete message to messages array and clear streaming text
      setMessages(prev => [...prev, { 
        text: completeResponse, 
        sender: 'bot',
        character: character,
        llm: llm
      }]);
      setStreamingText("");
      setLastBotMessage(completeResponse);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { text: 'Sorry, there was an error processing your message.', sender: 'bot' }]);
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
      // Ensure a smooth transition to 0
      setTimeout(() => {
        setResponseProgress(0);
      }, 500);
    }

    if (!isChatStarted) setIsChatStarted(true);
  };

  const clearChat = () => {
    setMessages([]);
    setConversationId(null);
    localStorage.removeItem('chatHistory');
    localStorage.removeItem('conversationId');
    setIsChatStarted(false);
  };

  const getFileButtonTitle = () => {
    if (isOcrLoading) return "OCR engine is loading...";
    if (!isOcrReady) return "Upload file (simplified mode)";
    if (isProcessingFile) return `Processing (${ocrProgress}%)`;
    return "Upload file";
  };

  // Force retry Tesseract initialization
  const retryOcrInitialization = () => {
    if (isOcrLoading) return;
    
    // Reset OCR state
    setIsOcrReady(false);
    setIsOcrLoading(true);
    
    // Increment retry count to trigger useEffect
    setRetryCount(prevCount => prevCount + 1);
    
    alert("Attempting to reinitialize OCR engine. Please wait...");
  };

  // Render file message based on file type
  const renderFileMessage = (message) => {
    if (!message.file) return null;
    
    const file = message.file;
    const fileTypeDisplay = {
      'image': 'Image',
      'pdf': 'PDF Document',
      'text': 'Text File'
    }[file.type] || 'File';
    
    return (
      <div className="flex flex-col mt-2 pt-2 border-t border-white/20">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center">
            {file.type === 'image' && <span>📷</span>}
            {file.type === 'pdf' && <span>📄</span>}
            {file.type === 'text' && <span>📝</span>}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-medium truncate">{file.name}</p>
            <p className="text-xs opacity-70">{fileTypeDisplay} • {file.size} KB</p>
          </div>
        </div>
        {file.preview && (
          <div className="mt-1 rounded overflow-hidden max-h-32 w-auto">
            <img 
              src={file.preview} 
              alt={file.name} 
              className="object-contain max-h-32 w-auto"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
    );
  };

  // Function to change character
  const changeCharacter = (newCharacter) => {
    setCharacter(newCharacter);
    localStorage.setItem('aiCharacter', newCharacter);
    setIsCharacterMenuOpen(false);
  };

  // Get current character details
  const getCurrentCharacter = () => {
    return characters.find(c => c.id === character) || characters[0];
  };

  // Function to change LLM model
  const changeLlm = (newLlm) => {
    setLlm(newLlm);
    localStorage.setItem('aiLlm', newLlm);
    setIsLlmMenuOpen(false);
  };

  // Get current LLM model details
  const getCurrentLlm = () => {
    return llmModels.find(m => m.id === llm) || llmModels[0];
  };

  // Make sure to apply the styles in useEffect
  useEffect(() => {
    // Add the styles to the document
    const styleElement = document.createElement('style');
    styleElement.innerHTML = typingIndicatorStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-gradient-to-br from-gray-900 to-black">
      <div className="w-full max-w-4xl mx-auto p-4 flex flex-col h-full p-[51px]">
        <div className="bg-[#ffae5c]/5 backdrop-blur-sm rounded-2xl shadow-xl flex flex-col flex-1 overflow-hidden mt-10 border border-[#ffae5c]/20">
          {/* Header with Character Selector and LLM Model Selector */}
          <div className="z-55 flex justify-between items-center p-4 border-b border-[#ffae5c]/20 bg-black/30 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ffae5c] to-[#4834D4] flex items-center justify-center shadow-lg">
                <BsChatDots className="text-xl text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Web3 Assistant</h1>
                <p className="text-xs text-white/50">Your blockchain knowledge companion</p>
              </div>
            </div>
            
            <div className="flex gap-2 items-center">
              {/* LLM Model Selector Dropdown */}
              <div className="relative" ref={llmMenuRef}>
                <button 
                  onClick={() => setIsLlmMenuOpen(!isLlmMenuOpen)}
                  className="px-3 py-1.5 bg-black/30 border border-[#ffae5c]/20 rounded-lg flex items-center gap-2 hover:bg-[#ffae5c]/10 transition-colors"
                >
                  <span className="text-sm font-medium text-white">Model: {getCurrentLlm().name}</span>
                  <svg className="w-4 h-4 text-[#ffae5c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isLlmMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-black/80 rounded-lg shadow-lg border border-[#ffae5c]/20 py-2 z-10 animate-fade-in backdrop-blur-sm">
                    <div className="px-3 py-2 border-b border-[#ffae5c]/10">
                      <p className="text-xs font-medium text-[#ffae5c]/70">SELECT MODEL</p>
                    </div>
                    
                    {llmModels.map(model => (
                      <button
                        key={model.id}
                        onClick={() => changeLlm(model.id)}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-[#ffae5c]/10 transition-colors ${
                          llm === model.id ? 'bg-[#ffae5c]/20' : ''
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{model.name}</p>
                          <p className="text-xs text-white/50">{model.description}</p>
                        </div>
                        {llm === model.id && (
                          <div className="ml-auto">
                            <div className="h-2 w-2 rounded-full bg-[#ffae5c]"></div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Character Selector Dropdown */}
              <div className="relative" ref={characterMenuRef}>
                <button 
                  onClick={() => setIsCharacterMenuOpen(!isCharacterMenuOpen)}
                  className="px-3 py-1.5 bg-black/30 border border-[#ffae5c]/20 rounded-lg flex items-center gap-2 hover:bg-[#ffae5c]/10 transition-colors"
                >
                  <span className="text-lg">{getCurrentCharacter().emoji}</span>
                  <span className="text-sm font-medium text-white">{getCurrentCharacter().name}</span>
                  <svg className="w-4 h-4 text-[#ffae5c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isCharacterMenuOpen && (
                  <div className="!z-55 absolute right-0 mt-2 w-64 bg-black/80 rounded-lg shadow-lg border border-[#ffae5c]/20 py-2 z-10 animate-fade-in max-h-96 overflow-y-auto backdrop-blur-sm">
                    <div className="px-3 py-2 border-b border-[#ffae5c]/10">
                      <p className="text-xs font-medium text-[#ffae5c]/70">SELECT WEB3 EXPERT</p>
                    </div>
                    
                    {characters.map(char => (
                      <button
                        key={char.id}
                        onClick={() => changeCharacter(char.id)}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-[#ffae5c]/10 transition-colors ${
                          character === char.id ? 'bg-[#ffae5c]/20' : ''
                        }`}
                      >
                        <span className="text-xl">{char.emoji}</span>
                        <div>
                          <p className="text-sm font-medium text-white">{char.name}</p>
                          <p className="text-xs text-white/50">{char.description}</p>
                        </div>
                        {character === char.id && (
                          <div className="ml-auto">
                            <div className="h-2 w-2 rounded-full bg-[#ffae5c]"></div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {!isOcrReady && !isOcrLoading && (
                <button
                  onClick={retryOcrInitialization}
                  className="text-sm text-[#ffae5c] hover:text-[#ffae5c]/80 transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-[#ffae5c]/10"
                >
                  <BsArrowRepeat className="text-sm" />
                  <span>Retry OCR</span>
                </button>
              )}
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-red-500/10"
                >
                  <BsTrash className="text-sm" />
                  <span>Clear Chat</span>
                </button>
              )}
            </div>
          </div>

          {/* Chat Messages - Display character emoji with bot messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-black/50 to-black/30">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-white/50">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#ffae5c]/20 to-[#4834D4]/20 flex items-center justify-center mb-6 shadow-lg">
                  <span className="text-4xl">{getCurrentCharacter().emoji}</span>
                </div>
                <p className="text-xl font-medium text-white mb-2">I'm your {getCurrentCharacter().name}!</p>
                <p className="text-sm text-white/60 max-w-md text-center">
                  {getCurrentCharacter().description}. Ask me anything about blockchain, crypto, and web3 technologies.
                </p>
              </div>
            )}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-2xl ${
                    msg.sender === 'user' 
                      ? 'bg-gradient-to-br from-[#ffae5c] to-[#4834D4] text-white rounded-br-none' 
                      : 'bg-[#ffae5c]/5 text-white/90 rounded-bl-none shadow-md border border-[#ffae5c]/20 backdrop-blur-sm'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <>
                      <p className="leading-relaxed">{msg.text}</p>
                      {msg.file && renderFileMessage(msg)}
                    </>
                  ) : (
                    <>
                      {/* Show character and always show LLM indicator for bot messages */}
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#ffae5c]/10">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {characters.find(c => c.id === msg.character)?.emoji || '🤖'}
                          </span>
                          <span className="text-xs text-white/60 font-medium">
                            {characters.find(c => c.id === msg.character)?.name || 'Assistant'}
                          </span>
                        </div>
                        {/* Always show model badge with appropriate styling */}
                        <span className={`text-xs ${
                          msg.llm === '0g' 
                            ? 'bg-[#4834D4]/20 text-[#4834D4]/90' 
                            : 'bg-[#ffae5c]/20 text-[#ffae5c]/90'
                          } px-2 py-0.5 rounded-full font-medium`}
                        >
                          {msg.llm === '0g' ? '0G Model' : 'Nilai Model'}
                        </span>
                      </div>
                      <div 
                        className="" 
                        dangerouslySetInnerHTML={{ __html: msg.text }}
                      />
                    </>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs ${msg.sender === 'user' ? 'opacity-70' : 'text-white/50'}`}>
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.sender === 'bot' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => speakText(msg.text)}
                          className="p-1 hover:bg-[#ffae5c]/10 rounded-full transition-colors"
                        >
                          {isSpeaking ? 
                            <HiSpeakerXMark className="text-white/70 w-4 h-4" /> :
                            <HiSpeakerWave className="text-white/70 w-4 h-4" />
                          }
                        </button>
                        {index === messages.length - 1 && msg.sender === 'bot' && (
                          <button
                            onClick={regenerateResponse}
                            disabled={isLoading}
                            className="p-1 hover:bg-[#ffae5c]/10 rounded-full transition-colors"
                          >
                            <BsArrowRepeat className={`w-4 h-4 text-white/70 ${isLoading ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {streamingText && (
              <div className="flex justify-start animate-fade-in">
                <div className="max-w-[80%] p-4 rounded-2xl bg-[#ffae5c]/5 text-white/90 rounded-bl-none shadow-md border border-[#ffae5c]/20 backdrop-blur-sm">
                  {/* Character and model indicator for streaming message */}
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#ffae5c]/10">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getCurrentCharacter().emoji}</span>
                      <span className="text-xs text-white/60 font-medium">{getCurrentCharacter().name}</span>
                    </div>
                    {/* Always show model badge with appropriate styling */}
                    <span className={`text-xs ${
                      llm === '0g' 
                        ? 'bg-[#4834D4]/20 text-[#4834D4]/90' 
                        : 'bg-[#ffae5c]/20 text-[#ffae5c]/90'
                      } px-2 py-0.5 rounded-full font-medium`}
                    >
                      {llm === '0g' ? '0G Model' : 'Nilai Model'}
                    </span>
                  </div>
                  <div 
                    className="whitespace-pre-wrap leading-relaxed" 
                    dangerouslySetInnerHTML={{ __html: streamingText }}
                  />
                  <div className="flex items-center mt-3">
                    {/* Enhanced typing indicator with progress */}
                    <div className="typing-indicator">
                      <span className="dot bg-[#ffae5c]"></span>
                      <span className="dot bg-[#ffae5c]"></span>
                      <span className="dot bg-[#ffae5c]"></span>
                    </div>
                    <span className="text-xs text-white/60 ml-2">
                      {responseProgress > 5 
                        ? `Generating response (${Math.round(responseProgress)}%)...` 
                        : <span className="thinking-text">Thinking</span>}
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full h-1 bg-[#ffae5c]/10 rounded-full mt-2 overflow-hidden">
                    {responseProgress <= 5 ? (
                      <div className="indeterminate-progress-bar"></div>
                    ) : (
                      <div 
                        className="h-full bg-gradient-to-r from-[#ffae5c] to-[#4834D4] transition-all duration-300 ease-out" 
                        style={{ width: `${responseProgress}%` }}
                      ></div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-black/60 backdrop-blur-sm border-t border-[#ffae5c]/20">
            {/* File Preview (WhatsApp-style) */}
            {fileInfo && (
              <div className="mb-3 p-3 bg-[#ffae5c]/5 rounded-xl border border-[#ffae5c]/20 relative animate-slide-up">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#ffae5c]/10 rounded-lg flex items-center justify-center text-[#ffae5c] flex-shrink-0">
                    {fileInfo.type === 'image' && <span className="text-xl">📷</span>}
                    {fileInfo.type === 'pdf' && <span className="text-xl">📄</span>}
                    {fileInfo.type === 'text' && <span className="text-xl">📝</span>}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="font-medium text-white truncate">{fileInfo.name}</div>
                    <div className="text-xs text-white/60">
                      {fileInfo.type === 'image' ? 'Image' : fileInfo.type === 'pdf' ? 'PDF Document' : 'Text File'} • {fileInfo.size} KB
                      {fileInfo.error && <span className="ml-2 text-yellow-500">⚠️ Processing had issues</span>}
                    </div>
                    <div className="text-xs text-white/70 mt-1 line-clamp-1">
                      {fileContent ? 
                        (fileContent.length > 60 ? fileContent.substring(0, 60) + '...' : fileContent) 
                        : 'No text extracted'}
                    </div>
                  </div>
                  <button 
                    onClick={clearFileAttachment}
                    className="absolute top-2 right-2 h-5 w-5 rounded-full bg-[#ffae5c]/20 flex items-center justify-center text-white hover:bg-[#ffae5c]/30"
                  >
                    <BsX className="text-sm" />
                  </button>
                </div>
                {fileInfo.type === 'image' && fileInfo.preview && (
                  <div className="mt-2 max-h-40 overflow-hidden">
                    <img 
                      src={fileInfo.preview} 
                      alt={fileInfo.name} 
                      className="rounded-lg object-contain max-h-40 max-w-full mx-auto"
                    />
                  </div>
                )}
              </div>
            )}
          
            <div className="flex w-full gap-3">
              <button
                onClick={toggleSpeechToText}
                className={`p-4 rounded-xl transition-all duration-200 ${
                  isListening
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-[#ffae5c]/5 hover:bg-[#ffae5c]/10 text-white/80 border border-[#ffae5c]/20"
                }`}
              >
                {isListening ? <MdOutlineStop className="text-xl" /> : <MdOutlineMic className="text-xl" />}
              </button>
              
              {/* File Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingFile}
                className={`p-4 rounded-xl transition-all duration-200 relative ${
                  isProcessingFile
                    ? "bg-gray-800 cursor-not-allowed text-gray-500 border border-gray-700"
                    : "bg-[#ffae5c]/5 hover:bg-[#ffae5c]/10 text-white/80 border border-[#ffae5c]/20"
                }`}
                title={getFileButtonTitle()}
              >
                <BsPaperclip className="text-xl" />
                {isOcrLoading && <span className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-500 rounded-full animate-pulse"></span>}
                {!isOcrReady && !isOcrLoading && <span className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full"></span>}
                {isProcessingFile && (
                  <div className="absolute -bottom-1 left-0 w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#ffae5c] to-[#4834D4] transition-all duration-300" 
                      style={{ width: `${ocrProgress}%` }}
                    ></div>
                  </div>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept="application/pdf,image/*,text/plain"
                className="hidden"
                disabled={isProcessingFile}
              />
              
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                className="flex-1 p-4 border border-[#ffae5c]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ffae5c] focus:ring-offset-2 focus:ring-offset-black placeholder:text-white/40 bg-[#ffae5c]/5 backdrop-blur-sm text-white"
                placeholder={
                  isListening ? "Listening..." : 
                  isProcessingFile ? `Processing file (${ocrProgress}%)...` : 
                  isLoading ? "Waiting for response..." :
                  isOcrLoading ? "OCR engine is loading..." :
                  fileInfo ? "Add a message or send now..." :
                  !isOcrReady ? "OCR unavailable (simplified mode)" :
                  "Type your message..."
                }
                disabled={isLoading || isProcessingFile}
              />
              <button
                onClick={handleSendMessage}
                disabled={(!input.trim() && !fileInfo) || isLoading || isProcessingFile}
                className={`p-4 rounded-xl text-white transition-all duration-200 ${
                  (input.trim() || fileInfo) && !isLoading && !isProcessingFile
                    ? "bg-gradient-to-br from-[#ffae5c] to-[#4834D4] hover:opacity-90 active:opacity-80 shadow-lg hover:shadow-xl"
                    : "bg-gray-800 cursor-not-allowed border border-gray-700"
                }`}
              >
                {isLoading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <BsSendFill className="text-xl" />
                )}
              </button>
            </div>
            
            {/* Show loading bar at bottom when processing */}
            {isLoading && (
              <div className="mt-2 w-full">
                <div className="text-xs text-center text-white/60 mb-1">
                  {responseProgress > 5 
                    ? `Generating response (${Math.round(responseProgress)}%)...` 
                    : <span className="thinking-text shimmer-effect">Preparing your response</span>}
                </div>
                <div className="w-full h-1.5 bg-[#ffae5c]/10 rounded-full overflow-hidden">
                  {responseProgress <= 5 ? (
                    <div className="indeterminate-progress-bar"></div>
                  ) : (
                    <div 
                      className="h-full bg-gradient-to-r from-[#ffae5c] via-[#bf8247] to-[#4834D4] transition-all duration-300 ease-out" 
                      style={{ width: `${responseProgress}%` }}
                    ></div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
