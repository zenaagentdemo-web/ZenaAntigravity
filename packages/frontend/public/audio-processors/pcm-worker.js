/**
 * PCM Audio Processor
 * Handles raw PCM data in a background thread to prevent UI-induced glitching.
 * Now buffers samples to reduce message overhead to the main thread.
 */
class PCMProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._buffer = new Float32Array(2048);
        this._bufferIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const inputData = input[0];

        // Fill the internal buffer
        for (let i = 0; i < inputData.length; i++) {
            this._buffer[this._bufferIndex++] = inputData[i];

            // If the buffer is full, send it to the main thread
            if (this._bufferIndex >= this._buffer.length) {
                // Create a copy to transfer ownership
                const transferBuffer = new Float32Array(this._buffer);
                this.port.postMessage(transferBuffer, [transferBuffer.buffer]);

                // Reset index
                this._bufferIndex = 0;
            }
        }

        return true;
    }
}

registerProcessor('pcm-processor', PCMProcessor);
