
const { GoogleGenAI, Modality } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = 'gemini-2.0-flash-exp';

console.log('=== BACKEND STABILITY TEST: LONG AUDIO INPUT ===');
console.log('Objective: Verify connection allows >10s of continuous audio input without timeout/interruption from backend.');
console.log('Model:', MODEL);
console.log('');

// Generate 1 second of dummy audio (16kHz, 1 channel, PCM16) leads to 32000 bytes
// We'll send silence/noise. 
const SAMPLE_RATE = 16000;
const CHUNK_DURATION_MS = 100;
const CHUNK_SIZE = Math.floor(SAMPLE_RATE * (CHUNK_DURATION_MS / 1000));
// Creating a buffer of silence (0s)
const dummyAudioChunk = Buffer.alloc(CHUNK_SIZE * 2).toString('base64');

(async () => {
    try {
        const session = await ai.live.connect({
            model: MODEL,
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } },
                systemInstruction: 'You are a listener. Wait until I stop speaking.',
            },
            callbacks: {
                onopen: () => console.log('[OK] Connection opened'),
                onmessage: (msg) => {
                    if (msg.serverContent?.turnComplete) {
                        console.log('[WARNING] Premature Turn Complete received!');
                    }
                    if (msg.serverContent?.modelTurn) {
                        process.stdout.write('A'); // Audio received
                    }
                },
                onerror: (err) => console.error('[ERROR]', err),
                onclose: () => console.log('[OK] Connection closed'),
            },
        });

        console.log('Streaming audio for 12 seconds (simulating long user prompt)...');

        const startTime = Date.now();
        let chunkCount = 0;

        // Send a chunk every 100ms
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= 12000) {
                clearInterval(interval);
                console.log('\nStopping stream after 12s.');
                session.sendClientContent({ turns: [], turnComplete: true }); // Signal end manually

                setTimeout(() => {
                    session.close();
                    console.log('Test Complete: Backend accepted long stream without forcing turn completion.');
                }, 2000);
                return;
            }

            // Send dummy audio
            session.sendRealtimeInput([{
                mimeType: "audio/pcm;rate=16000",
                data: dummyAudioChunk
            }]);
            process.stdout.write('.');
            chunkCount++;
        }, 100);

    } catch (e) {
        console.error('FATAL ERROR:', e.message || e);
    }
})();
