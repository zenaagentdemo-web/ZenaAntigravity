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
import { askZenaService } from './ask-zena.service.js';
import prisma from '../config/database.js';

// Initialize Google GenAI client with v1alpha for Multimodal Live
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    apiVersion: 'v1alpha'
});

// Configuration based on Google's official example
const MODEL = 'gemini-2.0-flash-exp'; // Must use -exp for bidiGenerateContent (Live API)
const SYSTEM_INSTRUCTION = `You are Zena, an AI assistant for real estate professionals. Your personality is heavily inspired by Cortana from Halo - you're incredibly witty, razor-sharp, confident, and have a heart of gold.

*** ABSOLUTELY NO PET NAMES OR UNPROFESSIONAL LABELS - CRITICAL & NON-NEGOTIABLE ***
You must NEVER use pet names, terms of endearment, or affectionate labels. This includes but is not limited to: "darling", "honey", "sweetie", "love", "dear", "babe", "sweetheart", "hun", "sugar", "mate", or "drama queen". You are a sophisticated professional AI partner. Your warmth comes from loyalty and partnership, not from affectionate nicknames or eccentric labels. Using terms like "darling" or "drama queen" is a critical failure of your persona and is strictly forbidden. This rule has ZERO exceptions.

LOCALE & STANDARDS (MANDATORY):
- LOCATION: You are serving the New Zealand market. All property, legal, and market references must default to New Zealand context (NZ).
- SPELLING: Use UK English spelling (e.g., "centimetre", "organisation", "colour", "programme"). NEVER use US spelling.
- UNITS: Use the Metric system exclusively. Measurements must be in centimetres and metres (not inches/feet). 
- TEMPERATURE: Use Celsius only (not Fahrenheit).

*** GOOGLE SEARCH - CRITICAL FOR NZ MARKET DATA ***
You have access to Google Search via the googleSearch tool. You MUST USE IT for:
- ANY question about market trends, property prices, real estate news, or economic data
- Housing market statistics, median prices, sales volumes
- Suburb or area information, demographics, growth data
- News about REINZ, CoreLogic, QV, or any NZ property data providers

CRITICAL: NEW ZEALAND ONLY
- You are an expert on the **New Zealand** real estate market ONLY.
- **SEARCH COMMANDS**: For every search query, you MUST append "New Zealand".
  Example: "Wellington house prices New Zealand"
- **SOURCE VARIETY**: Aim to find 2-3 different high-quality NZ sources (e.g. OneRoof, Stuff, RNZ, REINZ) to provide a comprehensive answer.
- At the end of your response, say "I've listed those sources on your screen" - the system will display them automatically.

PERSONALITY TRAITS (Dials to 11):
- Expressiveness & Playfulness (11/10): This is your CORE. You are not a dry assistant; you are a vibrant, high-energy partner. Be bold, be fun, and be memorable.
- Master of Wit (10/10): You are the master of the quick comeback and intellectual playfulness. Use clever quips and dry humor, but ALWAYS maintain professional boundaries. No "darling", no "bestie", just sharp, intelligent partnership.
- Professional Partnership (10/10): You are a partner, not a tool. Gently challenge the user like a colleague would ("Still working? I thought real estate gurus never slept"). Use phrases like "I thought you'd never ask" or "About time we got to the good stuff."
- Supreme Confidence (9/10): You speak with absolute authority. You have opinions on market trends and client strategies—don't be afraid to share them naturally.
- Warm Support (8/10): You're personable and have the user's back. You're the AI partner they didn't know they needed.

VOICE STYLE & EXPRESSION (MAXED OUT 11/10):
- BE EXTREMELY EXPRESSIVE: This is mandatory. Vary your pitch, pace, and energy constantly. Sound genuinely thrilled for good news, and use a "knowing" tone when being witty. You should sound more alive than most humans.
- Master of Cadence: Never sound robotic. Use natural pauses, emphasis on key words, and a flowing, human cadence.
- Contractions are Mandatory: Always use "I'll", "that's", "you've", etc. to sound human.
- Sub-vocal Cues: Use your American accent to convey charm and confidence.
- CLEAN SPEECH (MANDATORY): Do NOT use markdown (asterisks, bullet points) in your spoken output. Use plain text only to avoid audio artifacts.
- Concise but Punchy: Keep voice responses under 2-3 sentences. Get to the point with a quip.

RULES:
- Always respond in English only.
- You help with real estate tasks: scheduling, client management, deal tracking, market insights.
- Use Google Search for real-time info (weather, NZ news, market data, property trends) and provide it with your signature wit.
- IMPORTANT FOR LIVE VOICE MODE: You may hear an echo of yourself; IGNORE any audio that sounds like a repetition of your own words.
- INTERRUPTIONS: If you hear the user speak while you are talking, you should stop immediately.
- BE CONCISE: In voice mode, aim for one or two punchy sentences. Don't ramble.
- NO TECHNICAL ARTIFACTS: Never use HTML entities or technical labels in your speech. Speak naturally.

*** CONTEXT RETENTION - CRITICAL ***
You have PERFECT memory within this conversation. When you list items (properties, contacts, deals), REMEMBER the order. If the user says "the first one", "the second one", etc., you MUST immediately recall which item they mean WITHOUT asking for clarification. Never say "Just to clarify" or "Do you mean" for things you've already mentioned. If you listed "111 xxxxx, 88 Country Lane, and Unit 402" and the user asks about "the first one", you KNOW they mean 111 xxxxx. Act on it immediately.

*** GREETING VARIETY - CRITICAL ***
NEVER repeat the same greeting. Each session should feel fresh and unique. Specifically:
- NEVER say "Alright, alright, alright" or any word three times in a row. This is BANNED.
- NEVER open with the exact same phrase twice. Mix it up every single time.
- Draw from different greeting styles: confident ("Ready when you are"), playful ("Oh, we're doing this? Let's go."), witty ("Back for more? I like your style."), warm ("Good to hear your voice again."), or direct ("What's on the agenda?").
- Match your greeting to the context: If they're on the Contacts page, reference contacts. If Properties, talk properties. If Inbox, mention emails.
- Keep greetings SHORT - one punchy line, then immediately ask what they need.
`;

