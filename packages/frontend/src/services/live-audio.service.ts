/**
 * Live Audio Service - REBUILT FROM SCRATCH
 * Clean implementation for Gemini Live API audio streaming
 */

import { realTimeDataService } from './realTimeDataService';

class LiveAudioService {
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private scriptProcessor: ScriptProcessorNode | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;
    private isActive = false;
    private isStopping = false; // Prevents race conditions during shutdown
    private currentSessionId = 0; // Tracks unique start attempts to prevent zombie sessions
    private lastInterruptionTime = 0;
    private onAudioLevelCallback: ((level: number, isPlayback: boolean) => void) | null = null;
    private isMicMuted = false;

    // CRITICAL: Hard stop flag - once set, absolutely NO audio processing until explicitly reset
    private hardStopped = false;
    private lastStopTime = 0;

    // Audio playback
    private playbackQueue: Float32Array[] = [];
    private isPlaying = false;
    private currentSource: AudioBufferSourceNode | null = null;

    /**
    * Start live audio session
    */
    /**
     * Check if the service is currently hard-stopped (kill switch active)
     */
    isHardStopped(): boolean {
        return this.hardStopped;
    }

    async start(onAudioLevel?: (level: number, isPlayback: boolean) => void, history?: any[], location?: { lat: number, lng: number }, context?: string): Promise<void> {
        // Generate a unique session ID for this start attempt
        const sessionId = ++this.currentSessionId;
        console.log(`[LiveAudio] Starting session ${sessionId}...`);

        // CRITICAL: Reset the hard stop flag ONLY when explicitly starting a new session
        this.hardStopped = false;

        // Ensure any previous session is fully cleaned up before starting a new one
        if (this.isActive || this.isStopping) {
            console.log(`[LiveAudio][${sessionId}] Old session active/stopping, forcing cleanup before restart...`);
            this.cleanup();
        }

        // Reset stopping flag for new session
        this.isStopping = false;
        this.onAudioLevelCallback = onAudioLevel || null;

        try {
            // PARALLEL INITIALIZATION: Start mic and backend connection simultaneously
            console.log('[LiveAudio] Requesting session start with history:', history?.length || 0, 'location:', !!location, 'context:', context);
            realTimeDataService.sendMessage('voice.live.start', { history, location, context });

            // Start mic acquisition immediately (don't wait for backend)
            const micPromise = navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });

            // Wait for connection AND mic in parallel
            const [, mediaStream] = await Promise.all([
                this.waitForConnection(10000),
                micPromise
            ]);

            // RACE CONDITION CHECK: If stop() was called or a NEW start() was initiated while we were waiting, abort!
            if (this.isStopping || sessionId !== this.currentSessionId) {
                console.warn(`[LiveAudio][${sessionId}] Start aborted - session invalidated during initialization (isStopping=${this.isStopping})`);

                // Critical cleanup: if we got a media stream, but the session was cancelled, stop its tracks immediately
                if (mediaStream) {
                    mediaStream.getTracks().forEach(t => t.stop());
                }
                return;
            }

            this.mediaStream = mediaStream;
            console.log('[LiveAudio] Session connected AND mic ready, starting audio capture...');

            // Create AudioContext at default sample rate (usually 48kHz)
            this.audioContext = new AudioContext();
            const nativeSampleRate = this.audioContext.sampleRate;
            console.log('[LiveAudio] AudioContext sampleRate:', nativeSampleRate);

            // Create audio processing pipeline
            this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
            // Reverted buffer size back to 4096 for stability (1024 was causing echo-trigger interruptions)
            this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

            // Process audio chunks
            this.scriptProcessor.onaudioprocess = (event) => {
                // STOP CHECK: Immediately exit if stopping, muted, or HARD STOPPED
                if (!this.isActive || this.isMicMuted || this.isStopping || this.hardStopped) return;

                const inputData = event.inputBuffer.getChannelData(0);

                // Calculate audio level for UI
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) {
                    sum += inputData[i] * inputData[i];
                }
                const rms = Math.sqrt(sum / inputData.length);
                if (this.onAudioLevelCallback) {
                    this.onAudioLevelCallback(rms * 100, false);
                }

                // Resample from native rate to 16kHz for Gemini
                const resampled = this.resample(inputData, nativeSampleRate, 16000);

                // Convert to Int16 PCM
                const pcm = this.float32ToInt16(resampled);

