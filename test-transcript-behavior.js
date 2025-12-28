/**
 * Test to verify Gemini's inputTranscription behavior
 * Does it send CUMULATIVE or INCREMENTAL transcripts?
 * Run: GEMINI_API_KEY="..." node test-transcript-behavior.js
 */

const { GoogleGenAI, Modality } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = 'gemini-2.0-flash-exp';

console.log('=== TRANSCRIPT BEHAVIOR TEST ===');
console.log('Testing whether Gemini sends CUMULATIVE or INCREMENTAL inputTranscription');
console.log('');

const transcripts = [];

(async () => {
    try {
        const session = await ai.live.connect({
            model: MODEL,
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction: 'Listen and respond briefly.',
            },
            callbacks: {
                onopen: () => console.log('[Connected]'),
                onmessage: (msg) => {
                    if (msg.serverContent?.inputTranscription) {
                        const t = msg.serverContent.inputTranscription;
                        transcripts.push({
                            text: t.text,
                            finished: t.finished,
                            timestamp: Date.now()
                        });
                        console.log(`[INPUT] "${t.text}" (finished: ${t.finished})`);
                    }
                    if (msg.serverContent?.turnComplete) {
                        console.log('[Turn Complete]');
                    }
                },
                onerror: (err) => console.error('[Error]', err),
                onclose: () => {
                    console.log('[Closed]');
                    console.log('\n=== ANALYSIS ===');
                    console.log('Total transcript events:', transcripts.length);

                    if (transcripts.length >= 2) {
                        const first = transcripts[0].text;
                        const second = transcripts[1].text;
                        console.log('First transcript:', first);
                        console.log('Second transcript:', second);

                        if (second.startsWith(first) || second.includes(first)) {
                            console.log('VERDICT: CUMULATIVE (each update contains full text so far)');
                        } else {
                            console.log('VERDICT: INCREMENTAL (each update is a new fragment)');
                        }
                    }
                },
            },
        });

        // Send a multi-word text prompt to simulate speech input
        console.log('Sending text: "Hello, this is a test of the transcription system."');
        session.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: 'Hello, this is a test of the transcription system.' }] }]
        });

        // Wait for response
        await new Promise(r => setTimeout(r, 8000));
        session.close();

    } catch (e) {
        console.error('FATAL:', e.message || e);
    }
})();