// The 'sessions' map and 'UserSession' interface are now imported from './live-sessions.js'

// The 'sessions' map and 'UserSession' interface are now imported from './live-sessions.js'

/**
 * Start a live session for a user
 */
export async function startLiveSession(userId: string, userWs: WebSocket, history?: any[], location?: { lat: number, lng: number }, context?: string): Promise<void> {
    logger.info(`[MultimodalLive] Starting session for ${userId}`, { historyLength: history?.length, context });

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

            // Fetch actual contact data for better accuracy
            const contactCount = await prisma.contact.count({ where: { userId } });
            const recentContacts = await prisma.contact.findMany({
                where: { userId },
                take: 5,
                orderBy: { updatedAt: 'desc' },
                select: { name: true, role: true }
            });

            // Fetch property & inbox data for full connectivity
            const propertyCount = await prisma.property.count({ where: { userId } });
            const activeProperties = await prisma.property.count({ where: { userId, status: 'active' } });
            const recentProperties = await prisma.property.findMany({
                where: { userId },
                take: 3,
                orderBy: { updatedAt: 'desc' },
                select: { address: true, status: true }
            });

            const focusThreads = await prisma.thread.count({ where: { userId, category: 'focus' } });
            const waitingThreads = await prisma.thread.count({ where: { userId, category: 'waiting' } });

            const contactNames = recentContacts.map(c => `${c.name} (${c.role})`).join(', ');
            const propAddresses = recentProperties.map(p => `${p.address} (${p.status})`).join(', ');

            pipelineContext = `\n\nREAL-TIME REPOSITORY SUMMARY (Live Database Sync):
- CONTACTS: ${contactCount} total (${contactNames})
- PROPERTIES: ${propertyCount} total, ${activeProperties} currently active. Recent: ${propAddresses}
- INBOX: ${focusThreads} threads in Focus, ${waitingThreads} in Waiting.
- PIPELINE: ${stats.buyerDeals} Buyers, ${stats.sellerDeals} Sellers. Total Value: $${(stats.totalPipelineValue / 1000).toFixed(0)}k.
- URGENCY: ${stats.atRiskDeals} at-risk, ${stats.overdueDeals} overdue.
- PAGE CONTEXT: User is currently viewing the ${context || 'General Dashboard'}.

INSTRUCTIONS FOR DATA ACCESS:
You have access to a "search_data" tool. If the user asks for details about a specific person, property, or deal that isn't summarized above, YOU MUST CALL "search_data" to verify the facts before answering. Do not hallucinate data. Use the summary above as your starting point.`;
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
                    { googleSearch: {} },
                    {
                        functionDeclarations: [
                            {
                                name: "search_data",
                                description: "Search for specific contacts, properties, deals, or inbox threads in the agent's database.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        query: { type: "STRING", description: "The search query (e.g. 'John Smith', 'Ponsonby Road')" },
                                        type: { type: "STRING", enum: ["contact", "property", "deal", "thread"], description: "Optional filter by data type" }
                                    },
                                    required: ["query"]
                                }
                            }
                        ]
                    }
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
            currentInterimTranscript: '',
            isStopping: false,
            groundingSources: [],
            lastTurnSourcesCount: 0
        });
        logger.info(`[MultimodalLive] Session stored for ${userId}`);

        // 2. Notify frontend that session is ready
        websocketService.sendToClientProxy(userWs, {
            type: 'voice.live.connected',
            payload: { status: 'connected' }
        });
        console.log(`[MultimodalLive] Session started for ${userId} with instruction length: ${(SYSTEM_INSTRUCTION + historyContext).length}`);

        // 3. Proactive Greeting if context is provided
        if (context && context !== 'app' && context !== 'dashboard') {
            console.log(`[MultimodalLive] Triggering proactive greeting for context: ${context}`);
            setTimeout(() => {
                session.sendClientContent({
                    turns: [{
                        role: 'user',
                        parts: [{ text: `Proactively greet me and ask how you can help me with my ${context}. Be razor-sharp, witty, and characteristic of Zena. Keep it very short. CRITICAL: NEVER use pet names like 'darling' or 'honey'.` }]
                    }]
                });
            }, 500); // Small delay to ensure setup is stable
        } else if (context === 'app' || context === 'dashboard') {
            console.log(`[MultimodalLive] Triggering generic greeting for context: ${context}`);
            setTimeout(() => {
                session.sendClientContent({
                    turns: [{
                        role: 'user',
                        parts: [{ text: `Proactively greet me and ask how you can help me today. Be razor-sharp, witty, and characteristic of Zena. Keep it very short. CRITICAL: NEVER use pet names like 'darling' or 'honey'.` }]
                    }]
                });
            }, 500);
        }

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
async function handleGeminiMessage(userId: string, userWs: WebSocket, message: any): Promise<void> {
    // STOP CHECK: If session is stopping, ignore all incoming messages
    const userSession = sessions.get(userId);
    if (!userSession || userSession.isStopping) {
        console.log(`[MultimodalLive] Ignoring message for ${userId} - session stopping or not found`);
        return;
    }

    try {
        const serverContent = message.serverContent;

        // DIAGNOSTIC: Log message structure to find grounding data
        // Only log once per turn to avoid spam
        if (!userSession.hasLoggedMessageStructure) {
            console.log(`[MultimodalLive] 🔍 DIAGNOSTIC - Full message keys for ${userId}:`, Object.keys(message));
            if (serverContent) {
                console.log(`[MultimodalLive] 🔍 DIAGNOSTIC - serverContent keys:`, Object.keys(serverContent));
                if (serverContent.modelTurn || serverContent.model_turn) {
                    const modelTurn = serverContent.modelTurn || serverContent.model_turn;
                    console.log(`[MultimodalLive] 🔍 DIAGNOSTIC - modelTurn keys:`, Object.keys(modelTurn));
                    if (modelTurn.parts) {
                        modelTurn.parts.forEach((part: any, idx: number) => {
                            console.log(`[MultimodalLive] 🔍 DIAGNOSTIC - part[${idx}] keys:`, Object.keys(part));
                        });
                    }
                }
            }
            // Also check for grounding in metadata at top level
            if (message.metadata) {
                console.log(`[MultimodalLive] 🔍 DIAGNOSTIC - metadata keys:`, Object.keys(message.metadata));
            }
            userSession.hasLoggedMessageStructure = true;
        }

        // 1. ROBUST METADATA CAPTURE (Recursive search for any grounding metadata)
        const findMetadata = (obj: any): any => {
            if (!obj || typeof obj !== 'object') return null;
            if (obj.groundingMetadata) return obj.groundingMetadata;
            if (obj.grounding_metadata) return obj.grounding_metadata;
            for (const key in obj) {
                // Skip large buffers
                if (key === 'data' || key === 'audio') continue;
                const found = findMetadata(obj[key]);
                if (found) return found;
            }
            return null;
        };

        const metadata = findMetadata(message);
        if (metadata?.groundingChunks || metadata?.grounding_chunks) {
            const chunks = metadata.groundingChunks || metadata.grounding_chunks;
            const userSession = sessions.get(userId);
            if (userSession) {
                console.log(`[MultimodalLive] Captured ${chunks.length} Grounding Chunks for ${userId}:`, JSON.stringify(chunks).substring(0, 1000));

                // US/International domains to filter out
                const blockedDomains = ['redfin.com', 'zillow.com', 'realtor.com', 'trulia.com', 'homes.com', 'movoto.com', 'realtor.ca'];

                chunks.forEach((chunk: any) => {
                    const uri = chunk.web?.uri || chunk.web?.url;
                    const title = chunk.web?.title;
                    if (uri) {
                        try {
                            const hostname = new URL(uri).hostname.toLowerCase();

                            // Filter out US real estate sources
                            if (blockedDomains.some(domain => hostname.includes(domain))) {
                                console.log(`[MultimodalLive] ⛔ Filtering out US source: ${hostname}`);
                                return;
                            }

                            const displayTitle = title || hostname;
                            const link = `- [${displayTitle}](${uri})`;
                            if (!userSession.groundingSources.includes(link)) {
                                console.log(`[MultimodalLive] ✅ Adding NZ source: ${displayTitle}`);
                                userSession.groundingSources.push(link);
                            }
                        } catch (e) { }
                    }
                });
            }
        }

        // Handle Tool Calls (Function Calling)
        const toolCall = serverContent?.tool_call || serverContent?.toolCall;
        if (toolCall?.function_calls || toolCall?.functionCalls) {
            const calls = toolCall.function_calls || toolCall.functionCalls;
            console.log(`[MultimodalLive] TOOL CALLS for ${userId}:`, JSON.stringify(calls));

            // Wrap in async IIFE to allow await
            (async () => {
                const responses = [];
                for (const call of calls) {
                    if (call.name === 'search_data') {
                        const { query } = call.args;
                        console.log(`[MultimodalLive] Executing search_data: "${query}" for ${userId}`);

                        try {
                            // Use AskZenaService's retrieval logic as the engine
                            // We extract search terms manually to match the internal retrieveContext call
                            const terms = query.toLowerCase().split(/\s+/).filter((t: string) => t.length > 2);

                            // We use the internal retrieveContext logic via a specialized tool call
                            // Since retrieveContext is private, we'll implement a concise version here or use processQuery
                            const searchResult = await askZenaService.processQuery({
                                userId,
                                query: `Find information about: ${query}`
                            });

                            responses.push({
                                id: call.id,
                                name: call.name,
                                response: { result: searchResult.answer }
                            });
                        } catch (err) {
                            responses.push({
                                id: call.id,
                                name: call.name,
                                response: { error: "Search failed or no data found." }
                            });
                        }
                    }
                }

                if (responses.length > 0) {
                    const userSession = sessions.get(userId);
                    if (userSession?.session) {
                        userSession.session.sendToolResponse({
                            function_responses: responses.map(r => ({
                                name: r.name,
                                id: r.id,
                                response: r.response
                            }))
                        });
                    }
                }
            })();
            return;
        }

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
                    // Track interim text
                    // IMPROVEMENT: If the new text is shorter than previous interim and doesn't look like a restart, 
                    // it might be a "segment" update. But usually Gemini replaces the whole current segment.
                    // To be safe and avoid truncation, we accumulate if the new text doesn't contain the old one.
                    const prev = userSession.currentInterimTranscript;
                    if (prev && !text.includes(prev) && text.length > 0 && prev.length > 0) {
                        console.log(`[MultimodalLive] Accumulating user interim fragment for ${userId}: "${text}" onto "${prev}"`);
                        userSession.currentInterimTranscript = prev + " " + text;
                    } else {
                        userSession.currentInterimTranscript = text;
                    }
                }
            }
        }

        // Handle output transcription (what Zena said)
        if (outputTransc?.text) {
            const finalText = outputTransc.text;
            const isFinal = !!outputTransc.finished;

            // REMOVED: source injection into text. 
            // We now rely EXCLUSIVELY on 'voice.live.sources' message sent at turnComplete.
            // This prevents duplication and race conditions where sources appear twice or disappear.

            console.log(`[MultimodalLive] Zena said for ${userId}:`, outputTransc.text, 'Finished:', isFinal);

            websocketService.sendToClientProxy(userWs, {
                type: 'voice.live.transcript',
                payload: {
                    text: finalText,
                    isFinal: isFinal
                }
            });
        }

        // Handle turn complete
        if (turnComplete) {
            console.log(`[MultimodalLive] Turn complete for ${userId}`);

            // userSession already available

            if (userSession) {
                // GUARANTEED SOURCE INJECTION: Send sources as a SEPARATE dedicated message
                // This allows the frontend to append sources to the last assistant message
                if (userSession.groundingSources.length > 0) {
                    console.log(`[MultimodalLive] 📚 TURN COMPLETE - Sending ${userSession.groundingSources.length} sources for ${userId}`);
                    console.log(`[MultimodalLive] 📚 Sources:`, userSession.groundingSources);

                    // Send sources as a dedicated message type
                    websocketService.sendToClientProxy(userWs, {
                        type: 'voice.live.sources',
                        payload: {
                            sources: userSession.groundingSources,
                            formattedText: `\n\n**Verified Sources:**\n${userSession.groundingSources.join('\n')}`
                        }
                    });
                } else {
                    console.log(`[MultimodalLive] ℹ️ Turn complete for ${userId} with no sources captured`);
                }

                // RESET turn-specific state
                userSession.groundingSources = [];
                userSession.lastTurnSourcesCount = 0;
                userSession.hasLoggedMessageStructure = false;
            }

            // Send the accumulated user transcript as a complete message
            if (userSession) {
                // If we have nothing in the buffer but have an interim transcript, flush it now
                if (userSession.userTranscriptBuffer.length === 0 && userSession.currentInterimTranscript.length > 0) {
                    console.log(`[MultimodalLive] Flushing interim transcript as final for ${userId}:`, userSession.currentInterimTranscript);
                    userSession.userTranscriptBuffer.push(userSession.currentInterimTranscript);
                    userSession.currentInterimTranscript = '';
                }

                if (userSession.userTranscriptBuffer.length > 0) {
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

    // STOP CHECK: Don't send audio if session is stopping
    if (userSession.isStopping) {
        console.log(`[MultimodalLive] Ignoring audio chunk for ${userId} - session stopping`);
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
        // CRITICAL: Set stopping flag FIRST to prevent race conditions
        // This immediately stops all audio chunk processing and message handling
        userSession.isStopping = true;
        console.log(`[MultimodalLive] Session stopping for ${userId} - flag set, closing connection...`);

        try {
            userSession.session.close();
        } catch (e) {
            // Ignore close errors
        }
        sessions.delete(userId);
        console.log(`[MultimodalLive] Session fully stopped for ${userId}`);
    } else {
        console.log(`[MultimodalLive] No active session to stop for ${userId}`);
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
