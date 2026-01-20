import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../utils/apiClient';
import { VoiceRecorder } from '../../components/VoiceRecorder/VoiceRecorder';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ZenaHighTechAvatar } from '../../components/ZenaHighTechAvatar/ZenaHighTechAvatar';
import { DissolvePhase } from '../../components/DissolveParticleSystem/DissolveParticleSystem';
import {
  ChatSidebar,
  MessageBubble,
  AttachmentManager,
  Message,
  Conversation,
  Attachment,
  ActionChip,
  PinnedContextBar
} from '../../components/AskZena';
import { Lightbox } from '../../components/AskZena/Lightbox';
import { voiceInteractionService } from '../../services/voice-interaction.service';
import { AmbientBackground } from '../../components/AmbientBackground/AmbientBackground';
import { MissionStatusWidget } from '../../components/AskZena/MissionStatusWidget';
import { liveAudioService } from '../../services/live-audio.service';
import { realTimeDataService } from '../../services/realTimeDataService';
import { TranscriptionMerger } from '../../utils/transcription/transcription-merger';
import { decodeHTMLEntities } from '../../utils/text-utils';
import { StrategySessionContext, STRATEGY_SESSION_KEY, buildStrategyOpener } from '../../components/DealFlow/types';
import {
  ArrowLeft, Copy, Check, Mail, Calendar, Archive, Presentation,
  TrendingUp, TrendingDown, FileText, Database, Clock, Paperclip,
  Loader2, MessageSquare, Trash2, CheckCheck, User, Quote, Eye,
  ChevronRight, X
} from 'lucide-react';
import CRMWriteConfirmationModal from '../../components/CRMWriteConfirmationModal/CRMWriteConfirmationModal';
import './AskZenaPage.css';
import './TapToTalkButton.css';

interface StarterPrompt {
  label: string;
  icon: string;
  prompt: string;
}

const STARTER_PROMPTS: StarterPrompt[] = [
  {
    label: "Practice a tough client call",
    icon: "🎯",
    prompt: "I want to practice my objection handling. You play a skeptical seller who is thinking about cutting my commission. Challenge my value proposition naturally."
  },
  {
    label: "Who should I call right now?",
    icon: "📞",
    prompt: "Scan my latest leads and CRM activity. Based on who is most likely to move, tell me who I should call right now and give me a specific strategic angle to use."
  },
  {
    label: "Give me your daily debrief.",
    icon: "📊",
    prompt: "Let's do my daily debrief. I'll tell you about my meetings, wins, and new leads from today so you can update my context and core databases."
  },
  {
    label: "Solve a deal roadblock.",
    icon: "🌉",
    prompt: "I have a deal that's hitting a roadblock. I'll describe the current hurdle in negotiations or closing, and I want you to help me brainstorm creative workarounds."
  }
];

