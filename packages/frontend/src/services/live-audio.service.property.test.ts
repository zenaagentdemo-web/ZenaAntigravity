
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { LiveAudioService } from './live-audio.service';

// Mock Web Audio API
const mockAudioContext = {
    state: 'suspended',
    resume: vi.fn().mockResolvedValue(undefined),
    createBufferSource: vi.fn(() => ({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null
    })),
    // Mock decodeAudioData to be instant so we don't hang
    decodeAudioData: vi.fn(() => Promise.resolve({
        duration: 1,
        numberOfChannels: 1,
        sampleRate: 44100,
        getChannelData: () => new Float32Array(100)
    })),
    createBuffer: vi.fn(() => ({
        getChannelData: vi.fn(() => new Float32Array(100))
    })),
    createGain: vi.fn(() => ({
        gain: { value: 1 },
        connect: vi.fn()
    })),
    createAnalyser: vi.fn(() => ({
        connect: vi.fn(),
        fftSize: 2048,
        frequencyBinCount: 1024,
        getFloatTimeDomainData: vi.fn()
    })),
    destination: {}
};

// Global window mock
global.window = {
    AudioContext: vi.fn(() => mockAudioContext),
    webkitAudioContext: vi.fn(() => mockAudioContext)
} as any;

global.AudioContext = vi.fn(() => mockAudioContext) as any;

describe('LiveAudioService Logic', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should maintain queue integrity: Handle incoming audio and start playback', async () => {
        await fc.assert(
            fc.asyncProperty(fc.array(fc.string({ minLength: 1 })), async (chunks) => {
                // Instatiate fresh service
                const testService = new LiveAudioService();
                (testService as any).audioContext = mockAudioContext;

                let startCount = 0;
                // Override createBufferSource to track starts
                mockAudioContext.createBufferSource.mockImplementation(() => ({
                    buffer: null,
                    connect: vi.fn(),
                    start: vi.fn(() => { startCount++; }),
                    stop: vi.fn(),
                    onended: null
                }));

                // Enqueue all
                // base64 "AAAA" is valid
                chunks.forEach(_ => {
                    testService.handleIncomingAudio('UkU='); // Valid base64
                });

                // Explicitly start playback
                // This simulates the frontend calling startQueuePlayback() which SHOULD happen
                await testService.startQueuePlayback();

                // If we added chunks, at least one should have started playing immediately
                // (Subsequent ones play on 'onended', which we aren't simulating here, but the first one counts)
                if (chunks.length > 0) {
                    expect(startCount).toBeGreaterThanOrEqual(1);
                }
            })
        );
    });

    it('should resume context if suspended when starting playback', () => {
        mockAudioContext.state = 'suspended';
        mockAudioContext.resume.mockClear();

        const testService = new LiveAudioService();
        (testService as any).audioContext = mockAudioContext;

        // Add chunk
        testService.handleIncomingAudio('UkU=');

        // Try to start
        testService.startQueuePlayback();

        // Expect resume to be called (This will FAIL currently, verifying the bug)
        // We comment it out or expect fail if we want to confirm bug?
        // Let's expect it so we see the fail.
        expect(mockAudioContext.resume).toHaveBeenCalled();
    });
});
