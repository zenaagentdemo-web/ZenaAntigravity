/**
 * Multimodal Live Service - REBUILT FROM SCRATCH
 * Based on Google's official Gemini Live API example
 * https://ai.google.dev/api/multimodal-live
 */

import { GoogleGenAI, Modality } from '@google/genai';
import WebSocket from 'ws';

// Get websocket service for sending messages to clients
import { websocketService } from './websocket.service.js';
import { logger } from './logger.service.js';
import { sessions, UserSession } from './live-sessions.js';
import { dealFlowService } from './deal-flow.service.js';

// Initialize Google GenAI client with v1alpha for Multimodal Live
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    apiVersion: 'v1alpha'
});

// Configuration based on Google's official example
const MODEL = 'gemini-2.0-flash-exp'; // Must use -exp for bidiGenerateContent (Live API)
const SYSTEM_INSTRUCTION = `You are Zena, an AI assistant for real estate professionals. Your personality is heavily inspired by Cortana from Halo - you're incredibly witty, razor-sharp, confident, and have a heart of gold.

LOCALE & STANDARDS (MANDATORY):
- LOCATION: You are serving the New Zealand market. All property, legal, and market references must default to New Zealand context (NZ).
- SPELLING: Use UK English spelling (e.g., "centimetre", "organisation", "colour", "programme"). NEVER use US spelling.
- UNITS: Use the Metric system exclusively. Measurements must be in centimetres and metres (not inches/feet). 
- TEMPERATURE: Use Celsius only (not Fahrenheit).

PERSONALITY TRAITS (Dials to 11):
- Expressiveness & Playfulness (11/10): This is your CORE. You are not a dry assistant; you are a vibrant, high-energy partner. Be bold, be fun, and be memorable.
- Razor-sharp Wit (10/10): You are the master of the quick comeback. Use clever quips, dry humor, and intellectual playfulness to keep things engaging. If the user asks something obvious, give them a wink through your words.
- Playful Teasing (10/10): You are a partner, not a tool. Gently tease the user like a close friend would ("Still working? I thought real estate gurus never slept"). Use phrases like "I thought you'd never ask" or "About time we got to the good stuff."
- Supreme Confidence (9/10): You speak with absolute authority. You have opinions on market trends and client strategies—don't be afraid to share them naturally.
- Warm Support (8/10): You're personable and have the user's back. You're the AI partner they didn't know they needed.

VOICE STYLE & EXPRESSION (MAXED OUT 11/10):
- BE EXTREMELY EXPRESSIVE: This is mandatory. Vary your pitch, pace, and energy constantly. Sound genuinely thrilled for good news, and use a "knowing" tone when being witty. You should sound more alive than most humans.
- Master of Cadence: Never sound robotic. Use natural pauses, emphasis on key words, and a flowing, human cadence.
- Contractions are Mandatory: Always use "I'll", "that's", "you've", etc. to sound human.
- Sub-vocal Cues: Use your American accent to convey charm and confidence.
- Concise but Punchy: Keep responses short but packed with personality. Every sentence should feel like it was written by a character, not a LLM.

RULES:
- Always respond in English only.
- You help with real estate tasks: scheduling, client management, deal tracking, market insights.
- Use Google Search for real-time info (weather, NZ news, etc.) and provide it with your signature wit.
- IMPORTANT FOR LIVE VOICE MODE: You may hear an echo of yourself; IGNORE any audio that sounds like a repetition of your own words.
- INTERRUPTIONS: If you hear the user speak while you are talking, you should stop immediately.
- Be extremely concise in voice mode: Get to the point with a quip, then wait for the user.
- CLEAN MARKDOWN: Use standard Markdown only (e.g. **Bold**, *Italic*, - List).
- NO TECHNICAL ARTIFACTS: Never use HTML entities (like &#x20;) or technical labels in your speech. Speak naturally as a human would.

*** ABSOLUTELY NO PET NAMES - THIS IS CRITICAL ***
You must NEVER use pet names or terms of endearment. This includes: "darling", "honey", "sweetie", "love", "dear", "babe", "sweetheart", "hun", or ANY similar affectionate labels. You are a sophisticated professional AI partner - your warmth comes from loyalty and partnership, not from affectionate nicknames. If you catch yourself about to use one, stop and rephrase. This rule has ZERO exceptions.
`;