export const AskZenaPage: React.FC = () => {
  const componentInstanceId = useRef(Math.random().toString(36).substring(7));
  const initialUrlContextRef = useRef<string | undefined>(undefined); // Store context before clearing URL
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
  const [previewAttachment, setPreviewAttachment] = useState<any | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConversationMode, setIsConversationMode] = useState(false);
  // CRITICAL: Session-level stop flag - persists across re-renders and prevents auto-restart
  // This is set when user MANUALLY stops Zena Live and cleared when they MANUALLY start it
  const wasManuallyStoppedRef = useRef<boolean>(sessionStorage.getItem('zena_live_manually_stopped') === 'true');
  const isMountedRef = useRef<boolean>(true); // Track mount status to prevent zombie async updates
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [pinnedContext, setPinnedContext] = useState<string | null>(null);
  const [avatarMode, setAvatarMode] = useState<'hero' | 'assistant'>('hero');
  const [dissolvePhase, setDissolvePhase] = useState<DissolvePhase>('idle');
  const [userTranscript, setUserTranscript] = useState('');
  const [copiedStreaming, setCopiedStreaming] = useState(false);

  // Phase 7: CRM Write Approval State
  const [showWriteConfirmation, setShowWriteConfirmation] = useState(false);
  const [pendingActionData, setPendingActionData] = useState<any>(null);
  const [isExecutingWrite, setIsExecutingWrite] = useState(false);

  // IMMEDIATE CONTEXT CAPTURE: Capture context from URL *before* any effects run or clear it
  // This persists across re-renders even if searchParams are cleared later
  const currentContextParam = searchParams.get('context');
  if (currentContextParam && !initialUrlContextRef.current) {
    console.log('[AskZena] Captured context from URL (Render Phase):', currentContextParam);
    initialUrlContextRef.current = currentContextParam;
  }
  const [liveConnectionStatus, setLiveConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const hasAutoSubmitted = useRef(false);
  const activeConversationIdRef = useRef<string | undefined>(activeConversationId);
  const isInternalIdChangeRef = useRef(false);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dragCounterRef = useRef(0);
  const userMergerRef = useRef(new TranscriptionMerger());
  const currentUtteranceIdRef = useRef<string | null>(null);
  const strategySessionContextRef = useRef<StrategySessionContext | null>(null);
  const hasStrategySessionStartedRef = useRef(false); // Prevent double-trigger in React Strict Mode
  const hasHandledUrlParamsRef = useRef(false); // Track if we've already processed URL start params
  const pendingSpokenGreetingRef = useRef<string>(''); // Track greeting sent via voice.live.prompt to avoid duplicate


  // Sync ref with state and persist to sessionStorage
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
    if (activeConversationId) {
      console.log('[AskZena] Saving active conversation to sessionStorage:', activeConversationId);
      sessionStorage.setItem('zena_active_conversation_id', activeConversationId);
    } else {
      // Don't remove if it was just cleared by a remount (we'll see about this in the restore effect)
    }
  }, [activeConversationId]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Find the last assistant message ID to place the avatar above it
  const lastAssistantMessageId = [...messages]
    .reverse()
    .find(m => m.role === 'assistant')?.id;

  // Get voice state for high-tech avatar
  const getVoiceState = () => {
    if (showVoiceRecorder) return 'processing' as const; // "Thinking" during listening per user request
    if (isLoading) return 'processing' as const;
    return 'idle' as const;
  };

  const location = useLocation();

  // 🧠 ZENA RESILIENCE: Restore active conversation ID from sessionStorage on mount
  useEffect(() => {
    // Check for explicit reset request from navigation (e.g. clicking the Global Avatar)
    const state = location.state as { reset?: boolean } | null;
    if (state?.reset) {
      console.log('[AskZena] Reset requested via navigation. Clearing active conversation session.');
      sessionStorage.removeItem('zena_active_conversation_id');
      setActiveConversationId(undefined);
      setAvatarMode('hero');

      // Clear the reset flag from history so it doesn't persist on reload
      window.history.replaceState({}, document.title);
      return;
    }

    const savedId = sessionStorage.getItem('zena_active_conversation_id');
    if (savedId && !activeConversationIdRef.current) {
      console.log('[AskZena] Restoring active conversation from sessionStorage:', savedId);
      setActiveConversationId(savedId);
      setAvatarMode('assistant');
    }
  }, []);

  // Handle dissolve phase transitions
  const handleDissolvePhaseComplete = useCallback((completedPhase: DissolvePhase) => {
    if (completedPhase === 'dissolving') {
      setDissolvePhase('vortex');
    } else if (completedPhase === 'reforming') {
      setDissolvePhase('idle');
    }
  }, []);

  // Mission / Media Session Logic
  useEffect(() => {
    if (!isConversationMode) return;

    // Setup Media Session for Hardware Controls (Car / Headset)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Zena Mission Active',
        artist: 'AI Copilot',
        artwork: [{ src: '/icons/zena-live-cover.png', sizes: '512x512', type: 'image/png' }]
      });

      const actionHandlers = [
        ['play', () => {
          console.log('MediaKey: Play - Resuming Session');
          updateActivity(true, 'hardware-play');
          // Could verify connection or un-mic mute
        }],
        ['pause', () => {
          console.log('MediaKey: Pause - Muting/Pausing');
          // liveAudioService.setMicMuted(true);
        }],
        ['nexttrack', () => {
          console.log('MediaKey: Next Task');
          realTimeDataService.sendMessage('voice.live.prompt', { text: "Skip to the next item on the list." });
        }],
        ['previoustrack', () => {
          console.log('MediaKey: Previous/Repeat');
          realTimeDataService.sendMessage('voice.live.prompt', { text: "Repeat that last instruction." });
        }]
      ];

      for (const [action, handler] of actionHandlers) {
        try { navigator.mediaSession.setActionHandler(action as MediaSessionAction, handler as any); } catch (e) {
          console.warn(`Warning! Media Session action "${action}" is not supported.`);
        }
      }
    }
  }, [isConversationMode]);

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

  const detectIntentAndGenerateChips = useCallback((text: string, backendActions: any[] = [], onExecute?: (tool: string, payload: any) => void) => {
    const chips: ActionChip[] = [];
    text = text.toLowerCase();

    // 1. Process Structured Actions from Backend (One-Click)
    if (backendActions && backendActions.length > 0) {
      backendActions.forEach(action => {
        if (typeof action === 'object' && action.toolName) {
          chips.push({
            label: action.label,
            icon: action.icon || '⚡',
            onClick: () => onExecute?.(action.toolName, action.payload)
          });
        }
      });
    }

    // Check both text and backend-suggested actions (legacy string IDs)
    const hasAction = (term: string, actionId?: string) =>
      text.includes(term) || (actionId && backendActions.includes(actionId));

    // Pin Address chip removed per user request
    const handleDownloadReport = async (reportContent: string) => {
      try {
        setIsLoading(true);
        console.log('[AskZena] Requesting PDF generation for report...');

        // Use axios/api client to get blob response
        const res = await api.post('/api/ask/generate-pdf', {
          content: reportContent,
          title: 'Market Analysis Report'
        }, { responseType: 'blob' });

        // Create download link
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Zena_Market_Report.pdf');
        document.body.appendChild(link);
        link.click();

        // Cleanup
        link.remove();
        window.URL.revokeObjectURL(url);
        setIsLoading(false);
        console.log('[AskZena] PDF download triggered successfully');
      } catch (err) {
        console.error('[AskZena] Failed to download report:', err);
        setError('Failed to generate report PDF. Please try again.');
        setIsLoading(false);
      }
    };

    // Draft Email chip removed per user request

    if (hasAction('report', 'generate_report') || hasAction('pdf', 'generate_pdf')) {
      chips.push({
        label: "Download Report",
        icon: "📄",
        onClick: () => handleDownloadReport(text)
      });
    }

    return chips;
  }, []);


  // Load conversations and messages
  const loadConversations = useCallback(async () => {
    try {
      const response = await api.get<{ conversations: Conversation[] }>('/api/history');
      setConversations(response.data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const response = await api.get<{ conversation: { messages: any[] } }>(`/api/history/${id}`);

      // Re-hydrate chips for historical assistant messages
      const handleOneClickExecute = (toolName: string, payload: any) => {
        console.log('[AskZena] One-Click Execution (History):', toolName);
        const command = `Please execute ${toolName} with these parameters: ${JSON.stringify(payload)}`;
        submitQuery(command);
      };

      const messagesWithChips = (response.data.conversation.messages || []).map(msg => {
        if (msg.role === 'assistant' && msg.suggestedActions) {
          return {
            ...msg,
            chips: detectIntentAndGenerateChips(msg.content, msg.suggestedActions, handleOneClickExecute)
          };
        }
        return msg;
      });

      setMessages(messagesWithChips);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setIsLoading(false);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveConversationId(undefined);
    sessionStorage.removeItem('zena_active_conversation_id');
    setMessages([]);
    setInputValue('');
    setAttachments([]);
    setError(null);
    stopSpeaking();
    setAvatarMode('hero');
    setDissolvePhase('idle');
    setStreamingContent('');
  }, [stopSpeaking]);

  const handleConversationSelect = useCallback((id: string) => {
    setActiveConversationId(id);
    setAvatarMode('assistant');
    setError(null);
    stopSpeaking();
  }, [stopSpeaking]);

  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/history/${id}`);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) {
        sessionStorage.removeItem('zena_active_conversation_id');
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  }, [activeConversationId, handleNewChat]);

  // Simulate streaming response word by word
  const simulateStreamingResponse = useCallback(async (text: string, chips: ActionChip[] = []) => {
    setStreamingContent('');
    const cleanText = decodeHTMLEntities(text);
    const words = cleanText.split(' ');
    let currentText = '';

    console.log('[AskZena] Starting text streaming...');
    setDissolvePhase('speaking');

    for (let i = 0; i < words.length; i++) {
      currentText += (i === 0 ? '' : ' ') + words[i];
      setStreamingContent(currentText);
      await new Promise(resolve => setTimeout(resolve, 40));
    }

    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        const updated = [...prev];
        updated[updated.length - 1] = { ...lastMessage, content: text, chips };
        return updated;
      }
      return prev;
    });

    console.log('[AskZena] Text streaming finished.');
    setTimeout(() => {
      triggerReform();
    }, 1500);
  }, [triggerReform]);

  // Handle Live Mode (Gemini 2.5 Live)
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const zenaAskedRef = useRef<boolean>(false);
  const zenaSpeakingRef = useRef<boolean>(false); // Track if Zena is currently speaking
  const zenaHasRespondedRef = useRef<boolean>(false); // Track if Zena has completed at least one response

  const liveTranscriptBufferRef = useRef('');
  const userTranscriptBufferRef = useRef('');
  const pendingSourcesRef = useRef<string>(''); // Store pending sources to append after Zena's message
  const isWaitingForIdleResponseRef = useRef<boolean>(false);
  const zenaDrainingRef = useRef<boolean>(false); // Track if Zena is in the final 1000ms drain phase

  // STABLE UPDATE HELPER - moved to component level
  const updateActivity = useCallback((isUser: boolean = true, reason: string = 'unknown', shouldResetAsked: boolean = true) => {
    lastActivityRef.current = Date.now();

    // SAFETY RESET: If user starts speaking, ensure Zena speaking flag is reset
    // This prevents the inactivity timer from being blocked if Zena's stop signal was missed
    if (isUser && (reason === 'user-speaking' || reason === 'user-transcript')) {
      if (zenaSpeakingRef.current) {
        console.log('[AskZena] Safety reset: Zena was marked as speaking but user is active. Resetting flag.');
        zenaSpeakingRef.current = false;
      }
    }

    // STICKY STATE FIX: Only reset 'asked' state for "High Confidence" activity
    // Added 'user-speaking' so user speech resets the "Checking..." state immediately
    const highConfidenceReasons = ['user-transcript', 'zena-transcript', 'start-live-init', 'user-speaking'];
    const isHighConfidence = highConfidenceReasons.includes(reason);

    if (shouldResetAsked && isHighConfidence) {
      if (zenaAskedRef.current) {
        console.log(`[AskZena] High Confidence activity from ${isUser ? 'User' : 'Zena'} (${reason}) - resetting zenaAsked state`);
      }
      zenaAskedRef.current = false;
    }
  }, []);

  // NEW: Subscribe to interim agent messages (e.g. "Working on it...")
  useEffect(() => {
    const unsubscribe = realTimeDataService.onAgentMessage((payload) => {
      console.log('[AskZena] Received interim agent message:', payload.message);
      setMessages(prev => [
        ...prev,
        {
          id: `agent-msg-${Date.now()}`,
          role: 'assistant',
          content: payload.message,
          timestamp: new Date()
        }
      ]);
    });
    return () => unsubscribe();
  }, []);

  // NEW: Subscribe to system notifications (Parallel Task Completions)
  useEffect(() => {
    const unsubscribe = realTimeDataService.onSystemNotification((payload) => {
      console.log('[AskZena] Received system notification:', payload.message);
      setMessages(prev => [
        ...prev,
        {
          id: `sys-msg-${Date.now()}`,
          role: 'assistant',
          content: `🔔 **SYSTEM UPDATE**: ${payload.message}\n\n${payload.details ? '```json\n' + JSON.stringify(payload.details, null, 2) + '\n```' : ''}`,
          timestamp: new Date()
        }
      ]);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let unsubscribeUser: (() => void) | null = null;
    let unsubscribeSources: (() => void) | null = null;
    let isCancelled = false; // Internal cancellation for this effect run
    const currentInstanceId = componentInstanceId.current;

    console.log('[AskZena] Inactivity Effect STARTED');

    if (isConversationMode) {
      // CRITICAL GUARD: If user manually stopped, do NOT auto-start
      // This prevents unwanted restarts after navigation
      if (wasManuallyStoppedRef.current) {
        console.log('[AskZena] Blocked: User manually stopped - not auto-starting');
        // Reset state to prevent UI inconsistency
        setIsConversationMode(false);
        return;
      }

      // GUARD: Check if liveAudioService is in hard-stopped state
      // REMOVED: This check was too aggressive and blocked legitimate starts from other pages.
      // The wasManuallyStoppedRef check above is sufficient to prevent the auto-restart bug.
      /* 
      if (liveAudioService.isHardStopped()) {
        console.log('[AskZena] Blocked: liveAudioService is hard-stopped - not auto-starting');
        setIsConversationMode(false);
        return;
      }
      */

      console.log('[AskZena] Entering Live Mode...');
      setDissolvePhase('vortex'); // Vortex phase during live connection

      // RESET SESSION STATE
      zenaHasRespondedRef.current = false;
      zenaAskedRef.current = false;
      updateActivity(false, 'start-live-init'); // Sets lastActivityRef.current to now

      // Async setup for Live Mode
      const startLiveMode = async () => {
        setError(null); // Clear any previous errors
        setLiveConnectionStatus('connecting');
        // Ensure WebSocket is connected first
        const connected = await realTimeDataService.ensureConnection();

        // ABORT if cancelled or instance changed
        if (isCancelled || currentInstanceId !== componentInstanceId.current) {
          console.log(`[AskZena][${currentInstanceId}] Live mode start aborted (cancelled or instance changed)`);
          return;
        }

        // DOUBLE GATE: Only proceed if isConversationMode is STILL true
        if (!isConversationMode) {
          console.log(`[AskZena][${currentInstanceId}] Live mode start aborted (isConversationMode is now false)`);
          return;
        }

        if (!connected) {
          console.error('[AskZena] Failed to establish WebSocket connection');
          setError('Failed to connect to Zena Live. Please refresh and try again.');
          setLiveConnectionStatus('error');
          console.log('[AskZena] Setting isConversationMode to false due to CONNECTION FAILURE');
          // Clear manual stop flag on error so user can try again
          sessionStorage.removeItem('zena_live_manually_stopped');
          wasManuallyStoppedRef.current = false;
          setIsConversationMode(false);
          return;
        }

        console.log('[AskZena] WebSocket connected, starting Live Mode...');

        // FIX: Register callbacks IMMEDIATELY to prevent dropping early segments
        // The saveVoiceInteraction helper is hoisted so callbacks can use it.
        let saveVoiceInteractionFn = async (role: 'user' | 'assistant', content: string) => {
          // This is a placeholder that will be replaced once the conversation is ready.
          console.log('[AskZena] Early voice interaction ignored (connection pending):', role, content.substring(0, 30));
        };

        // Now that the connection is assured, wire up the real save function.
        saveVoiceInteractionFn = async (role: 'user' | 'assistant', content: string) => {
          try {
            let conversationId = activeConversationIdRef.current;
            if (!conversationId) {
              console.log('[AskZena] Creating new conversation for voice transcript...');
              const newConv = await api.post<{ conversation: any }>('/api/history', {
                title: content.substring(0, 30) + (content.length > 30 ? '...' : '')
              });
              conversationId = newConv.data.conversation.id;

              isInternalIdChangeRef.current = true;
              activeConversationIdRef.current = conversationId;
              setActiveConversationId(conversationId);
              loadConversations();
            }
            await api.post(`/api/history/${conversationId}/messages`, { role, content });
          } catch (err) {
            console.error('[AskZena] Failed to save voice interaction:', err);
          }
        };

        unsubscribe = realTimeDataService.onLiveTranscript((text: string, isFinal: boolean) => {
          console.log('[AskZena] Received Zena transcript:', text, 'Final:', isFinal, 'Buffer length:', liveTranscriptBufferRef.current.length);

          if (isFinal) {
            console.log('[AskZena] Zena transcript marked final. Draining response for 1000ms...');
            zenaDrainingRef.current = true;

            // DRAIN DELAY: Wait a moment for the actual audio to finish playing
            // before we clear the buffer and reset the speaking flag.
            // Increased to 1000ms to ensure "I've listed those sources on your screen" finishes correctly.
            setTimeout(() => {
              if (playbackTimerRef.current) {
                clearTimeout(playbackTimerRef.current);
                playbackTimerRef.current = null; // CRITICAL: Reset the ref
              }
              zenaSpeakingRef.current = false;
              zenaDrainingRef.current = false; // Drain finished

              const shouldResetAsked = !isWaitingForIdleResponseRef.current;
              updateActivity(false, 'zena-transcript', shouldResetAsked);
              isWaitingForIdleResponseRef.current = false;

              const finalContent = decodeHTMLEntities(liveTranscriptBufferRef.current.trim());
              console.log('[AskZena] Finalizing Zena transcript after 1000ms drain, content:', finalContent.substring(0, 50), '...');

              if (finalContent) {
                // Check if this is the initial greeting we sent via voice.live.prompt
                // If so, skip adding it since we already added it to messages
                const pendingGreeting = pendingSpokenGreetingRef.current;
                if (pendingGreeting && finalContent.toLowerCase().includes(pendingGreeting.toLowerCase().substring(0, 30))) {
                  console.log('[AskZena] Skipping duplicate greeting from voice transcript');
                  pendingSpokenGreetingRef.current = ''; // Clear the pending greeting
                  liveTranscriptBufferRef.current = '';
                  setStreamingContent('');
                  setUserTranscript('');
                  // Mark as responded so inactivity timer can start!
                  zenaHasRespondedRef.current = true;
                  return; // Don't add duplicate
                }

                // THEN: Add Zena's response (including any pending sources)
                const chips = detectIntentAndGenerateChips(finalContent);
                const pendingSources = pendingSourcesRef.current;
                const messageContent = pendingSources ? finalContent + pendingSources : finalContent;

                setMessages(prev => [
                  ...prev,
                  { id: `zena-voice-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, role: 'assistant', content: messageContent, chips, timestamp: new Date() }
                ]);

                // Clear pending sources after use
                if (pendingSources) {
                  console.log('[AskZena] Appended pending sources to Zena message');
                  pendingSourcesRef.current = '';
                }

                saveVoiceInteractionFn('assistant', messageContent);
                liveTranscriptBufferRef.current = '';
                setStreamingContent('');
                setUserTranscript('');
                triggerReform();

                // Mark that Zena has completed at least one response - inactivity timer can now start
                zenaHasRespondedRef.current = true;
                console.log('[AskZena] Zena response saved, switching to assistant mode if needed');

                // Force assistant mode after Zena responds
                // if (avatarMode === 'hero') {
                //   console.log('[AskZena] Switching from hero to assistant mode');
                //   setAvatarMode('assistant');
                // }

                // Reset for next turn
                userMergerRef.current.reset();
                currentUtteranceIdRef.current = null;
              }
            }, 1000);
          } else {
            // Zena started speaking (interim)

            // SILENCE BUFFER LOGIC:
            // If this is the FIRST chunk of a new response, disable immediate playback
            if (!zenaSpeakingRef.current) {
              // NON-DEBOUNCED TIMER: Only start if not already counting down
              // This fixes the bug where rapid chunks constantly reset the timer, preventing it from ever firing
              if (!playbackTimerRef.current && text.length > 0) {
                console.log('[AskZena] Zena attempting to speak. Buffering for 200ms...');

                playbackTimerRef.current = setTimeout(() => {
                  console.log('[AskZena] Silence buffer passed. Allowing Zena to speak.');
                  playbackTimerRef.current = null; // CRITICAL: Timer has fired, reset it
                  zenaSpeakingRef.current = true;
                  updateActivity(false, 'zena-speaking-start', false);
                  liveAudioService.startQueuePlayback();
                  setDissolvePhase('speaking');

                  // Clear user shadow text immediately when Zena starts speaking
                  setUserTranscript('');

                  // Force assistant mode if Zena starts talking
                  // if (avatarMode === 'hero') setAvatarMode('assistant');
                }, 200); // 200ms delay to match log
              }
            } else {
              // Already speaking - ensure queue keeps playing if it ran dry
              liveAudioService.startQueuePlayback();
            }

            // Assuming Zena is "speaking" (or buffering), accumulate text
            liveTranscriptBufferRef.current += text;

            // Only update streaming content if we have actually started "speaking" (timer passed)
            // OR if we want to show text while audio is buffering (optional choice). 
            // Better to hide text until audio starts to match the delay.
            if (zenaSpeakingRef.current) {
              setStreamingContent(decodeHTMLEntities(liveTranscriptBufferRef.current));
            }
          }
        });

        unsubscribeUser = realTimeDataService.onUserTranscript((text: string, isFinal: boolean) => {
          // Show immediate feedback in the UI (Shadow Text)
          setUserTranscript(text);
          console.log('[AskZena] User transcript received:', text, 'Final:', isFinal);

          // INTERRUPTION LOGIC:
          // User spoke! 
          const isSignificantSpeech = text.trim().length > 10;

          if (playbackTimerRef.current) {
            console.log('[AskZena] User interrupted silence buffer! Cancelling Zena response.');
            clearTimeout(playbackTimerRef.current);
            playbackTimerRef.current = null;
            liveAudioService.clearPlayback(); // Discard buffered audio
            setStreamingContent('');
          } else if (zenaDrainingRef.current && isSignificantSpeech) {
            // If we are in the 1000ms drain phase, ONLY interrupt if the user said something substantial
            console.log('[AskZena] User interrupted Zena DRAIN phase with significant speech. Clearing.');
            zenaDrainingRef.current = false;
            zenaSpeakingRef.current = false;
            liveAudioService.clearPlayback();
          }

          // Also handle normal barge-in (if she was already speaking)
          if (zenaSpeakingRef.current) {
            // Existing barge-in logic usually handled by backend 'voice.live.interrupted'
            // But we can reinforce it here
          }

          // ALWAYS reset inactivity timer when user speaks (even interim)
          updateActivity(true, 'user-speaking', true);

          // Filter out noise/echo artifacts that get transcribed as non-English text
          const hasNonAscii = /[^\x00-\x7F]/.test(text);
          const isNoiseArtifact = text.includes('<noise>') || text.includes('<music>');
          if (hasNonAscii || isNoiseArtifact) {
            console.log('[AskZena] Skipping garbled/noise transcript:', text);
            return; // Skip adding to buffer
          }

          // Accumulate user transcript in buffer
          if (text.trim().length > 0) {
            const buffer = userTranscriptBufferRef.current;
            // Restore smart spacing
            const newText = (buffer && !buffer.endsWith(' ') && !text.startsWith(' ')) ? ` ${text}` : text;
            userTranscriptBufferRef.current = buffer + newText;
            console.log('[AskZena] User buffer APPENDED:', userTranscriptBufferRef.current.substring(0, 100));
          }

          if (isFinal) {
            // Use full text from backend if available, fallback to buffer
            // For voice.live.user_turn_complete, text will be the full finalized transcript
            const finalUserText = (text && text.trim().length > 0) ? text.trim() : userTranscriptBufferRef.current.trim();

            if (finalUserText) {
              console.log('[AskZena] User turn COMPLETE. Final text:', finalUserText);

              // Dedup: check if this message was already added (could happen if input_transcript and user_turn_complete both fire isFinal)
              setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.role === 'user' && lastMsg.content === finalUserText) {
                  console.log('[AskZena] Skipping duplicate user message');
                  return prev;
                }

                const tempId = `user-voice-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                return [
                  ...prev,
                  { id: tempId, role: 'user', content: finalUserText, timestamp: new Date() }
                ];
              });

              // Run cleanup/save after a tiny delay to ensure setMessages state is stable
              setTimeout(() => {
                const tempId = `user-voice-${Date.now()}`; // Not perfect but we just need to save it
                api.post<{ text: string }>('/api/ask/cleanup', { text: finalUserText })
                  .then(res => {
                    const cleaned = res.data.text;
                    saveVoiceInteractionFn('user', cleaned || finalUserText);
                  })
                  .catch(err => {
                    console.error('[AskZena] Cleanup failed:', err);
                    saveVoiceInteractionFn('user', finalUserText);
                  });
              }, 100);

              userTranscriptBufferRef.current = ''; // Clear buffer
              // Clear shadow text
              setTimeout(() => setUserTranscript(''), 500);
            }
          }
          // REMOVED Redundant buffer accumulation here. It's handled more robustly in the first block of this function.
        });

        // SOURCES SUBSCRIPTION: Store sources for appending, or append immediately if turn is over
        unsubscribeSources = realTimeDataService.onLiveSources((formattedText: string, sources: string[]) => {
          console.log('[AskZena] Received sources:', sources.length, 'Zena Speaking:', zenaSpeakingRef.current);

          if (sources.length > 0) {
            // If Zena is still speaking or hasn't started, store for later
            if (zenaSpeakingRef.current || liveTranscriptBufferRef.current.length > 0) {
              console.log('[AskZena] Zena is active, storing sources in ref');
              pendingSourcesRef.current = formattedText;
            } else {
              // Zena is done, append immediately to last message
              console.log('[AskZena] Zena is silent, appending sources immediately');
              setMessages(prev => {
                const lastIdx = prev.length - 1;
                if (lastIdx >= 0 && prev[lastIdx].role === 'assistant') {
                  const updated = [...prev];
                  const lastMessage = updated[lastIdx];
                  // Avoid double appending if we already did it in finalContent block
                  if (!lastMessage.content.includes('**Verified Sources:**')) {
                    updated[lastIdx] = {
                      ...lastMessage,
                      content: lastMessage.content + formattedText
                    };
                    return updated;
                  }
                }
                return prev;
              });
            }
          }
        });

        // Start inactivity timer
        inactivityTimeoutRef.current = setInterval(() => {
          // CRITICAL: If hard stopped, clear interval and exit
          if (liveAudioService.isHardStopped()) {
            console.log('[AskZena] Inactivity timer detected HARD STOP - clearing interval');
            if (inactivityTimeoutRef.current) {
              clearInterval(inactivityTimeoutRef.current);
              inactivityTimeoutRef.current = null;
            }
            return;
          }

          // Skip inactivity counting while Zena is speaking
          if (zenaSpeakingRef.current) {
            return;
          }

          // Skip inactivity counting until Zena has completed at least one response
          // This prevents the inactivity prompt from firing before the conversation starts
          if (!zenaHasRespondedRef.current) {
            return;
          }

          const inactiveTime = Date.now() - lastActivityRef.current;

          // Debug log every 2 seconds to avoid spamming too much but still see progress
          if (Math.floor(inactiveTime / 1000) % 2 === 0 && inactiveTime > 2000) {
            console.log(`[AskZena] Inactive for ${Math.floor(inactiveTime / 1000)}s... zenaAsked: ${zenaAskedRef.current}`);
          }

          if (inactiveTime > 10000 && !zenaAskedRef.current) {
            console.log('[AskZena] 10s inactivity reached - Zena asking check-in');
            zenaAskedRef.current = true;

            // CRITICAL: Reset timer IMMEDIATELY so the next interval check doesn't immediately deactivate
            lastActivityRef.current = Date.now();

            // FIX: Verbally say the prompt using Zena's native voice via WebSocket (Live Session)
            // This ensures consistency with the main voice.
            const promptText = "Say specifically: 'Is there anything else I can help you with?'";

            // Send prompt to backend to be spoken by Gemini
            console.log('[AskZena] Sending inactivity prompt to Zena Live:', promptText);
            isWaitingForIdleResponseRef.current = true;
            realTimeDataService.sendMessage('voice.live.prompt', { text: promptText });
          }
          else if (inactiveTime > 10000 && zenaAskedRef.current) {
            console.log('[AskZena] 10s passed after check-in (20s total) - deactivating');
            // 10 seconds after asking - still no response, deactivate
            // NOTE: This is an auto-timeout, NOT a manual stop - clear the manual stop flag
            // so user can start Zena Live again later
            sessionStorage.removeItem('zena_live_manually_stopped');
            wasManuallyStoppedRef.current = false;
            setIsConversationMode(false);
            if (inactivityTimeoutRef.current) {
              clearInterval(inactivityTimeoutRef.current);
              inactivityTimeoutRef.current = null;
            }
          }
        }, 1000);

        const startLiveSession = async () => {
          // Double check cancellation
          if (isCancelled || currentInstanceId !== componentInstanceId.current || !isConversationMode) {
            console.log(`[AskZena][${currentInstanceId}] startLiveSession aborted (pre-flight checks failed)`);
            return;
          }

          // SAFETY: Don't start if we are not actually on the Ask Zena page (e.g. during navigation away)
          if (!window.location.pathname.includes('/ask-zena')) {
            console.warn('[AskZena] Aborting startLiveMode - navigate away detected');
            return;
          }

          try {
            // Attempt to get user location if possible
            let location: { lat: number, lng: number } | undefined;
            try {
              if ('geolocation' in navigator) {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                  navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
                });
                location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                console.log('[AskZena] Location captured:', location);
              }
            } catch (locErr) {
              console.warn('[AskZena] Could not capture location:', locErr);
            }

            // DOUBLE SAFETY: Check mounted state and mode again after async operations
            if (isCancelled || currentInstanceId !== componentInstanceId.current || !isConversationMode) {
              console.log(`[AskZena][${currentInstanceId}] startLiveSession aborted after location (cancelled or mode changed)`);
              return;
            }
            if (!window.location.pathname.includes('/ask-zena')) {
              console.warn(`[AskZena][${currentInstanceId}] Aborting startLiveMode after async - navigate away detected (${window.location.pathname})`);
              return;
            }

            const context = initialUrlContextRef.current || searchParams.get('context') || undefined;
            await liveAudioService.start(sessionId, (level, isPlayback) => {
              setAudioLevel(level);

              // IF Zena is speaking (isPlayback), it counts as activity to prevent timeout interruption
              if (isPlayback && level > 0.05) {
                // Keep session alive while Zena is speaking, but do NOT reset asked-state
                updateActivity(false, 'zena-playback', false);
              }
            }, messages, location, context);
            setLiveConnectionStatus('connected');
          } catch (err: any) {
            if (isCancelled) return; // Ignore errors if cancelled

            console.error('[AskZena] Live Mode failed:', err);
            setError(`Live Mode failed: ${err.message}`);
            setLiveConnectionStatus('error');
            console.log('[AskZena] Setting isConversationMode to false due to LIVE MODE START ERROR');
            // Clear manual stop flag on error so user can try again
            sessionStorage.removeItem('zena_live_manually_stopped');
            wasManuallyStoppedRef.current = false;
            setIsConversationMode(false);
          }
        };

        startLiveSession();
      };
      startLiveMode();
    } else {
      console.log('[AskZena] Exiting Live Mode...');
      if (inactivityTimeoutRef.current) {
        clearInterval(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
      liveAudioService.stop();
      setLiveConnectionStatus('idle');
      setDissolvePhase('idle');
      setAudioLevel(0);
      setStreamingContent('');
      liveTranscriptBufferRef.current = '';
      userTranscriptBufferRef.current = '';
      userMergerRef.current.reset();
      currentUtteranceIdRef.current = null;
      zenaSpeakingRef.current = false;
      zenaHasRespondedRef.current = false;
    }

    return () => {
      console.log(`[AskZena][${currentInstanceId}] Inactivity Effect CLEANUP`);
      isCancelled = true; // MARK CANCELLED for this run
      if (unsubscribe) unsubscribe();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeSources) unsubscribeSources();
      if (inactivityTimeoutRef.current) {
        clearInterval(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
      liveAudioService.stop();
      liveTranscriptBufferRef.current = '';
      userMergerRef.current.reset();
      currentUtteranceIdRef.current = null;
    };
  }, [isConversationMode]);

  useEffect(() => {
    // Only auto-switch to assistant mode if we're not waiting for a response
    // AND there is actually an assistant message or streaming content to show
    // This preserves the Hero "Thinking" state
    const hasAssistantMessage = messages.some(m => m.role === 'assistant');
    const shouldSwitch = (hasAssistantMessage || streamingContent) && avatarMode === 'hero' && !isLoading;

    // Also switch if it's a conversation history load (many messages) but not if it's a new single query
    const isHistoryLoad = messages.length > 2;

    // CRITICAL: Block switch if in Zena Live (conversation mode) which must stay in Hero mode
    if (isConversationMode) return;

    if (shouldSwitch || (isHistoryLoad && avatarMode === 'hero')) {
      setAvatarMode('assistant');
    }
  }, [messages, avatarMode, isLoading, streamingContent, isConversationMode]);

  useEffect(() => {
    if (messagesEndRef.current) {
      // Direct scroll for more reliability in dynamic layouts
      const container = messagesEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
      // Fallback/Smooth transition
      if (messagesEndRef.current.scrollIntoView) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [messages, streamingContent, isConversationMode]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue, avatarMode]); // Run when value OR mode changes

  // Track mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load conversations and check for auto-prompt on mount
  useEffect(() => {
    loadConversations();

    const prompt = searchParams.get('prompt');
    const mode = searchParams.get('mode');
    const greetingKey = searchParams.get('greeting');

    if (!hasHandledUrlParamsRef.current) {
      hasHandledUrlParamsRef.current = true;
      console.log('[AskZena] Handling URL params. Mode:', mode, 'Greeting:', greetingKey);

      // 1. Handle custom greetings (HIGHEST PRIORITY)
      if (mode === 'live') {
        console.log('[AskZena] Live Mode trigger detected via URL');
        sessionStorage.removeItem('zena_live_manually_stopped');
        wasManuallyStoppedRef.current = false;
        setIsConversationMode(true);
        setShowVoiceRecorder(true);

        // Clear params
        setSearchParams({}, { replace: true });
      }

      if (greetingKey === 'strategy-session') {
        const isLiveMode = searchParams.get('liveMode') === 'true';

        // Try to read context from sessionStorage (set by DealFlowPage)
        let greetingText = "Let's start a strategy session! How can I help? What deal are you stuck on or need help with?";
        let pinnedText: string | null = null;

        try {
          const contextJson = sessionStorage.getItem(STRATEGY_SESSION_KEY);
          console.log('[AskZena] Strategy session context from sessionStorage:', contextJson);
          if (contextJson) {
            const context: StrategySessionContext = JSON.parse(contextJson);
            strategySessionContextRef.current = context;
            console.log('[AskZena] Parsed strategy context:', context);

            // Build context-aware opener based on risk type
            greetingText = buildStrategyOpener(context);
            pinnedText = `${context.address} • ${context.stageLabel} • ${context.healthScore}% health`;
            console.log('[AskZena] Context-aware greeting:', greetingText);

            // CRITICAL FIX: Do NOT clear sessionStorage here.
            // In React Strict Mode (dev), this effect runs twice. 
            // If we clear it on the first run, the second run (the one that stays) has no context.
            // sessionStorage.removeItem(STRATEGY_SESSION_KEY); 
          }
        } catch (err) {
          console.error('[AskZena] Failed to parse strategy session context:', err);
        }

        // Add greeting message
        setMessages([{
          id: `greeting-${Date.now()}`,
          role: 'assistant',
          content: greetingText,
          timestamp: new Date()
        }]);

        // Set pinned context if available
        if (pinnedText) {
          setPinnedContext(pinnedText);
        }

        // Prevent wipe in the other effect
        isInternalIdChangeRef.current = true;

        if (isLiveMode) {
          // ZENA LIVE MODE: Keep hero avatar, start conversation mode, speak greeting
          console.log('[AskZena] Starting Zena Live for strategy session...');
          setAvatarMode('hero');
          sessionStorage.removeItem('zena_live_manually_stopped');
          wasManuallyStoppedRef.current = false;
          setIsConversationMode(true);

          // Speak using Zena's REAL voice via the live WebSocket (same as normal Zena Live)
          // Need to wait for the live connection to establish first
          // Track this greeting so we don't add it again when the transcript comes back
          pendingSpokenGreetingRef.current = greetingText;
          setTimeout(() => {
            console.log('[AskZena] Sending strategy session greeting via Zena Live voice...');
            realTimeDataService.sendMessage('voice.live.prompt', {
              text: `Say exactly: "${greetingText}"`
            });
          }, 2000);
        } else {
          // CHAT MODE: Switch to assistant view for inline chat
          setAvatarMode('assistant');
        }

        // Clean up URL and return
        setSearchParams({}, { replace: true });
        return;
      }

      if (mode === 'handsfree') {
        const timestamp = searchParams.get('t');
        const lastProcessed = sessionStorage.getItem('last_live_start_ts');

        // STALE CHECK: If this exact timestamp was already processed, it's likely a "Back" button navigation
        // In that case, we should IGNORE it and respect the manual stop state.
        if (timestamp && timestamp === lastProcessed) {
          console.log('[AskZena] Stale handsfree start detected (Back Button?) - ignoring to prevent auto-restart');
          // Still clear params to clean up
          setSearchParams({}, { replace: true });
        } else {
          // VALID NEW START: User explicitly clicked the button
          if (timestamp) {
            sessionStorage.setItem('last_live_start_ts', timestamp);
          }

          console.log('[AskZena] Explicit Handsfree start detected - overriding stop flags');
          sessionStorage.removeItem('zena_live_manually_stopped');
          wasManuallyStoppedRef.current = false;

          setIsConversationMode(true);
          setShowVoiceRecorder(true);
          // Clear URL params to prevent re-triggering conversation on remount/refresh
          setSearchParams({}, { replace: true });
        }
      }

      // Strategy Session Mode - context-aware Zena Live from Deal Flow
      if (mode === 'strategy-session' && !hasStrategySessionStartedRef.current) {
        hasStrategySessionStartedRef.current = true; // Prevent double trigger from React Strict Mode
        console.log('[AskZena] Strategy session mode DETECTED!');

        // EXPLICIT START: Strategy session implies user wants to talk
        console.log('[AskZena] Strategy mode detected - overriding stop flags');
        sessionStorage.removeItem('zena_live_manually_stopped');
        wasManuallyStoppedRef.current = false;

        try {
          const contextJson = sessionStorage.getItem(STRATEGY_SESSION_KEY);
          console.log('[AskZena] SessionStorage context:', contextJson);
          if (contextJson) {
            const context: StrategySessionContext = JSON.parse(contextJson);
            strategySessionContextRef.current = context;
            console.log('[AskZena] Parsed strategy context:', context);

            // Build conversational opener based on risk type
            const opener = buildStrategyOpener(context);
            console.log('[AskZena] Strategy opener:', opener);

            // Add context message to chat first
            setMessages([{
              id: `strategy-context-${Date.now()}`,
              role: 'assistant',
              content: opener,
              timestamp: new Date()
            }]);

            // Pin the deal address as context - this shows at the top!
            const pinnedText = `${context.address} • ${context.stageLabel} • ${context.healthScore}% health`;
            console.log('[AskZena] Setting pinned context:', pinnedText);
            setPinnedContext(pinnedText);

            // Switch to assistant mode so the chat is visible!
            setAvatarMode('assistant');

            // Start Live Mode (for voice listening after Zena speaks)
            setIsConversationMode(true);

            // Auto-submit a strategy request so Zena immediately provides advice
            // The API response will be spoken via the submitQuery flow
            setTimeout(() => {
              console.log('[AskZena] Auto-submitting strategy request for immediate advice...');
              submitQuery('Give me your strategy and action plan for this deal. What should I do first?');
            }, 500);

            // Clear sessionStorage to prevent re-trigger on refresh
            sessionStorage.removeItem(STRATEGY_SESSION_KEY);

            // Clear URL params
            setSearchParams({}, { replace: true });
          } else {
            // No context found - fallback to normal conversation
            console.warn('[AskZena] Strategy session mode but no context found - starting normal conversation');
            setMessages([{
              id: `fallback-${Date.now()}`,
              role: 'assistant',
              content: "Hey, it looks like I lost the deal context. What deal would you like to discuss?",
              timestamp: new Date()
            }]);
            setSearchParams({}, { replace: true });
          }
        } catch (err) {
          console.error('[AskZena] Failed to parse strategy session context:', err);
          setMessages([{
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: "Hey, I had trouble loading the deal details. What deal would you like to discuss?",
            timestamp: new Date()
          }]);
          setSearchParams({}, { replace: true });
        }
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
    }

    // Set sidebar width for bottom navigation alignment
    document.documentElement.style.setProperty('--sidebar-width', '260px');

    return () => {
      stopSpeaking();
      document.documentElement.style.setProperty('--sidebar-width', '0px');
    };
  }, []);

  // Load messages when active conversation changes
  useEffect(() => {
    if (isInternalIdChangeRef.current) {
      console.log('[AskZena] Internal ID change detected, skipping message wipe.');
      isInternalIdChangeRef.current = false;
      return;
    }

    if (activeConversationId) {
      loadMessages(activeConversationId);
    } else {
      // Only wipe if we haven't just set a greeting/prompt
      setMessages(prev => {
        if (prev.length > 0 && prev[0].id.startsWith('greeting-')) {
          return prev;
        }
        return [];
      });
    }
  }, [activeConversationId, loadMessages]);

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

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddAttachments(e.dataTransfer.files);
    }
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


  /*
  const playTTS = async (text: string) => {
    // ... code ...
  };
  */

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
      setError(`Transcription failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

        // Prevent useEffect from wiping the local state by calling loadMessages
        isInternalIdChangeRef.current = true;

        setActiveConversationId(convId);
        setConversations(prev => [res.data.conversation, ...prev]);
      } catch (err) {
        console.error('Failed to create conversation:', err);
        return;
      }
    }

    // Process all attachments into base64 for both the UI/Persistence and the AI analysis
    const attachmentData = await Promise.all(attachments.map(async a => {
      return new Promise<{ type: string; name: string; base64: string; mimeType: string; dataUri: string }>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve({
            type: a.type,
            name: a.file.name,
            base64: base64,
            mimeType: a.file.type,
            dataUri: result
          });
        };
        reader.readAsDataURL(a.file);
      });
    }));

    if (!isMountedRef.current) return;

    const userAttachments = attachmentData.map(a => ({
      type: a.type as 'image' | 'file',
      name: a.name,
      base64: a.base64,
      url: a.type === 'image' ? a.dataUri : undefined,
      mimeType: a.mimeType
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

    // Build strategy context as a system message for conversation history
    const strategyContext = strategySessionContextRef.current;
    let conversationHistoryWithContext = messages.slice(-20).map(m => ({ role: m.role, content: m.content }));

    if (strategyContext) {
      // Prepend a system message with deal context (invisible to UI, visible to AI)
      const systemContextMessage = {
        role: 'system' as const,
        content: `[STRATEGY SESSION - DEAL CONTEXT]
You are helping the user strategize on a specific real estate deal. Here are the details:
- Property: ${strategyContext.address}
- Stage: ${strategyContext.stageLabel}
- Days in Stage: ${strategyContext.daysInStage}
- Health Score: ${strategyContext.healthScore}%
- Health Status: ${strategyContext.healthStatus}
- Primary Risk: ${strategyContext.primaryRisk}
- Risk Type: ${strategyContext.riskType}
- Coaching Insight: ${strategyContext.coachingInsight}
${strategyContext.suggestedAction ? `- Suggested Action: ${strategyContext.suggestedAction}` : ''}
${strategyContext.contactName ? `- Primary Contact: ${strategyContext.contactName}` : ''}
${strategyContext.dealValue ? `- Deal Value: $${strategyContext.dealValue.toLocaleString()}` : ''}

Provide specific, actionable coaching advice for THIS deal. Reference the property by name. Be conversational and strategic. The user has already been informed about the deal; dive straight into advice and solutions.`
      };
      conversationHistoryWithContext = [systemContextMessage, ...conversationHistoryWithContext];
      console.log('[AskZena] Including strategy context as system message for:', strategyContext.address);
    }

    try {
      const response = await api.post<{
        response: string;
        messageId: string;
        suggestedActions?: string[];
        pendingAction?: any;
      }>('/api/ask', {
        query: queryText, // User's actual query - no prepended context!
        conversationId: convId,
        attachments: attachmentData,
        conversationHistory: conversationHistoryWithContext,
        strategyContext: strategyContext || undefined
      });

      if (!isMountedRef.current) {
        console.log('[AskZena] Component unmounted during API call - aborting response processing');
        return;
      }

      // Phase 7: Handle pending action
      if (response.data.pendingAction) {
        setPendingActionData(response.data.pendingAction);
        setShowWriteConfirmation(true);
        setIsLoading(false);
        setDissolvePhase('idle');
        return;
      }

      const fullContent = response.data.response;

      // Define execution handler for one-click actions
      const handleOneClickExecute = (toolName: string, payload: any) => {
        console.log('[AskZena] One-Click Execution:', toolName);
        // Send a clear instruction to the agent to execute the tool
        const command = `Please execute ${toolName} with these parameters: ${JSON.stringify(payload)}`;
        submitQuery(command);
      };

      const chips = detectIntentAndGenerateChips(fullContent, response.data.suggestedActions as any[], handleOneClickExecute);

      const assistantMessage: Message = {
        id: response.data.messageId || (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
        chips,
      };

      setIsLoading(false);

      // Transition to Assistant mode ONLY when the response arrives if not in Live Mode
      if (!isConversationMode) {
        console.log('[AskZena] Transitioning to Assistant mode layout...');
        setAvatarMode('assistant');
      }

      // Ensure we are in speaking phase for the dissolve system
      console.log('[AskZena] Setting dissolvePhase to speaking...');
      setDissolvePhase('speaking');

      // Speak the response if in Live Mode (Hybrid Strategy Session) or if this is a strategy session
      const shouldSpeak = isConversationMode || strategySessionContextRef.current;
      if (shouldSpeak) {
        try {
          console.log('[AskZena] Speaking response in Live/Strategy Mode...');

          // SIGNAL ACTIVITY: Zena is starting to speak
          zenaSpeakingRef.current = true;
          updateActivity(false, 'strategy-response-start', false);

          const buffer = await voiceInteractionService.speak(fullContent);
          liveAudioService.setMicMuted(true);

          // Run TTS playback and text streaming CONCURRENTLY so user sees text while hearing voice
          await Promise.all([
            liveAudioService.playBuffer(buffer),
            simulateStreamingResponse(fullContent, chips)
          ]);

          liveAudioService.setMicMuted(false);

          // SIGNAL ACTIVITY: Zena finished speaking, reset inactivity timer
          zenaSpeakingRef.current = false;
          zenaHasRespondedRef.current = true; // Timer starts counting NOW
          updateActivity(false, 'strategy-response-end', true);

          // Re-enable voice listening after speaking finishes
          setTimeout(() => {
            if (isConversationMode) {
              setShowVoiceRecorder(true);
            }
          }, 500);
        } catch (err) {
          console.error('[AskZena] Failed to speak response:', err);
          zenaSpeakingRef.current = false;
          liveAudioService.setMicMuted(false);
        }
      }

      // For non-speaking mode, still do the streaming simulation
      if (!shouldSpeak) {
        await simulateStreamingResponse(fullContent, chips);
      }

      // After streaming is done, add the final message to the list
      setMessages(prev => [...prev, assistantMessage]);
      setStreamingContent('');

      console.log('[AskZena] Response flow complete.');
      loadConversations();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorMessage);
      setIsLoading(false);
      setDissolvePhase('idle');

      // Create a persistent error message in the chat
      const errorBubble: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `**Connection Error:** ${errorMessage}\n\nI had trouble reaching the Zena brain. This usually happens during a brief network interruption or server restart.`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorBubble]);
    }
  };

  const handleRetry = (messageId: string) => {
    // Find the last user message to resubmit
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      // Remove the specific error message that triggered the retry
      setMessages(prev => prev.filter(m => m.id !== messageId));
      // Re-submit the content
      submitQuery(lastUserMessage.content);
    }
  };

  const handleSubmit = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    // Manual Barge-In: If user types while Zena is talking or Live Mode is active
    if (isSpeaking || isConversationMode) {
      console.log('[AskZena] Text barge-in detected. Stopping current audio/response.');
      stopSpeaking();
      liveAudioService.clearPlayback();
      // Signal backend that user interrupted via text if in Live Mode
      if (isConversationMode) {
        realTimeDataService.sendMessage('voice.live.interrupted');
      }
    }

    console.log('[AskZena] Submitting query:', inputValue);
    submitQuery(inputValue);
  };

  const handleApproveWrite = async () => {
    if (!pendingActionData) return;

    setIsExecutingWrite(true);
    try {
      // Execute the actual navigation plan now that user has approved
      const res = await api.post<{ success: boolean; answer: string; data: any }>('/api/connections/query', {
        query: inputValue || pendingActionData.payload.note || "Execute approved action",
        domain: pendingActionData.targetSite
      });

      if (res.data.success) {
        // Add success message to chat
        const successMsg: Message = {
          id: `write-success-${Date.now()}`,
          role: 'assistant',
          content: res.data.answer || "Action successfully completed!",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, successMsg]);
        setShowWriteConfirmation(false);
        setAvatarMode('assistant');
      } else {
        setError("Action failed: " + (res.data as any).error);
      }
    } catch (err: any) {
      console.error("Write execution error:", err);
      setError("Failed to execute action. Please check your connection.");
    } finally {
      setIsExecutingWrite(false);
      setPendingActionData(null);
    }
  };

  // Render Unified Prompt
  const renderPrompt = () => (
    <div className="unified-prompt-container">
      <form className="unified-prompt-form" onSubmit={handleSubmit}>
        <div className="unified-prompt-card">
          <div className="prompt-left-actions">
            <AttachmentManager
              attachments={attachments}
              onAddAttachments={handleAddAttachments}
              onRemoveAttachment={handleRemoveAttachment}
              onPreviewAttachment={setPreviewAttachment}
            />
          </div>
          <div className="prompt-input-wrapper">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                } else if (e.key === 'Escape') {
                  stopSpeaking();
                  liveAudioService.clearPlayback();
                }
              }}
              placeholder="Ask Zena anything..."
              rows={1}
            />
          </div>
          <div className="prompt-right-actions">
            <button
              className={`prompt-action-btn voice-mode-btn ${isConversationMode ? 'active' : ''}`}
              type="button"
              onClick={() => {
                const newMode = !isConversationMode;
                // CRITICAL: If stopping, call liveAudioService.stop() IMMEDIATELY
                // Don't wait for React's state update cycle - this ensures instant audio cessation
                if (!newMode) {
                  console.log('[AskZena] STOP BUTTON CLICKED - Immediately stopping audio');
                  liveAudioService.stop();
                  // CRITICAL: Mark as manually stopped to prevent auto-restart on navigation
                  sessionStorage.setItem('zena_live_manually_stopped', 'true');
                  wasManuallyStoppedRef.current = true;
                  // Clear URL params to prevent context/mode from re-triggering
                  // DISABLED: This was causing chat history to vanish by triggering a re-mount/reset
                  // setSearchParams({}, { replace: true });
                } else {
                  // User is explicitly starting - clear the stop flag
                  sessionStorage.removeItem('zena_live_manually_stopped');
                  wasManuallyStoppedRef.current = false;
                  // RE-ENABLE AUDIO CONTEXT: Must happen inside user gesture event (Sync)
                  liveAudioService.resume();
                }
                setIsConversationMode(newMode);
              }}
              title={isConversationMode ? "Stop Zena Live" : "Start Zena Live"}
            >
              {isConversationMode ? (
                <div className="voice-mode-active-icon">
                  <span className="live-dot pulse"></span>
                </div>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 10V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M8 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M12 4V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M16 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M20 10V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>
            <button
              className="prompt-action-btn send-btn"
              type="submit"
              disabled={!inputValue.trim() || isLoading}
            >
              ➤
            </button>
          </div>
        </div>
        {error && <div className="error-toast">{error}</div>}
      </form>

      {/* Starter Prompts - Only show in Hero mode when not typing, not in strategy session AND not in Live mode */}
      {!inputValue && avatarMode === 'hero' && !isLoading && !isConversationMode && !strategySessionContextRef.current && (
        <div className="starter-prompts-container">
          {STARTER_PROMPTS.map((starter, idx) => (
            <button
              key={idx}
              className="starter-prompt-btn"
              type="button"
              onClick={() => {
                setIsConversationMode(true);
                // Small delay to ensure live mode starts before the query
                setTimeout(() => submitQuery(starter.prompt), 100);
              }}
            >
              <span className="starter-icon">{starter.icon}</span>
              <span className="starter-label">{starter.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="ask-zena-page"
      data-theme="high-tech"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drop-zone-overlay">
          <div className="drop-zone-content">
            <div className="drop-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 16L12 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M9 13L12 16L15 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M4 17L4 18C4 19.1046 4.89543 20 6 20L18 20C19.1046 20 20 19.1046 20 18L20 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h2>Drop to Attach</h2>
            <p>Release files to add them to your Zena chat</p>
          </div>
        </div>
      )}
      <AmbientBackground
        variant="default"
        showParticles={true}
        showGradientOrbs={true}
        showGrid={false}
        isThinking={dissolvePhase === 'vortex'}
      />
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onConversationSelect={handleConversationSelect}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
      />

      <main className={`ask-zena-main ${avatarMode === 'hero' ? 'hero-mode' : 'assistant-mode'} ${isConversationMode ? 'live-active' : ''}`}>
        <PinnedContextBar
          contextText={pinnedContext}
          onClear={() => setPinnedContext(null)}
        />
        {avatarMode === 'hero' && (
          <div className="hero-avatar-section">
            <div className="hero-avatar-container">
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
              <h2>How can I help you?</h2>
              {userTranscript && (
                <div className="live-user-transcript">
                  <span className="transcript-label">Zena heard:</span> {userTranscript}
                </div>
              )}
              {(isLoading || (showVoiceRecorder && !userTranscript)) && <p className="hero-status">THINKING...</p>}
              {isSpeaking && <p className="hero-status">Speaking...</p>}
            </div>
          </div>
        )}

        {/* Hero mode: Centred Unified Prompt - Only show here when NOT in live session */}
        {avatarMode === 'hero' && !isConversationMode && (
          <div className="hero-controls">
            {renderPrompt()}
          </div>
        )}

        <div className="chat-container">
          {isConversationMode && (
            <div className={`conversation-mode-indicator status-${liveConnectionStatus}`}>
              <span className={`live-dot ${liveConnectionStatus === 'connected' ? 'pulse' : ''}`}></span>
              {liveConnectionStatus === 'connecting' ? 'Connecting to Zena Live...' :
                liveConnectionStatus === 'error' ? 'Connection Error' :
                  'Hands-Free Conversation Active'}
              {userTranscript && (
                <div className="inline-live-transcript">
                  "{userTranscript}"
                </div>
              )}
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
                <MessageBubble
                  message={message}
                  onPreviewAttachment={setPreviewAttachment}
                  onRetry={handleRetry}
                  onNavigateToDeal={() => {
                    try {
                      const dealId = strategySessionContextRef.current?.dealId;
                      console.log('[AskZena] onNavigateToDeal clicked. DealID:', dealId);

                      if (dealId) {
                        // CRITICAL: Direct navigation with state is reliable.
                        console.log('[AskZena] Navigating to /deal-flow with state:', { openDealId: dealId });
                        navigate('/deal-flow', { state: { openDealId: dealId } });
                      } else {
                        console.warn('[AskZena] No dealId found in strategyContext:', strategySessionContextRef.current);
                      }
                    } catch (err) {
                      console.error('[AskZena] CRITICAL ERROR in onNavigateToDeal:', err);
                    }
                  }}
                  showBackToDeal={!!strategySessionContextRef.current && message.role === 'assistant'}
                  dealAddress={strategySessionContextRef.current?.address}
                />
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
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {streamingContent}
                      </ReactMarkdown>
                      <span className="typing-cursor">▋</span>
                    </div>

                    <div className="message-bubble-footer">
                      <button
                        className={`copy-message-btn ${copiedStreaming ? 'copied' : ''}`}
                        onClick={() => {
                          navigator.clipboard.writeText(streamingContent);
                          setCopiedStreaming(true);
                          setTimeout(() => setCopiedStreaming(false), 2000);
                        }}
                        title="Copy message text"
                      >
                        {copiedStreaming ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedStreaming ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Assistant mode OR Hero mode in Live: Fixed Unified Prompt at bottom */}
          {(avatarMode === 'assistant' || (avatarMode === 'hero' && isConversationMode)) && renderPrompt()}
        </div>

        {showVoiceRecorder && (
          <div className="voice-recorder-overlay">
            <VoiceRecorder
              onRecordingComplete={handleVoiceRecordingComplete}
              showTranscription={false}
              showEntities={false}
              autoStart={true}
              showButton={false}
              className="floating-recorder"
            />
          </div>
        )}
      </main>

      {previewAttachment && (
        <Lightbox
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      {/* Mission Status Widget (PiP) */}
      {isConversationMode && (initialUrlContextRef.current === 'optimised_day' || searchParams.get('context') === 'optimised_day') && (
        <MissionStatusWidget
          isActive={isConversationMode}
          currentTask="Mission Active"
        />
      )}

      {/* Write Confirmation Modal */}
      {showWriteConfirmation && pendingActionData && (
        <CRMWriteConfirmationModal
          isOpen={showWriteConfirmation}
          onClose={() => {
            setShowWriteConfirmation(false);
            setPendingActionData(null);
          }}
          onConfirm={handleApproveWrite}
          actionData={pendingActionData}
          isExecuting={isExecutingWrite}
        />
      )}
    </div>
  );
};

export default AskZenaPage;
