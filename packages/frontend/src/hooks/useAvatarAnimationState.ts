/**
 * useAvatarAnimationState - Hook for managing avatar animation state with voice reactivity
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { AvatarAnimationState } from '../components/HolographicAvatar/HolographicAvatar';
import { audioAnalyzer, AudioAnalysisData } from '../utils/AudioAnalyzer';

interface UseAvatarAnimationStateOptions {
    /** Enable voice reactivity (requires microphone permission) */
    enableVoiceReactivity?: boolean;
    /** Initial animation state */
    initialState?: AvatarAnimationState;
    /** Callback when audio data is received */
    onAudioData?: (data: AudioAnalysisData) => void;
}

interface UseAvatarAnimationStateResult {
    /** Current animation state */
    animationState: AvatarAnimationState;
    /** Set animation state manually */
    setAnimationState: (state: AvatarAnimationState) => void;
    /** Current audio amplitude (0-1) */
    amplitude: number;
    /** Whether voice reactivity is active */
    isVoiceActive: boolean;
    /** Start listening mode */
    startListening: () => Promise<boolean>;
    /** Stop listening mode */
    stopListening: () => void;
    /** Whether microphone is initialized */
    isMicrophoneReady: boolean;
    /** Audio analysis data */
    audioData: AudioAnalysisData | null;
}

export function useAvatarAnimationState(
    options: UseAvatarAnimationStateOptions = {}
): UseAvatarAnimationStateResult {
    const {
        enableVoiceReactivity = false,
        initialState = 'idle',
        onAudioData,
    } = options;

    const [animationState, setAnimationState] = useState<AvatarAnimationState>(initialState);
    const [amplitude, setAmplitude] = useState(0);
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [isMicrophoneReady, setIsMicrophoneReady] = useState(false);
    const [audioData, setAudioData] = useState<AudioAnalysisData | null>(null);

    const isListeningRef = useRef(false);
    const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Handle audio data updates
    const handleAudioData = useCallback((data: AudioAnalysisData) => {
        setAmplitude(data.amplitude);
        setAudioData(data);
        setIsVoiceActive(data.isActive);

        // Call external callback if provided
        onAudioData?.(data);

        // Update animation state based on audio
        if (isListeningRef.current) {
            if (data.isActive && data.amplitude > 0.1) {
                // User is speaking
                setAnimationState('speaking');

                // Clear any existing timeout
                if (speakingTimeoutRef.current) {
                    clearTimeout(speakingTimeoutRef.current);
                }

                // Set timeout to return to listening after silence
                speakingTimeoutRef.current = setTimeout(() => {
                    if (isListeningRef.current) {
                        setAnimationState('listening');
                    }
                }, 500);
            }
        }
    }, [onAudioData]);

    // Start listening mode
    const startListening = useCallback(async (): Promise<boolean> => {
        if (!enableVoiceReactivity) {
            console.warn('[useAvatarAnimationState] Voice reactivity is disabled');
            return false;
        }

        // Initialize microphone if not already done
        if (!audioAnalyzer.initialized) {
            const success = await audioAnalyzer.initMicrophone();
            if (!success) {
                return false;
            }
            setIsMicrophoneReady(true);
        }

        isListeningRef.current = true;
        setAnimationState('listening');
        audioAnalyzer.start(handleAudioData);

        return true;
    }, [enableVoiceReactivity, handleAudioData]);

    // Stop listening mode
    const stopListening = useCallback(() => {
        isListeningRef.current = false;
        audioAnalyzer.stop();
        setAnimationState('idle');
        setAmplitude(0);
        setIsVoiceActive(false);
        setAudioData(null);

        if (speakingTimeoutRef.current) {
            clearTimeout(speakingTimeoutRef.current);
            speakingTimeoutRef.current = null;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            audioAnalyzer.stop();
            if (speakingTimeoutRef.current) {
                clearTimeout(speakingTimeoutRef.current);
            }
        };
    }, []);

    return {
        animationState,
        setAnimationState,
        amplitude,
        isVoiceActive,
        startListening,
        stopListening,
        isMicrophoneReady,
        audioData,
    };
}
