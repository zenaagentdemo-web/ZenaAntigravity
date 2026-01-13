#!/usr/bin/env tsx

/**
 * Zena Live API Connectivity Tester
 * Directly tests the connection from the backend server to Google's Gemini Live API.
 */

import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.0-flash-exp';

if (!API_KEY) {
    console.error('❌ ERROR: GEMINI_API_KEY not found in environment variables.');
    process.exit(1);
}

async function testConnection() {
    console.log(`🚀 Starting Zena Live connection test...`);
    console.log(`📡 Model: ${MODEL}`);
    console.log(`🔑 API Key (masked): ${API_KEY.substring(0, 5)}...${API_KEY.substring(API_KEY.length - 5)}`);

    const ai = new GoogleGenAI({
        apiKey: API_KEY,
        apiVersion: 'v1beta'
    });

    try {
        console.log('🔗 Connecting to Gemini Live...');
        const session = await ai.live.connect({
            model: `models/${MODEL}`,
            config: {
                generationConfig: {
                    maxOutputTokens: 1024,
                    temperature: 0.8,
                    responseModalities: [Modality.AUDIO],
                },
                systemInstruction: {
                    parts: [{ text: "You are Zena, a sharp real estate assistant. Greet the user with a witty one-liner and ask how you can help." }]
                }
            },
            callbacks: {
                onopen: () => {
                    console.log('✅ Connection established (onopen)');
                },
                onmessage: (message: any) => {
                    console.log('📩 Received message from Gemini:');

                    if (message.setupComplete) {
                        console.log('  ✨ Setup complete');
                        // Once setup is complete, send a small prompt to test turn-around
                        console.log('  💬 Sending test prompt: "Hello Zena, are you there?"');
                        session.sendClientContent({
                            turns: [{ role: 'user', parts: [{ text: "Hello Zena, are you there?" }] }]
                        });
                    }

                    if (message.serverContent?.modelTurn?.parts) {
                        const parts = message.serverContent.modelTurn.parts;
                        for (const part of parts) {
                            if (part.inlineData?.data) {
                                console.log(`  🎵 Received audio data chunk (${part.inlineData.data.length} bytes)`);
                            }
                        }
                    }

                    if (message.serverContent?.outputTranscription?.text) {
                        console.log(`  📝 Zena transcript: "${message.serverContent.outputTranscription.text}"`);
                    }

                    if (message.serverContent?.turnComplete) {
                        console.log('  🏁 Turn complete');
                        console.log('✅ TEST SUCCESSFUL!');
                        session.close();
                        process.exit(0);
                    }
                },
                onerror: (error: any) => {
                    console.error('❌ Connection error:', error);
                    process.exit(1);
                },
                onclose: (event: any) => {
                    console.log('🚪 Connection closed:', event?.code, event?.reason);
                },
            },
        });

        // Set a timeout in case it hangs
        setTimeout(() => {
            console.error('⏳ Test timed out after 15 seconds.');
            session.close();
            process.exit(1);
        }, 15000);

    } catch (err) {
        console.error('❌ Failed to connect:', err);
        process.exit(1);
    }
}

testConnection();
