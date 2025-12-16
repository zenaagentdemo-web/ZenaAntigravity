
import { renderHook } from '@testing-library/react';
import { useKeyboardNavigation } from './useKeyboardNavigation';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

describe('useKeyboardNavigation Crash Handling', () => {
    const originalSpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    beforeEach(() => {
        // Mock window properties if they don't exist (JSDOM)
        Object.defineProperty(window, 'SpeechRecognition', {
            writable: true,
            value: undefined
        });
        Object.defineProperty(window, 'webkitSpeechRecognition', {
            writable: true,
            value: undefined
        });
    });

    afterEach(() => {
        // Restore
        if (originalSpeechRecognition) {
            (window as any).SpeechRecognition = originalSpeechRecognition;
        } else {
            (window as any).SpeechRecognition = undefined;
            (window as any).webkitSpeechRecognition = undefined;
        }
    });

    it('should not crash if SpeechRecognition throws error during initialization', () => {
        // Simulate a broken browser environment where SpeechRecognition exists but throws on new()
        const MockSpeechRecognition = vi.fn().mockImplementation(() => {
            throw new Error('SpeechRecognition not supported in this context');
        });

        (window as any).SpeechRecognition = MockSpeechRecognition;

        expect(() => {
            renderHook(() => useKeyboardNavigation({ enableVoiceCommands: true }));
        }).not.toThrow();
    });

    it('should gracefully handle malformed SpeechRecognition API', () => {
        // Simulate environment where it's defined but not a constructor
        (window as any).SpeechRecognition = {};

        expect(() => {
            renderHook(() => useKeyboardNavigation({ enableVoiceCommands: true }));
        }).not.toThrow();
    });
});
