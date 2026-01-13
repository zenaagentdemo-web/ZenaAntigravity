
import { WebSocket } from 'ws';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const HOST = 'generativelanguage.googleapis.com';
const MODEL = 'models/gemini-2.0-flash-exp';
const URI = `wss://${HOST}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

if (!API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in .env');
    process.exit(1);
}

function verifyMorningBrief() {
    console.log(`[Test] Connecting to Gemini Live (${MODEL})...`);
    console.log(`[Test] URI: ${URI.replace(API_KEY, 'HIDDEN')}`);

    const ws = new WebSocket(URI);

    ws.on('open', () => {
        console.log('[Test] ✅ Connected to Gemini Live');

        // 1. Send Setup Message
        const setupMsg = {
            setup: {
                model: MODEL,
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } }
                    }
                }
            }
        };
        ws.send(JSON.stringify(setupMsg));
        console.log('[Test] Sent Setup Message');

        // 2. Send "Holding" Prompt (Simulating the Async Start)
        // Wait a bit for setup to complete
        setTimeout(() => {
            const holdingPrompt = {
                clientContent: {
                    turns: [{
                        role: 'user',
                        parts: [{ text: "I want my morning brief. Acknowledge this immediately by saying 'Good morning! Give me one moment to pull your latest intelligence...' or something similar and witty. Do NOT start the brief yet, just hold the space." }]
                    }],
                    turnComplete: true
                }
            };
            console.log('[Test] Sending Holding Prompt...');
            ws.send(JSON.stringify(holdingPrompt));
        }, 1000);
    });

    ws.on('message', (data: any) => {
        let msg;
        try {
            msg = JSON.parse(data.toString());
        } catch (e) {
            console.error('[Test] Failed to parse message');
            return;
        }

        // Log interesting events
        if (msg.setupComplete) {
            console.log('[Test] ✅ Setup Complete');
        }

        if (msg.serverContent) {
            if (msg.serverContent.modelTurn) {
                const parts = msg.serverContent.modelTurn.parts;
                for (const part of parts) {
                    if (part.text) {
                        console.log(`[Test] 🗣️  Text Response: "${part.text}"`);
                    }
                    if (part.inlineData) {
                        console.log(`[Test] 🔊 Audio Chunk Received (${part.inlineData.data.length} bytes)`);
                    }
                }
            }
            if (msg.serverContent.turnComplete) {
                console.log('[Test] ✅ Turn Complete (Model finished speaking)');
                ws.close();
                process.exit(0);
            }
        }

        if (msg.toolCall) {
            console.log('[Test] 🛠️ Tool Call Received:', JSON.stringify(msg.toolCall));
        }
    });

    ws.on('error', (err) => {
        console.error('[Test] ❌ WebSocket Error:', err);
        process.exit(1);
    });

    ws.on('close', (code, reason) => {
        console.log(`[Test] Closed: ${code} ${reason}`);
    });
}

verifyMorningBrief();