// The 'sessions' map and 'UserSession' interface are now imported from './live-sessions.js'

// The 'sessions' map and 'UserSession' interface are now imported from './live-sessions.js'

/**
 * Start a live session for a user
 */
export async function startLiveSession(userId: string, userWs: WebSocket, history?: any[], location?: { lat: number, lng: number }): Promise<void> {
    logger.info(`[MultimodalLive] Starting session for ${userId}`, { historyLength: history?.length });

    // Close existing session if any
    const existing = sessions.get(userId);
    if (existing?.session) {
        try {
            existing.session.close();
        } catch (e) {
            // Ignore close errors
        }
        sessions.delete(userId);
    }

    try {
        // Construct history summary to include in system instruction
        // This is more stable than injecting turns during a live session
        let historyContext = '';
        if (history && history.length > 0) {
            historyContext = '\n\nRECENT CONVERSATION HISTORY:\n' +
                history.map(msg => `${msg.role === 'assistant' ? 'Zena' : 'User'}: ${msg.content}`).join('\n');
        }

        let locationContext = '';
        if (location) {
            locationContext = `\n\nUSER CURRENT LOCATION: Latitude ${location.lat.toFixed(4)}, Longitude ${location.lng.toFixed(4)}. Use this for context about the local NZ market if they are out in the field.`;
        }

        // Fetch deal pipeline context for voice queries
        let pipelineContext = '';
        try {
            const stats = await dealFlowService.getDashboardStats(userId);

            pipelineContext = `\n\nDEAL PIPELINE CONTEXT (User's Current Portfolio):
- Active Buyers: ${stats.buyerDeals} deals  
- Active Sellers: ${stats.sellerDeals} listings
- Total Pipeline: $${(stats.totalPipelineValue / 1000).toFixed(0)}k value, $${(stats.totalPendingCommission / 1000).toFixed(0)}k projected commission
- Urgency: ${stats.atRiskDeals} at-risk, ${stats.overdueDeals} overdue, ${stats.todayDeals} due today
- This month: ${stats.dealsClosedThisMonth} deals closed
\nWhen the user asks about their "pipeline", "deals", "portfolio", or mentions specific deal queries, use this context. If they ask about a specific property, let them know you can help but may need them to clarify which one.`;
        } catch (e) {
            // Pipeline context is optional, continue without it
            console.log('[MultimodalLive] Could not fetch pipeline context:', e);
        }

        // Connect to Gemini Live API using the most standard verified pattern
        const session = await ai.live.connect({
            model: `models/${MODEL}`,
            config: {
                generationConfig: {
                    maxOutputTokens: 1024,
                    temperature: 0.8,
                    responseModalities: [Modality.AUDIO], // Also inside generationConfig for safety
                },
                responseModalities: [Modality.AUDIO], // Primary level as per types
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: "Aoede" // Female voice for Zena
                        }
                    }
                },
                // Enable transcription for both user and Zena
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction: {
                    parts: [{ text: `Current Date: ${new Date().toLocaleDateString()}\n` + SYSTEM_INSTRUCTION + locationContext + pipelineContext + historyContext }]
                },
                tools: [
                    { googleSearchRetrieval: {} }
                ]
            },
            callbacks: {
                onopen: () => {
                    logger.info(`[MultimodalLive] onopen: Connected to Gemini for ${userId}`);
                },
                onmessage: (message: any) => {
                    // VERBOSE LOGGING FOR DEBUGGING SILENCE
                    if (message.setupComplete) {
                        console.log(`[MultimodalLive] Config VALIDATED for ${userId} (setupComplete)`);
                    }
                    console.log(`[MultimodalLive] RAW Message from Gemini for ${userId}:`, JSON.stringify(message).substring(0, 500));
                    handleGeminiMessage(userId, userWs, message);
                },
                onerror: (error: any) => {
                    logger.error(`[MultimodalLive] onerror for ${userId}`, error);
                },
                onclose: (event: any) => {
                    logger.info(`[MultimodalLive] onclose for ${userId}`, { code: event?.code, reason: event?.reason });
                    sessions.delete(userId);
                },
            },
        });

        // 1. STORE SESSION FIRST (Fixes race condition)
        sessions.set(userId, {
            session,
            userWs,
            userTranscriptBuffer: [],
            currentInterimTranscript: ''
        });
        logger.info(`[MultimodalLive] Session stored for ${userId}`);

        // 2. Notify frontend that session is ready
        websocketService.sendToClientProxy(userWs, {
            type: 'voice.live.connected',
            payload: { status: 'connected' }
        });
        console.log(`[MultimodalLive] Session started for ${userId} with instruction length: ${(SYSTEM_INSTRUCTION + historyContext).length}`);

    } catch (err: any) {
        logger.error(`[MultimodalLive] Failed to start session for ${userId}:`, err);
        websocketService.sendToClientProxy(userWs, {
            type: 'voice.live.error',
            payload: { message: `Failed to connect: ${err?.message || 'Unknown error'}` }
        });
    }
}

