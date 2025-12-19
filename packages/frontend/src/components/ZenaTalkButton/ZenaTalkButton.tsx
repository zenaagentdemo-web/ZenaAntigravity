import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import './ZenaTalkButton.css';

export type TalkButtonState = 'idle' | 'listening' | 'processing';

export interface ZenaTalkButtonProps {
    /** Callback when recording is complete */
    onRecordingComplete: (audioBlob: Blob) => void;
    /** Callback for audio level changes during recording (0-1) */
    onAudioLevelChange?: (level: number) => void;
    /** Whether the button is disabled */
    disabled?: boolean;
    /** Additional CSS class */
    className?: string;
}

/**
 * ZenaTalkButton - High-tech tap-to-talk voice input button
 * 
 * Features:
 * - Hold-to-talk interaction
 * - Visual state indicators (idle, listening, processing)
 * - Audio waveform visualization
 * - Recording duration display
 */
export const ZenaTalkButton: React.FC<ZenaTalkButtonProps> = memo(({
    onRecordingComplete,
    onAudioLevelChange,
    disabled = false,
    className = '',
}) => {
    const [state, setState] = useState<TalkButtonState>('idle');
    const [audioLevel, setAudioLevel] = useState(0);
    const [duration, setDuration] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopRecording(false);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    const visualizeAudio = useCallback(() => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

        const updateLevel = () => {
            if (!analyserRef.current) return;

            analyserRef.current.getByteFrequencyData(dataArray);

            // Calculate average audio level
            const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            const normalizedLevel = Math.min(1, average / 255);

            setAudioLevel(normalizedLevel);
            onAudioLevelChange?.(normalizedLevel);

            animationFrameRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel();
    }, [onAudioLevelChange]);

    const startRecording = useCallback(async () => {
        if (disabled || state !== 'idle') return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Audio context for visualization
            audioContextRef.current = new AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);
            analyserRef.current.fftSize = 256;

            // Start visualizing
            visualizeAudio();

            // Media recorder
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setState('processing');

                // Simulate processing delay, then complete
                setTimeout(() => {
                    onRecordingComplete(audioBlob);
                    setState('idle');
                }, 500);
            };

            mediaRecorder.start();
            setState('listening');
            startTimeRef.current = Date.now();

            // Duration counter
            durationIntervalRef.current = setInterval(() => {
                if (startTimeRef.current) {
                    setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
                }
            }, 100);

        } catch (error) {
            console.error('Failed to start recording:', error);
            setState('idle');
        }
    }, [disabled, state, visualizeAudio, onRecordingComplete]);

    const stopRecording = useCallback((triggerComplete = true) => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            if (triggerComplete) {
                mediaRecorderRef.current.stop();
            }
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        setAudioLevel(0);
        setDuration(0);
        startTimeRef.current = null;
        onAudioLevelChange?.(0);
    }, [onAudioLevelChange]);

    const handleMouseDown = useCallback(() => {
        if (!disabled && state === 'idle') {
            startRecording();
        }
    }, [disabled, state, startRecording]);

    const handleMouseUp = useCallback(() => {
        if (state === 'listening') {
            stopRecording(true);
        }
    }, [state, stopRecording]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        handleMouseDown();
    }, [handleMouseDown]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        handleMouseUp();
    }, [handleMouseUp]);

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const containerClasses = [
        'zena-talk-button',
        `zena-talk-button--${state}`,
        disabled ? 'zena-talk-button--disabled' : '',
        className,
    ].filter(Boolean).join(' ');

    // Generate waveform bars
    const waveformBars = Array.from({ length: 12 }, (_, i) => {
        const variance = 0.3 + Math.random() * 0.7;
        const height = state === 'listening' ? Math.max(15, audioLevel * 100 * variance) : 15;
        return <div key={i} className="zena-talk-button__bar" style={{ height: `${height}%` }} />;
    });

    return (
        <div className={containerClasses}>
            {/* Glow effect */}
            <div className="zena-talk-button__glow" />

            {/* Main button */}
            <button
                type="button"
                className="zena-talk-button__button"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                disabled={disabled || state === 'processing'}
                aria-label={
                    state === 'idle' ? 'Hold to talk' :
                        state === 'listening' ? 'Release to send' :
                            'Processing...'
                }
            >
                {/* Microphone Icon / State Indicator */}
                <div className="zena-talk-button__icon-wrapper">
                    {state === 'processing' ? (
                        <div className="zena-talk-button__spinner" />
                    ) : (
                        <svg
                            className="zena-talk-button__mic-icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                    )}
                </div>

                {/* Recording indicator */}
                {state === 'listening' && (
                    <div className="zena-talk-button__recording-dot" />
                )}
            </button>

            {/* Waveform visualization */}
            {state === 'listening' && (
                <div className="zena-talk-button__waveform">
                    {waveformBars}
                </div>
            )}

            {/* Label */}
            <span className="zena-talk-button__label">
                {state === 'idle' && 'Hold to talk'}
                {state === 'listening' && formatDuration(duration)}
                {state === 'processing' && 'Processing...'}
            </span>
        </div>
    );
});

ZenaTalkButton.displayName = 'ZenaTalkButton';

export default ZenaTalkButton;
