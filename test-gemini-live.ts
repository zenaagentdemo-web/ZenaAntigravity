/**
 * Simple test to verify Gemini Live API connectivity
 * Run with: npx tsx test-gemini-live.ts
 */

import { GoogleGenAI, Modality } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const MODEL = 'gemini-2.0-flash-exp';

async function testGeminiLive() {
    console.log('[Test] Starting Gemini Live API test...');
    console.log('[Test] API Key:', process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET');
    console.log('[Test] Model:', MODEL);

    try {
        console.log('[Test] Attempting to connect...');

        const session = await ai.live.connect({
            model: MODEL,
            config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction: 'You are a helpful assistant. Respond briefly.',
            },
            callbacks: {
                onopen: () => {
                    console.log('[Test] ✓ Connected to Gemini Live API!');
                },
                onmessage: (message: any) => {
                    console.log('[Test] Message received:', JSON.stringify(message).substring(0, 200));
                },
                onerror: (error: any) => {
                    console.error('[Test] ✗ Error:', error?.message || error);
                },
                onclose: (event: any) => {
                    console.log('[Test] Closed:', event?.reason || 'No reason');
                },
            },
        });

        console.log('[Test] ✓ Connection established, session ID:', session ? 'OK' : 'null');

        // Send a simple text prompt
        console.log('[Test] Sending test prompt...');
        session.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: 'Hello, say hi!' }] }]
        });

        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Close session
        console.log('[Test] Closing session...');
        session.close();

        console.log('[Test] ✓ Test completed successfully!');
    } catch (error: any) {
        console.error('[Test] ✗ Failed to connect:', error?.message || error);
        console.error('[Test] Full error:', error);
    }
}

testGeminiLive();