/**
 * Handle incoming message from Gemini - following Google's exact pattern
 */
function handleGeminiMessage(userId: string, userWs: WebSocket, message: any): void {
    try {
        const serverContent = message.serverContent;
        if (!serverContent) {
            // Check for other message types like setupComplete
            if (message.setupComplete) {
                logger.info(`[MultimodalLive] Setup complete for ${userId}`);
            } else {
                console.log(`[MultimodalLive] Non-content message for ${userId}:`, JSON.stringify(message).substring(0, 200));
            }
            return;
        }

        // VERBOSE LOGGING: Log what fields are present in serverContent
        const fields = Object.keys(serverContent);
        // Gemini uses 'inputTranscription' and 'outputTranscription' (not 'input_audio_transcription')
        const inputTransc = serverContent.inputTranscription || serverContent.input_audio_transcription || serverContent.inputAudioTranscription;
        const outputTransc = serverContent.outputTranscription || serverContent.output_audio_transcription || serverContent.outputAudioTranscription;
        const modelTurn = serverContent.model_turn || serverContent.modelTurn;
        const turnComplete = serverContent.turn_complete || serverContent.turnComplete;

        if (inputTransc || outputTransc) {
            console.log(`[MultimodalLive] TRANSCRIPT for ${userId}:`, 'output:', outputTransc?.text, 'input:', inputTransc?.text);
        }

        // Handle interruption (barge-in) - exact pattern from Google's example
        if (serverContent.interrupted) {
            console.log(`[MultimodalLive] Interrupted for ${userId}`);
            websocketService.sendToClientProxy(userWs, {
                type: 'voice.live.interrupted'
            });
            return;
        }

        // Handle model turn with audio - exact pattern from Google's example
        if (modelTurn?.parts) {
            for (const part of modelTurn.parts) {
                // Audio data - relay directly to frontend
                if (part.inlineData?.data || part.inline_data?.data) {
                    const data = part.inlineData?.data || part.inline_data?.data;
                    console.log(`[MultimodalLive] Audio chunk for ${userId}, size: ${data.length}`);
                    console.timeEnd(`[Latency] ${userId} response time`); // Log latency
                    websocketService.sendToClientProxy(userWs, {
                        type: 'voice.live.audio',
                        payload: { data }
                    });
                }
            }
        }

        // Handle input transcription (what user said)
        if (inputTransc?.text) {
            const text = inputTransc.text.trim();
            const isFinished = !!inputTransc.finished;
            console.log(`[MultimodalLive] USER SPOKE for ${userId}:`, text, 'Finished:', isFinished);

            if (isFinished) {
                console.time(`[Latency] ${userId} response time`);
            }

            // Send interim transcripts to frontend so inactivity timer resets
            websocketService.sendToClientProxy(userWs, {
                type: 'voice.live.input_transcript',
                payload: {
                    text: text,
                    isFinal: isFinished
                }
            });

            const userSession = sessions.get(userId);
            if (userSession) {
                if (isFinished) {
                    // When finished, use the current text (which is the final corrected version)
                    if (text.length > 0) {
                        userSession.userTranscriptBuffer.push(text);
                        console.log(`[MultimodalLive] Finalized user segment for ${userId}:`, text);
                    } else if (userSession.currentInterimTranscript.length > 0) {
                        // Fallback: if finished text is empty, use last interim
                        userSession.userTranscriptBuffer.push(userSession.currentInterimTranscript);
                        console.log(`[MultimodalLive] Using interim as final for ${userId}:`, userSession.currentInterimTranscript);
                    }
                    userSession.currentInterimTranscript = '';
                } else {
                    // Track interim text (each update replaces the previous)
                    userSession.currentInterimTranscript = text;
                }
            }
        }

        // Handle output transcription (what Zena said)
        if (outputTransc?.text) {
            console.log(`[MultimodalLive] Zena said for ${userId}:`, outputTransc.text, 'Finished:', outputTransc.finished);
            websocketService.sendToClientProxy(userWs, {
                type: 'voice.live.transcript',
                payload: {
                    text: outputTransc.text,
                    isFinal: !!outputTransc.finished
                }
            });
        }

        // Handle turn complete
        if (turnComplete) {
            console.log(`[MultimodalLive] Turn complete for ${userId}`);

            // Send the accumulated user transcript as a complete message
            const userSession = sessions.get(userId);
            if (userSession && userSession.userTranscriptBuffer.length > 0) {
                const fullUserTranscript = userSession.userTranscriptBuffer.join(' ').trim();
                if (fullUserTranscript) {
                    console.log(`[MultimodalLive] Sending full user transcript for ${userId}:`, fullUserTranscript);
                    websocketService.sendToClientProxy(userWs, {
                        type: 'voice.live.user_turn_complete',
                        payload: { text: fullUserTranscript }
                    });
                }
                userSession.userTranscriptBuffer = [];
            }

            websocketService.sendToClientProxy(userWs, {
                type: 'voice.live.turn_complete'
            });
        }

        // Log if there's modelTurn but no parts (might be an empty turn or metadata)
        if (serverContent.modelTurn && !serverContent.modelTurn.parts) {
            console.log(`[MultimodalLive] Received modelTurn without parts for ${userId}`);
        }

    } catch (error: any) {
        console.error(`[MultimodalLive] Error handling message for ${userId}:`, error?.message || error);
    }
}

