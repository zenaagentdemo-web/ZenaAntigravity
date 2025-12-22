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
  Attachment,
  ActionChip,
  PinnedContextBar
} from '../../components/AskZena';
import { Lightbox } from '../../components/AskZena/Lightbox';
import { voiceInteractionService } from '../../services/voice-interaction.service';
import { AmbientBackground } from '../../components/AmbientBackground/AmbientBackground';
import { liveAudioService } from '../../services/live-audio.service';
import { realTimeDataService } from '../../services/realTimeDataService';
import './AskZenaPage.css';
import './TapToTalkButton.css';
import { decodeHTMLEntities } from '../../utils/text-utils';
import { TranscriptionMerger } from '../../utils/transcription/transcription-merger';

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
  const [previewAttachment, setPreviewAttachment] = useState<any | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [pinnedContext, setPinnedContext] = useState<string | null>(null);
  const [avatarMode, setAvatarMode] = useState<'hero' | 'assistant'>('hero');
  const [dissolvePhase, setDissolvePhase] = useState<DissolvePhase>('idle');
  const [userTranscript, setUserTranscript] = useState('');
  const [liveConnectionStatus, setLiveConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const hasAutoSubmitted = useRef(false);
  const activeConversationIdRef = useRef<string | undefined>(activeConversationId);
  const isInternalIdChangeRef = useRef(false);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dragCounterRef = useRef(0);
  const userMergerRef = useRef(new TranscriptionMerger());
  const currentUtteranceIdRef = useRef<string | null>(null);

  // Sync ref with state
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
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

  const detectIntentAndGenerateChips = useCallback((text: string, backendActions: string[] = []) => {
    const chips: ActionChip[] = [];
    text = text.toLowerCase();

    // Check both text and backend-suggested actions
    const hasAction = (term: string, actionId?: string) =>
      text.includes(term) || (actionId && backendActions.includes(actionId));

    if (hasAction('pin', 'pin_address')) {
      chips.push({
        label: "Pin Address",
        icon: "📍",
        onClick: () => {
          setPinnedContext("Auckland CBD");
          console.log("Pinning address...");
        }
      });
    }

    if (hasAction('email', 'draft_email')) {
      chips.push({
        label: "Draft Email",
        icon: "✉️",
        onClick: async () => {
          try {
            await api.post('/api/tools/draft-email', {
              to: "client@example.com",
              subject: "Property Update",
              body: "Hi, following up on our viewing..."
            });
            alert("Draft created in Outlook!");
          } catch (err) {
            console.error("Failed to draft email", err);
          }
        }
      });
    }

    if (hasAction('report', 'generate_report')) {
      chips.push({
        label: "Market Report",
        icon: "📊",
        onClick: async () => {
          try {
            await api.post('/api/tools/generate-report', { type: "market-update" });
            alert("Market report generated!");
          } catch (err) {
            console.error("Failed to generate report", err);
          }
        }
      });
    }

    if (hasAction('calendar', 'add_calendar')) {
      chips.push({
        label: "Schedule Viewing",
        icon: "🗓️",
        onClick: () => console.log("Scheduling via API...")
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
      const response = await api.get<{ conversation: { messages: Message[] } }>(`/api/history/${id}`);
      setMessages(response.data.conversation.messages || []);
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

  // STABLE UPDATE HELPER - moved to component level
  const updateActivity = useCallback((isUser: boolean = true, reason: string = 'unknown', shouldResetAsked: boolean = true) => {
    lastActivityRef.current = Date.now();

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

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let unsubscribeUser: (() => void) | null = null;

    console.log('[AskZena] Inactivity Effect STARTED');

    if (isConversationMode) {
      console.log('[AskZena] Entering Live Mode...');
      setDissolvePhase('vortex'); // Vortex phase during live connection

      // RESET SESSION STATE
      zenaHasRespondedRef.current = false;
      zenaAskedRef.current = false;
      updateActivity(false, 'start-live-init'); // Sets lastActivityRef.current to now

      // Async setup for Live Mode
      const startLiveMode = async () => {
        setLiveConnectionStatus('connecting');
        // Ensure WebSocket is connected first
        const connected = await realTimeDataService.ensureConnection();
        if (!connected) {
          console.error('[AskZena] Failed to establish WebSocket connection');
          setError('Failed to connect to Zena Live. Please refresh and try again.');
          setLiveConnectionStatus('error');
          console.log('[AskZena] Setting isConversationMode to false due to CONNECTION FAILURE');
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
            // ... (Logic for final turn remains mostly the same, ensuring timer is cleared) ...
            if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);

            // Zena finished speaking - reset timer NOW
            zenaSpeakingRef.current = false;
            updateActivity(false, 'zena-transcript', true);

            const finalContent = decodeHTMLEntities(liveTranscriptBufferRef.current.trim());
            console.log('[AskZena] Finalizing Zena transcript, content:', finalContent.substring(0, 50), '...');

            if (finalContent) {
              // FIRST: Add user message if we have buffered user transcript
              const userText = userTranscriptBufferRef.current.trim();
              if (userText) {
                console.log('[AskZena] Adding user message from buffer:', userText.substring(0, 50), '...');
                const tempId = `user-voice-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

                // Add initial message immediately for responsiveness
                setMessages(prev => [
                  ...prev,
                  { id: tempId, role: 'user', content: userText, timestamp: new Date() }
                ]);

                // Fire off cleanup request in background
                console.log('[AskZena] Requesting transcript cleanup for:', userText);
                api.post<{ text: string }>('/api/ask/cleanup', { text: userText })
                  .then(res => {
                    const cleaned = res.data.text;
                    console.log('[AskZena] Cleanup API response:', cleaned);
                    if (cleaned && cleaned !== userText) {

                      // Update UI with cleaned text using functional update to ensure fresh state
                      setMessages(currentMessages => {
                        const updated = currentMessages.map(m =>
                          m.id === tempId ? { ...m, content: cleaned } : m
                        );
                        return updated;
                      });

                      // Save CLEANED interaction
                      saveVoiceInteractionFn('user', cleaned);
                    } else {
                      saveVoiceInteractionFn('user', userText);
                    }
                  })
                  .catch(err => {
                    console.error('[AskZena] Cleanup failed:', err);
                    saveVoiceInteractionFn('user', userText);
                  });

                userTranscriptBufferRef.current = ''; // Clear buffer
              }

              // THEN: Add Zena's response
              const chips = detectIntentAndGenerateChips(finalContent);
              setMessages(prev => [
                ...prev,
                { id: `zena-voice-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, role: 'assistant', content: finalContent, chips, timestamp: new Date() }
              ]);
              saveVoiceInteractionFn('assistant', finalContent);
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
          } else {
            // Zena started speaking (interim)

            // SILENCE BUFFER LOGIC:
            // If this is the FIRST chunk of a new response, disable immediate playback
            if (!zenaSpeakingRef.current && text.length > 0) {
              console.log('[AskZena] Zena attempting to speak. Buffering for 200ms...');

              // Start a timer. If user doesn't interrupt, we start playback.
              if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);

              playbackTimerRef.current = setTimeout(() => {
                console.log('[AskZena] Silence buffer passed. Allowing Zena to speak.');
                zenaSpeakingRef.current = true;
                updateActivity(false, 'zena-speaking-start', false);
                liveAudioService.startQueuePlayback();
                setDissolvePhase('speaking');

                // Force assistant mode if Zena starts talking
                // if (avatarMode === 'hero') setAvatarMode('assistant');

                // Reset asked-state logic matches existing flow
                if (liveTranscriptBufferRef.current.length < 50) {
                  zenaAskedRef.current = false;
                }
              }, 100); // 100ms delay
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
          console.log('[AskZena] User transcript received:', text, 'Final:', isFinal);

          // INTERRUPTION LOGIC:
          // User spoke! If Zena was buffering, CANCEL HER.
          if (playbackTimerRef.current) {
            console.log('[AskZena] User interrupted silence buffer! Cancelling Zena response.');
            clearTimeout(playbackTimerRef.current);
            playbackTimerRef.current = null;
            liveAudioService.clearPlayback(); // Discard buffered audio
            liveTranscriptBufferRef.current = ''; // Discard buffered text
            setStreamingContent('');
            // We successfully prevented Zena from speaking/interrupting!
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
          // CRITICAL: Gemini sends INCREMENTAL transcripts (one word/phrase at a time)
          // Must APPEND with smart spacing between chunks
          if (text.trim().length > 0) {
            // Removed manual spacing logic to prevent "He llo" issues.
            // Gemini typically handles spacing, and our backend cleanup handles the rest.
            const buffer = userTranscriptBufferRef.current;
            userTranscriptBufferRef.current = buffer + text;
            console.log('[AskZena] User buffer APPENDED:', userTranscriptBufferRef.current.substring(0, 100));
          }

          // We don't add to chat here - that happens when Zena finishes (turn_complete)
          // This ensures proper ordering: user message first, then Zena's response
        });


        // Start inactivity timer
        inactivityTimeoutRef.current = setInterval(() => {
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

            // FIX: Verbally say the prompt using local TTS
            const promptText = 'Zena is checking if you need anything else...';

            (async () => {
              try {
                const buffer = await voiceInteractionService.speak(promptText);
                liveAudioService.setMicMuted(true);
                // TIMING FIX: Await the prompt finishing before starting the Stage 2 (5s) countdown
                await liveAudioService.playBuffer(buffer);
                console.log('[AskZena] Check-in prompt finished - Stage 2 countdown starting');
                lastActivityRef.current = Date.now();
                liveAudioService.setMicMuted(false);
              } catch (err) {
                console.error('[AskZena] Inactivity prompt failed:', err);
                liveAudioService.setMicMuted(false);
                lastActivityRef.current = Date.now();
              }
            })();

            // Also add a local placeholder so the user sees Zena is trying to help
            setMessages(prev => [
              ...prev,
              { id: `inactivity-${Date.now()}`, role: 'assistant', content: promptText, timestamp: new Date() }
            ]);
          }
          else if (inactiveTime > 10000 && zenaAskedRef.current) {
            console.log('[AskZena] 10s passed after check-in (20s total) - deactivating');
            // 10 seconds after asking - still no response, deactivate
            setIsConversationMode(false);
            if (inactivityTimeoutRef.current) clearInterval(inactivityTimeoutRef.current);
          }
        }, 1000);

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

          await liveAudioService.start((level, isPlayback) => {
            setAudioLevel(level);

            // IF Zena is speaking (isPlayback), it counts as activity to prevent timeout interruption
            if (isPlayback && level > 0.05) {
              // Keep session alive while Zena is speaking, but do NOT reset asked-state
              updateActivity(false, 'zena-playback', false);
            }
            // NOTE: We do NOT reset inactivity on raw audio level anymore.
            // Only TRANSCRIBED user speech (via onUserTranscript) resets the timer.
            // This prevents ambient noise from keeping the session alive forever.
          }, messages, location); // Pass messages as history context and location
          setLiveConnectionStatus('connected');
        } catch (err: any) {
          console.error('[AskZena] Live Mode failed:', err);
          setError(`Live Mode failed: ${err.message}`);
          setLiveConnectionStatus('error');
          console.log('[AskZena] Setting isConversationMode to false due to LIVE MODE START ERROR');
          setIsConversationMode(false);
        }
      };

      startLiveMode();
    } else {
      console.log('[AskZena] Exiting Live Mode...');
      if (inactivityTimeoutRef.current) clearInterval(inactivityTimeoutRef.current);
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
      console.log('[AskZena] Inactivity Effect CLEANUP');
      if (unsubscribe) unsubscribe();
      if (unsubscribeUser) unsubscribeUser();
      if (inactivityTimeoutRef.current) clearInterval(inactivityTimeoutRef.current);
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue, avatarMode]); // Run when value OR mode changes

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
      setMessages([]);
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
    try {
      const response = await api.post<{ response: string; messageId: string; suggestedActions?: string[] }>('/api/ask', {
        query: queryText,
        conversationId: convId,
        attachments: attachmentData,
        conversationHistory: messages.slice(-20).map(m => ({ role: m.role, content: m.content }))
      });

      const fullContent = response.data.response;
      const chips = detectIntentAndGenerateChips(fullContent, response.data.suggestedActions);

      const assistantMessage: Message = {
        id: response.data.messageId || (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
        chips,
      };

      setIsLoading(false);

      // Transition to Assistant mode ONLY when the response arrives
      console.log('[AskZena] Transitioning to Assistant mode layout...');

      setAvatarMode('assistant');

      // Ensure we are in speaking phase for the dissolve system
      console.log('[AskZena] Setting dissolvePhase to speaking...');
      setDissolvePhase('speaking');

      // (User requested mute for written responses)
      // playTTS(fullContent);

      // Simulate real-time word-by-word streaming in the chat bubble
      await simulateStreamingResponse(fullContent, chips);

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
                setIsConversationMode(newMode);
                // REMOVED: Force assistant mode when starting live
                // This allows Zena to start in Hero mode
                // if (newMode && avatarMode === 'hero') {
                //   setAvatarMode('assistant');
                // }
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

      <main className={`ask-zena-main ${avatarMode === 'hero' ? 'hero-mode' : 'assistant-mode'}`}>
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

        {/* Hero mode: Centered Unified Prompt */}
        {avatarMode === 'hero' && (
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
                      {streamingContent}
                      <span className="typing-cursor">▋</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Assistant mode: Fixed Unified Prompt at bottom */}
          {avatarMode === 'assistant' && renderPrompt()}
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
    </div>
  );
};
