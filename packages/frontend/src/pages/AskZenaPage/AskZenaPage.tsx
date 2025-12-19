import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../utils/apiClient';
import { VoiceRecorder } from '../../components/VoiceRecorder/VoiceRecorder';
import { ZenaHighTechAvatar } from '../../components/ZenaHighTechAvatar/ZenaHighTechAvatar';
import { DissolvePhase } from '../../components/DissolveParticleSystem/DissolveParticleSystem';
import {
  ChatSidebar,
  MessageBubble,
  AttachmentManager,
  Message,
  Conversation,
  Attachment
} from '../../components/AskZena';
import { voiceInteractionService } from '../../services/voice-interaction.service';
import { AmbientBackground } from '../../components/AmbientBackground/AmbientBackground';
import './AskZenaPage.css';
import './TapToTalkButton.css';

export const AskZenaPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [avatarMode, setAvatarMode] = useState<'hero' | 'assistant'>('hero');
  const [dissolvePhase, setDissolvePhase] = useState<DissolvePhase>('idle');
  const hasAutoSubmitted = useRef(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Find the last assistant message ID to place the avatar above it
  const lastAssistantMessageId = [...messages]
    .reverse()
    .find(m => m.role === 'assistant')?.id;

  // Get voice state for high-tech avatar
  const getVoiceState = () => {
    if (showVoiceRecorder) return 'listening' as const;
    if (isLoading) return 'processing' as const;
    return 'idle' as const;
  };

  // Handle dissolve phase transitions
  const handleDissolvePhaseComplete = useCallback((completedPhase: DissolvePhase) => {
    if (completedPhase === 'dissolving') {
      setDissolvePhase('vortex');
    } else if (completedPhase === 'reforming') {
      setDissolvePhase('idle');
    }
  }, []);

  // Helper to safely trigger the reforming phase
  const triggerReform = useCallback(() => {
    console.log('[AskZena] Triggering Reform phase...');
    setDissolvePhase(prev => {
      if (prev === 'speaking' || prev === 'vortex' || prev === 'dissolving') {
        return 'reforming';
      }
      return prev;
    });
  }, []);

  // Simulate streaming response word by word
  const simulateStreamingResponse = useCallback(async (text: string) => {
    setStreamingContent('');
    const words = text.split(' ');
    let currentText = '';

    // Set dissolve phase to speaking when streaming starts
    console.log('[AskZena] Starting text streaming...');
    setDissolvePhase('speaking');

    for (let i = 0; i < words.length; i++) {
      currentText += (i === 0 ? '' : ' ') + words[i];
      setStreamingContent(currentText);
      // Faster typing speed for better UX
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 30));
    }

    console.log('[AskZena] Text streaming finished.');
    // Delay slightly to hold the speaking state a moment longer
    setTimeout(() => {
      triggerReform();
    }, 1500);
  }, [triggerReform]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Load conversations and check for auto-prompt on mount
  useEffect(() => {
    loadConversations();

    const prompt = searchParams.get('prompt');
    const mode = searchParams.get('mode');

    if (mode === 'handsfree') {
      setIsConversationMode(true);
      setShowVoiceRecorder(true);
    }

    if (prompt && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      // Small delay to ensure everything is mounted
      setTimeout(() => {
        submitQuery(prompt);
        // Clear the params so they don't re-trigger on refresh
        setSearchParams({}, { replace: true });
      }, 500);
    }

    return () => {
      stopSpeaking();
    };
  }, []);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  const loadConversations = async () => {
    try {
      const response = await api.get<{ conversations: Conversation[] }>('/api/history');
      setConversations(response.data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadMessages = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await api.get<{ conversation: { messages: Message[] } }>(`/api/history/${id}`);
      setMessages(response.data.conversation.messages || []);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(undefined);
    setMessages([]);
    setInputValue('');
    setAttachments([]);
    setError(null);
    stopSpeaking();
    setAvatarMode('hero');
    setDissolvePhase('idle');
    setStreamingContent('');
  };

  const handleConversationSelect = (id: string) => {
    setActiveConversationId(id);
    setAvatarMode('assistant');
    setError(null);
    stopSpeaking();
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await api.delete(`/api/history/${id}`);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleAddAttachments = (files: FileList) => {
    const newAttachments: Attachment[] = [];
    Array.from(files).forEach(file => {
      const type = file.type.startsWith('image/') ? 'image' as const : 'file' as const;
      const att: Attachment = { file, type };
      if (type === 'image') {
        att.previewUrl = URL.createObjectURL(file);
      }
      newAttachments.push(att);
    });
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => {
      const updated = [...prev];
      if (updated[index].previewUrl) {
        URL.revokeObjectURL(updated[index].previewUrl!);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  const stopSpeaking = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    setIsSpeaking(false);
    setAudioLevel(0);
  };

  const playTTS = async (text: string) => {
    try {
      stopSpeaking();
      setIsSpeaking(true);

      const audioData = await voiceInteractionService.speak(text);

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;

      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(audioContextRef.current.destination);

      source.onended = () => {
        setIsSpeaking(false);
        setAudioLevel(0);

        // Safe trigger for reforming phase when speaking ends
        triggerReform();

        // Auto-trigger listening if in conversation mode
        if (isConversationMode) {
          setShowVoiceRecorder(true);
        }
      };

      audioSourceRef.current = source;
      source.start(0);

      // Visualize audio levels
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!isSpeaking) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 255);
        requestAnimationFrame(updateLevel);
      };
      updateLevel();

    } catch (err) {
      console.error('Failed to play TTS:', err);
      setIsSpeaking(false);
    }
  };

  const handleVoiceRecordingComplete = async (audioBlob: Blob) => {
    setIsLoading(true);
    setShowVoiceRecorder(false);
    try {
      const transcript = await voiceInteractionService.transcribe(audioBlob);
      setInputValue(transcript);

      // Submit the query
      if (transcript.length > 2) {
        await submitQuery(transcript);
      } else {
        setIsLoading(false);
        // If it was too short and we're in conversation mode, maybe listen again or just wait
        if (isConversationMode) {
          setTimeout(() => setShowVoiceRecorder(true), 1000);
        }
      }
    } catch (err) {
      console.error('Transcription failed:', err);
      setIsLoading(false);
      setError('Failed to transcribe audio.');
      if (isConversationMode) setIsConversationMode(false);
    }
  };

  const submitQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    let convId = activeConversationId;

    if (!convId) {
      try {
        const title = queryText.trim().substring(0, 30);
        const res = await api.post<{ conversation: Conversation }>('/api/history', { title });
        convId = res.data.conversation.id;
        setActiveConversationId(convId);
        setConversations(prev => [res.data.conversation, ...prev]);
      } catch (err) {
        console.error('Failed to create conversation:', err);
        return;
      }
    }

    const userAttachments = attachments.map(a => ({
      type: a.type,
      name: a.file.name,
      url: a.previewUrl
    }));

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: queryText.trim(),
      attachments: userAttachments,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setAttachments([]);
    setIsLoading(true);
    setError(null);

    // Start dissolve effect - will enter 'vortex' thinking state
    setDissolvePhase('dissolving');

    console.log('[AskZena] State updated, starting API call...');
    try {
      const attachmentData = await Promise.all(attachments.map(async a => {
        if (a.type === 'image') {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve({ type: 'image', base64, mimeType: a.file.type });
            };
            reader.readAsDataURL(a.file);
          });
        }
        return { type: 'file', name: a.file.name };
      }));

      const response = await api.post<{ response: string; messageId: string }>('/api/ask', {
        query: queryText,
        conversationId: convId,
        attachments: attachmentData,
        conversationHistory: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      });

      const assistantMessage: Message = {
        id: response.data.messageId || (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
      };

      setIsLoading(false);

      // Transition to Assistant mode ONLY when the response arrives
      // This ensures we stayed in Hero mode (large avatar) during thinking.
      console.log('[AskZena] Transitioning to Assistant mode layout...');
      setAvatarMode('assistant');

      // Ensure we are in speaking phase for the dissolve system
      console.log('[AskZena] Setting dissolvePhase to speaking...');
      setDissolvePhase('speaking');

      // Play TTS for assistant response
      playTTS(response.data.response);

      // Simulate real-time word-by-word streaming in the chat bubble
      await simulateStreamingResponse(response.data.response);

      // After streaming is done, add the final message to the list
      setMessages(prev => [...prev, assistantMessage]);
      setStreamingContent('');

      console.log('[AskZena] Response flow complete.');
      loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
      setIsLoading(false);
      // Reset dissolve phase on error
      setDissolvePhase('idle');
    }
  };

  const handleSubmit = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    console.log('[AskZena] Submitting query:', inputValue);
    submitQuery(inputValue);
  };

  return (
    <div className="ask-zena-page" data-theme="high-tech">
      <AmbientBackground
        variant="default"
        showParticles={true}
        showGradientOrbs={true}
        showGrid={false}
      />
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onConversationSelect={handleConversationSelect}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
      />

      <main className={`ask-zena-main ${avatarMode === 'hero' ? 'hero-mode' : ''}`}>
        {avatarMode === 'hero' && (
          <div className="hero-avatar-section">
            <div className="hero-avatar-container" onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}>
              <ZenaHighTechAvatar
                imageSrc="/assets/zena-avatar.jpg"
                size={280}
                voiceState={getVoiceState()}
                dissolvePhase={dissolvePhase}
                audioLevel={audioLevel}
                particleCount={450}
                fluidParticleCount={900}
                onDissolvePhaseComplete={handleDissolvePhaseComplete}
              />
            </div>
            <div className="hero-greeting">
              <h2>How can I help you, Agent?</h2>
              {showVoiceRecorder && <p className="hero-status">Listening...</p>}
              {isSpeaking && <p className="hero-status">Speaking...</p>}
            </div>
          </div>
        )}

        {/* Hero mode: Centered input and hands-free button */}
        {avatarMode === 'hero' && (
          <div className="hero-controls">
            <form className="hero-input-form" onSubmit={handleSubmit}>
              <div className="hero-input-card">
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
                  placeholder="Ask Zena anything..."
                  rows={1}
                />
                <button
                  type="submit"
                  className="hero-send-btn"
                  disabled={!inputValue.trim() || isLoading}
                >
                  ➤
                </button>
              </div>
            </form>

            <button
              className={`conversation-mode-toggle ${isConversationMode ? 'active' : ''}`}
              onClick={() => {
                setIsConversationMode(!isConversationMode);
                if (!isConversationMode) setShowVoiceRecorder(true);
              }}
            >
              {isConversationMode ? 'Stop Hands-Free' : 'Start Hands-Free Session'}
            </button>
          </div>
        )}

        <div className="chat-container">
          {isConversationMode && (
            <div className="conversation-mode-indicator">
              <span className="live-dot pulse"></span>
              Hands-Free Conversation Active
            </div>
          )}
          <div className="messages-list">
            {messages.map((message) => (
              <React.Fragment key={message.id}>
                {message.id === lastAssistantMessageId && !isLoading && !streamingContent && (
                  <div className="avatar-inline-container">
                    <ZenaHighTechAvatar
                      imageSrc="/assets/zena-avatar.jpg"
                      size={100}
                      voiceState={getVoiceState()}
                      dissolvePhase={dissolvePhase}
                      audioLevel={audioLevel}
                      particleCount={150}
                      fluidParticleCount={300}
                      onDissolvePhaseComplete={handleDissolvePhaseComplete}
                    />
                  </div>
                )}
                <MessageBubble message={message} />
              </React.Fragment>
            ))}
            {isLoading && !streamingContent && (
              <div className="avatar-inline-container loading">
                <ZenaHighTechAvatar
                  imageSrc="/assets/zena-avatar.jpg"
                  size={100}
                  voiceState="processing"
                  dissolvePhase={dissolvePhase === 'idle' ? 'vortex' : dissolvePhase}
                  audioLevel={0}
                  particleCount={150}
                  fluidParticleCount={300}
                  onDissolvePhaseComplete={handleDissolvePhaseComplete}
                />
                <div className="loading-indicator">Zena is thinking...</div>
              </div>
            )}
            {streamingContent && (
              <div className="avatar-inline-container speaking">
                <ZenaHighTechAvatar
                  imageSrc="/assets/zena-avatar.jpg"
                  size={100}
                  voiceState="idle"
                  dissolvePhase="speaking"
                  audioLevel={audioLevel}
                  particleCount={150}
                  fluidParticleCount={300}
                  onDissolvePhaseComplete={handleDissolvePhaseComplete}
                />
                <div className="message-bubble-wrapper assistant">
                  <div className="message-bubble">
                    <div className="message-content">
                      {streamingContent}
                      <span className="typing-cursor">▋</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="input-area" onSubmit={handleSubmit}>
            <div className="input-card">
              <AttachmentManager
                attachments={attachments}
                onAddAttachments={handleAddAttachments}
                onRemoveAttachment={handleRemoveAttachment}
              />
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
                placeholder="Ask Zena anything..."
                rows={1}
              />
              <div className="input-actions">
                <button
                  className={`conversation-mode-trigger ${isConversationMode ? 'active' : ''}`}
                  type="button"
                  onClick={() => setIsConversationMode(!isConversationMode)}
                  title={isConversationMode ? "Stop Hands-Free" : "Start Hands-Free Session"}
                >
                  {isConversationMode ? '🔴' : '🔄'}
                </button>
                <button
                  className={`voice-trigger ${showVoiceRecorder ? 'active' : ''}`}
                  type="button"
                  onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                >
                  {showVoiceRecorder ? '✕' : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor" />
                      <path d="M5 10V11C5 14.866 8.13401 18 12 18V18C15.866 18 19 14.866 19 11V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M12 18V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
                <button
                  className="send-trigger"
                  onClick={handleSubmit}
                  disabled={!inputValue.trim() || isLoading}
                >
                  ➤
                </button>
              </div>
            </div>
            {error && <div className="error-toast">{error}</div>}
          </form>
        </div>

        {showVoiceRecorder && (
          <div className="voice-recorder-overlay">
            <VoiceRecorder
              onRecordingComplete={handleVoiceRecordingComplete}
              showTranscription={false}
              showEntities={false}
              className="floating-recorder"
            />
          </div>
        )}
      </main>
    </div>
  );
};