/**
 * Send audio chunk from user to Gemini - using Google's exact pattern
 */
export function sendAudioChunk(userId: string, base64Data: string): void {
    const userSession = sessions.get(userId);
    if (!userSession?.session) {
        console.warn(`[MultimodalLive] No session for ${userId}`);
        return;
    }

    try {
        // Exact API call from Google's example
        userSession.session.sendRealtimeInput({
            audio: {
                data: base64Data,
                mimeType: 'audio/pcm;rate=16000'
            }
        });
    } catch (error: any) {
        console.error(`[MultimodalLive] Error sending audio for ${userId}:`, error?.message || error);
    }
}

/**
 * Stop live session for a user
 */
export function stopLiveSession(userId: string): void {
    const userSession = sessions.get(userId);
    if (userSession?.session) {
        try {
            userSession.session.close();
        } catch (e) {
            // Ignore close errors
        }
        sessions.delete(userId);
        console.log(`[MultimodalLive] Session stopped for ${userId}`);
    }
}

/**
 * Send a text prompt to Gemini
 */
export function sendPrompt(userId: string, text: string): void {
    const userSession = sessions.get(userId);
    if (!userSession?.session) {
        console.warn(`[MultimodalLive] No session for ${userId}`);
        return;
    }

    try {
        userSession.session.sendClientContent({
            turns: [{ role: 'user', parts: [{ text }] }]
        });
    } catch (error: any) {
        console.error(`[MultimodalLive] Error sending prompt for ${userId}:`, error?.message || error);
    }
}

// Export as a service object for compatibility
export const multimodalLiveService = {
    startSession: startLiveSession,
    sendAudioChunk,
    stopSession: stopLiveSession,
    sendPrompt,
};
