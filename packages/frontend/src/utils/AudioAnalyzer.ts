/**
 * AudioAnalyzer - Web Audio API utility for voice-reactive animations
 * Extracts amplitude and frequency data from microphone or audio output
 */

export interface AudioAnalysisData {
    /** Overall volume level (0-1) */
    amplitude: number;
    /** Bass frequency energy (0-1) */
    bass: number;
    /** Mid frequency energy (0-1) */
    mid: number;
    /** Treble frequency energy (0-1) */
    treble: number;
    /** Whether audio is currently active */
    isActive: boolean;
}

export class AudioAnalyzer {
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private dataArray: Uint8Array | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private stream: MediaStream | null = null;
    private isInitialized = false;
    private animationFrameId: number | null = null;
    private onDataCallback: ((data: AudioAnalysisData) => void) | null = null;

    /**
     * Initialize the audio analyzer with microphone input
     */
    async initMicrophone(): Promise<boolean> {
        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });

            // Create audio context
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            // Create analyser node
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;

            // Connect microphone to analyser
            this.source = this.audioContext.createMediaStreamSource(this.stream);
            this.source.connect(this.analyser);

            // Create data array for frequency data
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('[AudioAnalyzer] Failed to initialize microphone:', error);
            return false;
        }
    }

    /**
     * Start analyzing audio and calling the callback with data
     */
    start(callback: (data: AudioAnalysisData) => void): void {
        if (!this.isInitialized || !this.analyser || !this.dataArray) {
            console.warn('[AudioAnalyzer] Not initialized. Call initMicrophone() first.');
            return;
        }

        this.onDataCallback = callback;
        this.analyze();
    }

    /**
     * Stop analyzing audio
     */
    stop(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.onDataCallback = null;
    }

    /**
     * Clean up all resources
     */
    destroy(): void {
        this.stop();

        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.analyser = null;
        this.dataArray = null;
        this.isInitialized = false;
    }

    /**
     * Internal analysis loop
     */
    private analyze = (): void => {
        if (!this.analyser || !this.dataArray || !this.onDataCallback) return;

        // Get frequency data
        this.analyser.getByteFrequencyData(this.dataArray);

        // Calculate amplitude (average of all frequencies)
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const amplitude = sum / (this.dataArray.length * 255);

        // Calculate frequency bands
        const binCount = this.dataArray.length;
        const bassEnd = Math.floor(binCount * 0.15);
        const midEnd = Math.floor(binCount * 0.5);

        let bassSum = 0;
        let midSum = 0;
        let trebleSum = 0;

        for (let i = 0; i < binCount; i++) {
            if (i < bassEnd) {
                bassSum += this.dataArray[i];
            } else if (i < midEnd) {
                midSum += this.dataArray[i];
            } else {
                trebleSum += this.dataArray[i];
            }
        }

        const bass = bassSum / (bassEnd * 255);
        const mid = midSum / ((midEnd - bassEnd) * 255);
        const treble = trebleSum / ((binCount - midEnd) * 255);

        // Determine if audio is active (above threshold)
        const isActive = amplitude > 0.05;

        this.onDataCallback({
            amplitude,
            bass,
            mid,
            treble,
            isActive,
        });

        this.animationFrameId = requestAnimationFrame(this.analyze);
    };

    /**
     * Check if the analyzer is initialized
     */
    get initialized(): boolean {
        return this.isInitialized;
    }
}

// Singleton instance for global use
export const audioAnalyzer = new AudioAnalyzer();
