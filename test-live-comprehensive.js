/**
 * Comprehensive Gemini Live Test
 * Tests: Audio output, User input transcription, Zena output transcription, Turn complete
 * Run with: GEMINI_API_KEY="..." node test-live-comprehensive.js
 */

const { GoogleGenAI, Modality } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = 'gemini-2.0-flash-exp';

console.log('=== COMPREHENSIVE GEMINI LIVE TEST ===');
console.log('Model:', MODEL);
console.log('');

let stats = {
    audioChunks: 0,
    audioBytes: 0,
    zenaTextChunks: [],
    userTextChunks: [],
    turnComplete: false,
    setupComplete: false
};

(async () => {
    try {
        const session = await ai.live.connect({
            model: MODEL,
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Aoede' }
                    }
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction: 'You are Zena, an AI assistant. Say hello briefly.',
            },
            callbacks: {
                onopen: () => console.log('[OK] Connection opened'),
                onmessage: (msg) => {
                    // Setup complete
                    if (msg.setupComplete) {
                        stats.setupComplete = true;
                        console.log('[OK] Setup complete');
                    }

                    // Audio chunks
                    if (msg.serverContent?.modelTurn?.parts) {
                        msg.serverContent.modelTurn.parts.forEach(p => {
                            if (p.inlineData?.data) {
                                stats.audioChunks++;
                                stats.audioBytes += p.inlineData.data.length;
                            }
                        });
                    }

                    // User transcript (inputTranscription)
                    if (msg.serverContent?.inputTranscription) {
                        const t = msg.serverContent.inputTranscription;
                        stats.userTextChunks.push({ text: t.text, finished: t.finished });
                    }

                    // Zena transcript (outputTranscription)
                    if (msg.serverContent?.outputTranscription) {
                        const t = msg.serverContent.outputTranscription;
                        stats.zenaTextChunks.push({ text: t.text, finished: t.finished });
                    }

                    // Turn complete
                    if (msg.serverContent?.turnComplete) {
                        stats.turnComplete = true;
                        console.log('[OK] Turn complete');
                    }
                },
                onerror: (err) => console.error('[ERROR]', err),
                onclose: () => console.log('[OK] Connection closed'),
            },
        });

        console.log('');
        console.log('Sending text prompt...');
        session.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: 'Hello Zena!' }] }]
        });

        await new Promise(r => setTimeout(r, 6000));
        session.close();

        console.log('');
        console.log('=== RESULTS ===');
        console.log('Setup complete:', stats.setupComplete ? 'PASS' : 'FAIL');
        console.log('Audio chunks:', stats.audioChunks, '(' + stats.audioBytes + ' bytes)');
        console.log('Zena transcript chunks:', stats.zenaTextChunks.length);
        if (stats.zenaTextChunks.length > 0) {
            const fullText = stats.zenaTextChunks.map(c => c.text).join('');
            console.log('  Full text:', fullText);
        }
        console.log('User transcript chunks:', stats.userTextChunks.length);
        console.log('Turn complete:', stats.turnComplete ? 'PASS' : 'FAIL');

        console.log('');
        const allPass = stats.setupComplete && stats.audioChunks > 0 && stats.zenaTextChunks.length > 0 && stats.turnComplete;
        console.log(allPass ? '*** ALL TESTS PASSED ***' : '*** SOME TESTS FAILED ***');

    } catch (e) {
        console.error('FATAL ERROR:', e.message || e);
    }
})();
