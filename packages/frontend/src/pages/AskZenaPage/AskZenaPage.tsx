import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../utils/apiClient';
import { VoiceRecorder } from '../../components/VoiceRecorder/VoiceRecorder';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import { ZenaAvatarFullScreen } from '../../components/ZenaAvatar';
import { ZenaAvatarState } from '../../components/ZenaAvatar/ZenaAvatar';
import './AskZenaPage.css';
import './AskZenaPage.hightech.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SuggestedQuestion {
  text: string;
  category: string;
}

const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { text: "What deals need my attention today?", category: "deals" },
  { text: "Show me all properties with viewings this week", category: "properties" },
  { text: "Who are my active buyers?", category: "contacts" },
  { text: "What's the status of 123 Main Street?", category: "properties" },
  { text: "Which deals are at risk?", category: "deals" },
];

export const AskZenaPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Determine Zena avatar state based on current activity
  const getZenaState = (): ZenaAvatarState => {
    if (showVoiceRecorder) return 'listening';
    if (isLoading && !streamingContent) return 'processing';
    if (streamingContent) return 'speaking';
    return 'idle';
  };

  // Get greeting based on time of day
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get status message based on state
  const getStatusMessage = (): string => {
    const state = getZenaState();
    switch (state) {
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Thinking...';
      case 'speaking':
        return 'Responding...';
      default:
        return 'How can I help you today?';
    }
  };
  
  // Voice interaction hook
  const voiceInteraction = useVoiceInteraction({
    onTranscriptionComplete: (transcript) => {
      // Auto-fill the input with transcription
      setInputValue(transcript);
      setShowVoiceRecorder(false);
      setAudioLevel(0);
    },
    onError: (err) => {
      setError(err.message);
      setShowVoiceRecorder(false);
      setAudioLevel(0);
    },
    onAudioLevelChange: (level) => {
      setAudioLevel(level);
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Load conversation history on mount
  useEffect(() => {
    loadHistory();
    
    // Cleanup WebSocket on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const loadHistory = async () => {
    try {
      const response = await api.get<{ history: Message[] }>('/api/ask/history');
      const history = response.data?.history;
      // Ensure we always set an array, even if the response is malformed
      setMessages(Array.isArray(history) ? history : []);
    } catch (err) {
      console.error('Failed to load conversation history:', err);
      // Don't show error for history load failure - initialize with empty array
      setMessages([]);
    }
  };

  const connectWebSocket = () => {
    // Connect to WebSocket for streaming responses
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'ask.response') {
        setStreamingContent(prev => prev + data.content);
      } else if (data.type === 'ask.complete') {
        // Finalize the streaming message
        const assistantMessage: Message = {
          id: data.messageId || Date.now().toString(),
          role: 'assistant',
          content: streamingContent,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setStreamingContent('');
        setIsLoading(false);
      }
    };
    
    ws.onerror = () => {
      console.error('WebSocket error');
      // Fall back to regular HTTP if WebSocket fails
      wsRef.current = null;
    };
    
    wsRef.current = ws;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);
    
    try {
      // Try WebSocket streaming first
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connectWebSocket();
      }
      
      // Send query via HTTP
      const response = await api.post<{ response: string; messageId: string }>('/api/ask', {
        query: userMessage.content,
      });
      
      // If WebSocket isn't working, use HTTP response
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        const assistantMessage: Message = {
          id: response.data.messageId || Date.now().toString(),
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
      setIsLoading(false);
      console.error('Failed to send query:', err);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
    textareaRef.current?.focus();
  };

  const handleVoiceInput = () => {
    setShowVoiceRecorder(!showVoiceRecorder);
  };
  
  const handleVoiceRecordingComplete = async (audioBlob: Blob) => {
    // Send voice query to Ask Zena
    const response = await voiceInteraction.sendVoiceQuery(audioBlob);
    
    if (response) {
      // Add assistant response to messages
      const assistantMessage: Message = {
        id: response.messageId || Date.now().toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setShowVoiceRecorder(false);
    }
  };

  const formatMessageContent = (content: string) => {
    // Safety check for undefined or null content
    if (!content || typeof content !== 'string') {
      return <p>No content available</p>;
    }
    
    // Split content into paragraphs and bullet points
    const lines = content.split('\n');
    
    return lines.map((line, idx) => {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        return <br key={idx} />;
      }
      
      // Check if it's a bullet point
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
        return (
          <li key={idx} className="ask-zena-page__message-bullet">
            {trimmedLine.substring(1).trim()}
          </li>
        );
      }
      
      // Check if it's a numbered list
      if (/^\d+\./.test(trimmedLine)) {
        return (
          <li key={idx} className="ask-zena-page__message-bullet">
            {trimmedLine.replace(/^\d+\.\s*/, '')}
          </li>
        );
      }
      
      // Regular paragraph
      return (
        <p key={idx} className="ask-zena-page__message-paragraph">
          {trimmedLine}
        </p>
      );
    });
  };

  return (
    <div className="ask-zena-page">
      <div className="ask-zena-page__container">
        <div className="ask-zena-page__header">
          <h1 className="ask-zena-page__title">Ask Zena</h1>
          <p className="ask-zena-page__description">
            Ask questions about your deals, contacts, and properties
          </p>
        </div>

        {/* Conversation History */}
        <div className="ask-zena-page__conversation">
          {Array.isArray(messages) && messages.length === 0 && !streamingContent && (
            <div className="ask-zena-page__welcome">
              {/* Full-screen Zena Avatar with waveform visualization */}
              <ZenaAvatarFullScreen
                state={getZenaState()}
                audioLevel={audioLevel}
                showWaveform={showVoiceRecorder}
                greeting={getGreeting()}
                statusMessage={getStatusMessage()}
                onClick={handleVoiceInput}
                testId="ask-zena-avatar"
              />
              
              <div className="ask-zena-page__suggestions">
                <p className="ask-zena-page__suggestions-label">Try asking:</p>
                {SUGGESTED_QUESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestedQuestion(suggestion.text)}
                    className="ask-zena-page__suggestion-btn"
                  >
                    {suggestion.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(messages) && messages.length > 0 && messages.filter(message => message && message.id && message.role).map((message) => (
            <div
              key={message.id}
              className={`ask-zena-page__message ask-zena-page__message--${message.role}`}
            >
              <div className="ask-zena-page__message-avatar">
                {message.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="ask-zena-page__message-content">
                <div className="ask-zena-page__message-header">
                  <span className="ask-zena-page__message-role">
                    {message.role === 'user' ? 'You' : 'Zena'}
                  </span>
                  <span className="ask-zena-page__message-time">
                    {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    }) : 'Now'}
                  </span>
                </div>
                <div className="ask-zena-page__message-text">
                  {formatMessageContent(message.content || '')}
                </div>
              </div>
            </div>
          ))}

          {/* Streaming response */}
          {streamingContent && (
            <div className="ask-zena-page__message ask-zena-page__message--assistant">
              <div className="ask-zena-page__message-avatar">🤖</div>
              <div className="ask-zena-page__message-content">
                <div className="ask-zena-page__message-header">
                  <span className="ask-zena-page__message-role">Zena</span>
                </div>
                <div className="ask-zena-page__message-text">
                  {formatMessageContent(streamingContent || '')}
                  <span className="ask-zena-page__typing-indicator">▋</span>
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && !streamingContent && (
            <div className="ask-zena-page__message ask-zena-page__message--assistant">
              <div className="ask-zena-page__message-avatar">🤖</div>
              <div className="ask-zena-page__message-content">
                <div className="ask-zena-page__message-header">
                  <span className="ask-zena-page__message-role">Zena</span>
                </div>
                <div className="ask-zena-page__typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="ask-zena-page__error">
              <span className="ask-zena-page__error-icon">⚠️</span>
              <span className="ask-zena-page__error-text">{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="ask-zena-page__input-container">
          <form onSubmit={handleSubmit} className="ask-zena-page__form">
            <div className="ask-zena-page__input-wrapper">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask me anything about your deals, contacts, or properties..."
                className="ask-zena-page__textarea"
                rows={1}
                disabled={isLoading}
              />
              
              <div className="ask-zena-page__input-actions">
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  className={`ask-zena-page__voice-btn ${showVoiceRecorder ? 'ask-zena-page__voice-btn--active' : ''}`}
                  title="Voice input"
                  disabled={isLoading}
                >
                  {showVoiceRecorder ? '✕' : '🎤'}
                </button>
                
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="ask-zena-page__send-btn"
                  title="Send message"
                >
                  ➤
                </button>
              </div>
            </div>
          </form>
          
          <p className="ask-zena-page__hint">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
        
        {/* Voice Recorder */}
        {showVoiceRecorder && (
          <div className="ask-zena-page__voice-recorder-container">
            <VoiceRecorder
              onRecordingComplete={handleVoiceRecordingComplete}
              showTranscription={false}
              showEntities={false}
              showWaveform={true}
              disabled={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
};
