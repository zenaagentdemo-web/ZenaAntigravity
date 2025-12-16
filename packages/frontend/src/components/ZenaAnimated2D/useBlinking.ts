import { useState, useEffect, useRef, useCallback } from 'react';
import { EyeState, ANIMATION_TIMING } from './constants';

interface BlinkingState {
    eyeState: EyeState;
    isBlinking: boolean;
}

interface UseBlinkingOptions {
    enabled?: boolean;
}

/**
 * Hook for automatic eye blinking animation
 * Blinks randomly every 2-6 seconds
 */
export function useBlinking({ enabled = true }: UseBlinkingOptions = {}): BlinkingState {
    const [eyeState, setEyeState] = useState<EyeState>('open');
    const [isBlinking, setIsBlinking] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const blinkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Get random interval for next blink
    const getRandomBlinkInterval = useCallback(() => {
        const { min, max } = ANIMATION_TIMING.blinkInterval;
        return Math.random() * (max - min) + min;
    }, []);

    // Perform a blink
    const blink = useCallback(() => {
        if (!enabled) return;

        setIsBlinking(true);
        setEyeState('closed');

        // Open eyes after blink duration
        blinkTimeoutRef.current = setTimeout(() => {
            setEyeState('open');
            setIsBlinking(false);

            // Schedule next blink
            timeoutRef.current = setTimeout(blink, getRandomBlinkInterval());
        }, ANIMATION_TIMING.blinkDuration);
    }, [enabled, getRandomBlinkInterval]);

    // Start/stop blinking based on enabled state
    useEffect(() => {
        if (enabled) {
            // Start first blink after random delay
            timeoutRef.current = setTimeout(blink, getRandomBlinkInterval());
        } else {
            setEyeState('open');
            setIsBlinking(false);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (blinkTimeoutRef.current) {
                clearTimeout(blinkTimeoutRef.current);
            }
        };
    }, [enabled, blink, getRandomBlinkInterval]);

    return { eyeState, isBlinking };
}