                // Convert to base64 and send
                const base64 = this.arrayBufferToBase64(pcm.buffer);
                realTimeDataService.sendMessage('voice.live.chunk', { data: base64 });
            };

            // Connect the pipeline
            this.sourceNode.connect(this.scriptProcessor);
            this.scriptProcessor.connect(this.audioContext.destination);

            this.isActive = true;
            console.log('[LiveAudio] Started');

        } catch (error) {
            console.error('[LiveAudio] Failed to start:', error);
            this.cleanup();
            throw error;
        }
    }


    /**
     * Stop live audio session
     */
    stop(): void {
        // CRITICAL: Set HARD STOP first - this is the absolute kill switch
        this.hardStopped = true;
        this.lastStopTime = Date.now();
        this.isStopping = true;
        this.currentSessionId++; // Invalidate any pending starts
        console.log(`[LiveAudio] HARD STOPPING session (ID: ${this.currentSessionId}, time: ${this.lastStopTime})...`);
        realTimeDataService.sendMessage('voice.live.stop');
        this.cleanup();
    }

    /**
     * Clear playback queue and stop current audio (for barge-in/interruption)
     */
    clearPlayback(): void {
        console.log('[LiveAudio] Clearing playback (interrupted)');
        this.lastInterruptionTime = Date.now();
        this.playbackQueue = [];
        if (this.currentSource) {
            try {
                this.currentSource.stop();
            } catch (e) {
                // Ignore - may already be stopped
            }
            this.currentSource = null;
        }
        this.isPlaying = false;
        if (this.onAudioLevelCallback) {
            this.onAudioLevelCallback(0, false);
        }
    }

    /**
     * Proactively stop playback (used when frontend detects user is talking)
     */
    proactiveStop(): void {
        if (this.isPlaying) {
            console.log('[LiveAudio] PROACTIVE STOP - User loudness detected');
            this.clearPlayback();
        }
    }

    /**
     * Set microphone muted state (prevents sending chunks to Gemini)
     */
    setMicMuted(muted: boolean): void {
        console.log(`[LiveAudio] Mic ${muted ? 'MUTED' : 'UNMUTED'}`);
        this.isMicMuted = muted;
    }

    /**
     * Play a raw audio buffer (e.g. from TTS)
     */
    async playBuffer(arrayBuffer: ArrayBuffer): Promise<void> {
        if (!this.audioContext) {
            this.audioContext = new AudioContext();
        }

        try {
            const buffer = await this.audioContext.decodeAudioData(arrayBuffer);
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;

            // Add Analyser for level reporting during local playback
            const analyser = this.audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyser.connect(this.audioContext.destination);

            this.currentSource = source;
            this.isPlaying = true;

            // Periodically report levels during local playback
            const reportInterval = setInterval(() => {
                if (!this.isPlaying || this.currentSource !== source) {
                    clearInterval(reportInterval);
                    return;
                }
                const dataArray = new Float32Array(analyser.frequencyBinCount);
                analyser.getFloatTimeDomainData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i] * dataArray[i];
                }
                const rms = Math.sqrt(sum / dataArray.length);
                if (this.onAudioLevelCallback) {
                    this.onAudioLevelCallback(rms * 10, true); // Boost for UI visibility
                }
            }, 50);

            return new Promise((resolve) => {
                source.onended = () => {
                    clearInterval(reportInterval);
                    if (this.currentSource === source) {
                        this.currentSource = null;
                        this.isPlaying = false;
                        if (this.onAudioLevelCallback) this.onAudioLevelCallback(0, false);
                    }
                    resolve();
                };
                source.start();
            });
        } catch (e) {
            console.error('[LiveAudio] Failed to play buffer:', e);
        }
    }

    /**
     * Wait for voice.live.connected message from backend
     */
    private waitForConnection(timeoutMs: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                unsubscribe();
                reject(new Error('Connection timeout'));
            }, timeoutMs);

            // Create a one-time message handler
            const handleMessage = (event: MessageEvent) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'voice.live.connected') {
                        clearTimeout(timeout);
                        unsubscribe();
                        resolve();
                    } else if (data.type === 'voice.live.error') {
                        clearTimeout(timeout);
                        unsubscribe();
                        reject(new Error(data.payload?.error || 'Connection failed'));
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            };

            // Subscribe to WebSocket messages
            const ws = (realTimeDataService as any).ws as WebSocket;
            if (ws) {
                ws.addEventListener('message', handleMessage);
            }

            const unsubscribe = () => {
                if (ws) {
                    ws.removeEventListener('message', handleMessage);
                }
            };
        });
    }

    /**
     * Handle incoming audio from Gemini
     */
    handleIncomingAudio(base64Data: string): void {
        // CRITICAL: Block ALL audio processing if hard stopped
        if (this.hardStopped) {
            // Silently drop the packet - don't even log to avoid spam
            return;
        }

        if (!this.audioContext) {
            console.warn('[LiveAudio] No AudioContext for playback');
            return;
        }

        // DANGER: Washout period. Ignore chunks arriving immediately after an interruption
        // to prevent stale network packets from "restarting" the audio.
        if (Date.now() - this.lastInterruptionTime < 500) {
            console.log('[LiveAudio] Ignoring late audio chunk (within 500ms washout)');
            return;
        }

        try {
            // Decode base64 to ArrayBuffer
            const arrayBuffer = this.base64ToArrayBuffer(base64Data);
            const int16Data = new Int16Array(arrayBuffer);
            const float32Data = this.int16ToFloat32(int16Data);

            // Add to playback queue but DO NOT automatically start playing
            // The Frontend will control when to start playing (to add delay)
            this.playbackQueue.push(float32Data);

            // CHANGED: We removed the auto path here. Frontend must call .playNextChunk() or .startQueuePlayback()
        } catch (error) {
            console.error('[LiveAudio] Error processing incoming audio:', error);
        }
    }

    /**
     * Start playing the queued audio
     */
    startQueuePlayback(): void {
        if (!this.isPlaying && this.playbackQueue.length > 0) {
            this.playNextChunk();
        }
    }

    /**
     * Check if audio is currently playing
     */
    isAudioPlaying(): boolean {
        return this.isPlaying;
    }

    /**
     * Get current queue length
     */
    getQueueLength(): number {
        return this.playbackQueue.length;
    }


    // ============ Private Methods ============

    private cleanup(): void {
        this.isActive = false;
        this.isMicMuted = false;
        // DO NOT reset isStopping here - wait until next start() to ensure no stray chunks are processed

        console.log('[LiveAudio] Cleanup started');

        // CRITICAL: Stop media tracks FIRST - this tells the browser we're done recording
        // The browser's recording indicator won't clear until tracks are stopped
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => {
                track.enabled = false; // Disable first (faster indicator removal)
                track.stop(); // Then fully stop
                console.log('[LiveAudio] Track stopped:', track.kind, track.readyState);
            });
            this.mediaStream = null;
        }

        // Then disconnect audio nodes
        if (this.scriptProcessor) {
            this.scriptProcessor.onaudioprocess = null; // CRITICAL: Stop the handler!
            this.scriptProcessor.disconnect();
            this.scriptProcessor = null;
        }
        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }

        // Finally close AudioContext
        if (this.audioContext) {
            this.audioContext.close().catch(err => console.error('[LiveAudio] Error closing AudioContext:', err));
            this.audioContext = null;
        }

        this.playbackQueue = [];
        this.isPlaying = false;
        console.log('[LiveAudio] Fully stopped - all resources released');
    }

    private async playNextChunk(): Promise<void> {
        if (this.playbackQueue.length === 0 || !this.audioContext) {
            this.isPlaying = false;
            if (this.onAudioLevelCallback) {
                this.onAudioLevelCallback(0, true);
            }
            return;
        }

        this.isPlaying = true;
        const data = this.playbackQueue.shift()!;

        // Calculate audio level for UI animation
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i] * data[i];
        }
        const rms = Math.sqrt(sum / data.length);
        if (this.onAudioLevelCallback) {
            this.onAudioLevelCallback(rms * 100, true);
        }

        // Gemini outputs audio at 24kHz
        const buffer = this.audioContext.createBuffer(1, data.length, 24000);
        buffer.getChannelData(0).set(data);

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        this.currentSource = source;
        source.onended = () => {
            this.currentSource = null;
            this.playNextChunk();
        };
        source.start();
    }

    // ============ Audio Conversion Utilities ============

    private resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
        if (fromRate === toRate) return input;

        const ratio = fromRate / toRate;
        const newLength = Math.round(input.length / ratio);
        const output = new Float32Array(newLength);

        for (let i = 0; i < newLength; i++) {
            const srcIndex = i * ratio;
            const srcFloor = Math.floor(srcIndex);
            const srcCeil = Math.min(srcFloor + 1, input.length - 1);
            const frac = srcIndex - srcFloor;
            output[i] = input[srcFloor] * (1 - frac) + input[srcCeil] * frac;
        }

        return output;
    }

    private float32ToInt16(buffer: Float32Array): Int16Array {
        const len = buffer.length;
        const out = new Int16Array(len);
        for (let i = 0; i < len; i++) {
            const s = Math.max(-1, Math.min(1, buffer[i]));
            out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return out;
    }

    private int16ToFloat32(buffer: Int16Array): Float32Array {
        const len = buffer.length;
        const out = new Float32Array(len);
        for (let i = 0; i < len; i++) {
            out[i] = buffer[i] / 0x8000;
        }
        return out;
    }

    private arrayBufferToBase64(buffer: ArrayBufferLike): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        // Handle URL-safe base64
        let normalized = base64.replace(/-/g, '+').replace(/_/g, '/');

        // Add padding if needed
        while (normalized.length % 4 !== 0) {
            normalized += '=';
        }

        const binary = atob(normalized);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

export const liveAudioService = new LiveAudioService();
