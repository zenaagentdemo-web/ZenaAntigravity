import { useState, useEffect, useCallback, useRef } from 'react';
import { Viseme, AMPLITUDE_THRESHOLDS } from './constants';

interface LipSyncState {
    currentViseme: Viseme;
    amplitude: number;
    isActive: boolean;
}

interface UseLipSyncOptions {
    audioElement: HTMLAudioElement | null;
    enabled?: boolean;
}

/**
 * Hook for real-time lip sync based on audio analysis
 * Analyzes audio amplitude and frequency to determine mouth shape
 */
export function useLipSync({ audioElement, enabled = true }: UseLipSyncOptions): LipSyncState {
    const [currentViseme, setCurrentViseme] = useState<Viseme>('rest');
    const [amplitude, setAmplitude] = useState(0);
    const [isActive, setIsActive] = useState(false);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

    // Map amplitude to viseme
    const getVisemeFromAmplitude = useCallback((amp: number): Viseme => {
        if (amp < AMPLITUDE_THRESHOLDS.silent) return 'rest';
        if (amp < AMPLITUDE_THRESHOLDS.quiet) return 'mm';
        if (amp < AMPLITUDE_THRESHOLDS.medium) return 'ee';
        if (amp < AMPLITUDE_THRESHOLDS.loud) return 'aa';
        return 'oh';
    }, []);

    // Analyze audio and update viseme
    const analyze = useCallback(() => {
        if (!analyserRef.current || !dataArrayRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArrayRef.current);

        // Calculate average amplitude
        const sum = dataArrayRef.current.reduce((a, b) => a + b, 0);
        const avg = sum / dataArrayRef.current.length / 255; // Normalize to 0-1

        setAmplitude(avg);
        setCurrentViseme(getVisemeFromAmplitude(avg));
        setIsActive(avg > AMPLITUDE_THRESHOLDS.silent);

        animationFrameRef.current = requestAnimationFrame(analyze);
    }, [getVisemeFromAmplitude]);

    // Setup audio analysis
    useEffect(() => {
        if (!audioElement || !enabled) {
            setCurrentViseme('rest');
            setAmplitude(0);
            setIsActive(false);
            return;
        }

        // Create audio context on first interaction
        const setupAudio = () => {
            if (audioContextRef.current) return;

            try {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = 256;
                analyserRef.current.smoothingTimeConstant = 0.8;

                const bufferLength = analyserRef.current.frequencyBinCount;
                dataArrayRef.current = new Uint8Array(bufferLength);

                // Connect audio element to analyser
                sourceRef.current = audioContextRef.current.createMediaElementSource(audioElement);
                sourceRef.current.connect(analyserRef.current);
                analyserRef.current.connect(audioContextRef.current.destination);
            } catch (error) {
                console.error('Error setting up audio analysis:', error);
            }
        };

        // Start analysis when audio plays
        const handlePlay = () => {
            setupAudio();
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
            analyze();
        };

        // Stop analysis when audio pauses/ends
        const handlePause = () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            setCurrentViseme('rest');
            setAmplitude(0);
            setIsActive(false);
        };

        audioElement.addEventListener('play', handlePlay);
        audioElement.addEventListener('pause', handlePause);
        audioElement.addEventListener('ended', handlePause);

        // If already playing, start analyzing
        if (!audioElement.paused) {
            handlePlay();
        }

        return () => {
            audioElement.removeEventListener('play', handlePlay);
            audioElement.removeEventListener('pause', handlePause);
            audioElement.removeEventListener('ended', handlePause);

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [audioElement, enabled, analyze]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    return { currentViseme, amplitude, isActive };
}
