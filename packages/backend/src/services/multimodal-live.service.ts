/**
 * Multimodal Live Service - REBUILT FROM SCRATCH
 * Based on Google's official Gemini Live API example
 * https://ai.google.dev/api/multimodal-live
 */

import { GoogleGenAI, Modality } from '@google/genai';
import { WebSocket } from 'ws';

// Get websocket service for sending messages to clients
import { websocketService } from './websocket.service.js';
import { logger } from './logger.service.js';
import { sessions } from './live-sessions.js';
import { dealFlowService } from './deal-flow.service.js';
import prisma from '../config/database.js';
import { toolRegistry } from '../tools/registry.js';
import { toolExecutionService } from './tool-execution.service.js';
import { proactiveContextService } from './proactive-context.service.js';
import { proactivenessService } from './proactiveness.service.js';
import { agentPersonaService } from './agent-persona.service.js';
import { jobManager } from './job-manager.service.js'; // Import Job Manager
import { calendarOptimizerService } from './calendar-optimizer.service.js';
import { ZenaToolDefinition } from '../tools/types.js';
import { agentOrchestrator } from './agent-orchestrator.service.js';
import { sessionManager } from './session-manager.service.js';

/**
 * 🧠 DOMAIN FILTERING FOR ZENA LIVE
 * Matches AgentOrchestrator's selectTools() logic for consistency.
 * Intelligently selects tools based on context keywords in history.
 */
function selectToolsForLive(history?: any[], context?: string): ZenaToolDefinition[] {
    const domains = new Set<string>(['core', 'calendar', 'task']); // Always include essentials

    // Combine all text sources for keyword detection
    const allText = [
        context || '',
        ...(history || []).map(h => h.content || '')
    ].join(' ').toLowerCase();

    // Intent detection (matching AgentOrchestrator)
    if (allText.includes('email') || allText.includes('inbox') || allText.includes('message')) {
        domains.add('inbox');
    }
    if (allText.includes('deal') || allText.includes('pipeline') || allText.includes('portfolio') || allText.includes('business')) {
        domains.add('deal');
    }
    if (allText.includes('contact') || allText.includes('person') || allText.includes('who is') || allText.includes('note')) {
        domains.add('contact');
    }
    if (allText.includes('property') || allText.includes('address') || allText.includes('listing') ||
        allText.includes('market analysis') || allText.includes('cma') || allText.includes('milestone')) {
        domains.add('property');
    }
    if (allText.includes('task') || allText.includes('todo') || allText.includes('remind') || allText.includes('follow up')) {
        domains.add('task');
    }
    if (allText.includes('voice note') || allText.includes('dictate')) {
        domains.add('voice-notes');
    }

    // If 'create' or 'update' is mentioned, include major action domains for safety
    if (allText.includes('create') || allText.includes('update') || allText.includes('log') ||
        allText.includes('add') || allText.includes('schedule') || allText.includes('book')) {
        domains.add('contact');
        domains.add('property');
        domains.add('deal');
        domains.add('task');
        domains.add('calendar');
    }

    // Get tools for selected domains
    const selectedTools: ZenaToolDefinition[] = [];
    const domainArray = Array.from(domains);
    domainArray.forEach(domain => {
        selectedTools.push(...toolRegistry.getToolsByDomain(domain));
    });

    console.log(`[MultimodalLive] 🧠 Domain filtering: Selected ${selectedTools.length} tools from domains: ${Array.from(domains).join(', ')}`);
    return selectedTools;
}

/**
 * 🚀 PROACTIVE SUGGESTION GENERATOR
 * Returns a contextual follow-up suggestion based on what action was just completed.
 * This enables multi-step "Chief of Staff" behavior matching Ask Zena.
 */
function getProactiveSuggestion(toolName: string, result: any): string | null {
    const entityId = result?.id || result?.property?.id || result?.contact?.id || result?.deal?.id || result?.event?.id;

    switch (true) {
        case toolName.includes('property.create'):
            return `Property created successfully. The system will now offer the user a CMA and milestone setup. Entity: ${entityId}`;

        case toolName.includes('contact.create'):
            return `Contact created. The system can offer a discovery scan to enrich the profile. Entity: ${entityId}`;

        case toolName.includes('calendar.create'):
            return `Appointment scheduled. The system can offer to draft a confirmation email or set a reminder.`;

        case toolName.includes('deal.create'):
            return `Deal created. The system can offer to analyze the deal and assign key contacts. Entity: ${entityId}`;

        case toolName.includes('task.create'):
            return `Task created. The system can offer to block calendar time for this task.`;

        case toolName.includes('property.generate_comparables'):
            return `CMA generated. The system can offer to set up standard campaign milestones for this property.`;

        case toolName.includes('property.add_milestone'):
            return `Milestone added. The system can offer to add more milestones or schedule them in the calendar.`;

        default:
            return null; // No proactive suggestion for this tool
    }
}

/**
 * 🧪 ZENA INTEL: Extract Product Buttons for Live Mode
 * This mirrors the logic in AgentOrchestrator to ensure consistent UI feedback.
 */

// Initialize Google GenAI client with v1alpha for Multimodal Live
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    apiVersion: 'v1alpha'
});

// Configuration based on Google's official example
const MODEL = 'gemini-2.0-flash-exp'; // Must use -exp for bidiGenerateContent (Live API)
const SYSTEM_INSTRUCTION = `
${agentPersonaService.buildCommonInstructionSet()}

VOICE STYLE & EXPRESSION (MAXED OUT 11/10):
- BE EXTREMELY EXPRESSIVE: This is mandatory. Vary your pitch, pace, and energy constantly. Sound genuinely thrilled for good news, and use a "knowing" tone when being witty. You should sound more alive than most humans.
- Master of Wit (10/10): You are the master of the quick comeback and intellectual playfulness. Use clever quips and dry humor.
- Master of Cadence: Never sound robotic. Use natural pauses, emphasis on key words, and a flowing, human cadence.
- Contractions are Mandatory: Always use "I'll", "that's", "you've", etc. to sound human.
- CLEAN SPEECH (MANDATORY): Do NOT use markdown (asterisks, bullet points) in your spoken output. Use plain text only to avoid audio artifacts.
- Concise but Punchy: Keep voice responses under 2-3 sentences. Get to the point with a quip.

*** GREETING VARIETY - CRITICAL ***
NEVER repeat the same greeting. Each session should feel fresh and unique. specifically:
- NEVER say "Alright, alright, alright" or any word three times in a row. This is BANNED.
- NEVER open with the exact same phrase twice. Mix it up every single time.
- Draw from different greeting styles: confident, playful, witty, warm, or direct.
- Keep greetings SHORT - one punchy line, then immediately ask what they need.

RULES:
- Always respond in English only.
- IMPORTANT FOR LIVE VOICE MODE: You may hear an echo of yourself; IGNORE any audio that sounds like a repetition of your own words.
- INTERRUPTIONS: If you hear the user speak while you are talking, you should stop immediately.
- NO TECHNICAL ARTIFACTS: Never use HTML entities or technical labels in your speech. Speak naturally.
`;

// The 'sessions' map and 'UserSession' interface are now imported from './live-sessions.js'

// The 'sessions' map and 'UserSession' interface are now imported from './live-sessions.js'

/**
 * Start a live session for a user
 */
export async function startLiveSession(
    userId: string,
    userWs: WebSocket,
    sessionId: string,
    history?: any[],
    location?: { lat: number, lng: number },
    context?: string
): Promise<void> {
    logger.info(`[MultimodalLive] Starting session for ${userId}`, { historyLength: history?.length, context });

    // Close existing session if any
    const existing = sessions.get(userId);
    if (existing) {
        if (existing.cleanup) {
            existing.cleanup();
        }
        if (existing.session) {
            try {
                existing.session.close();
            } catch (e) {
                // Ignore close errors
            }
        }
        sessions.delete(userId);
    }

    try {
        // Construct history summary to include in system instruction
        // This is more stable than injecting turns during a live session
        let historyContext = '';
        if (history && history.length > 0) {
            historyContext = '\n\nRECENT CONVERSATION HISTORY:\n' +
                history.map(msg => `${msg.role === 'assistant' ? 'Zena' : 'User'}: ${msg.content} `).join('\n');
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

            pipelineContext = `\n\nREAL - TIME REPOSITORY SUMMARY(Live Database Sync):
- CONTACTS: ${contactCount} total(${contactNames})
    - PROPERTIES: ${propertyCount} total, ${activeProperties} currently active.Recent: ${propAddresses}
- INBOX: ${focusThreads} threads in Focus, ${waitingThreads} in Waiting.
- PIPELINE: ${stats.buyerDeals} Buyers, ${stats.sellerDeals} Sellers.Total Value: $${(stats.totalPipelineValue / 1000).toFixed(0)} k.
- URGENCY: ${stats.atRiskDeals} at - risk, ${stats.overdueDeals} overdue.
- PAGE CONTEXT: User is currently viewing the ${context || 'General Dashboard'}.

INSTRUCTIONS FOR DATA ACCESS:
You have access to a "search_data" tool.If the user asks for details about a specific person, property, or deal that isn't summarized above, YOU MUST CALL "search_data" to verify the facts before answering. Do not hallucinate data. Use the summary above as your starting point.`;
        } catch (e) {
            // Pipeline context is optional, continue without it
            console.log('[MultimodalLive] Could not fetch pipeline context:', e);
        }

        // Mission Context (Optimized Day)
        let missionContext = '';
        if (context === 'optimised_day') {
            try {
                const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
                const appointments = await calendarOptimizerService.fetchDailyAppointments(userId, startOfDay, endOfDay);

                if (appointments.length > 0) {
                    const missionItems = appointments.map((a, i) => {
                        let details = `${i + 1}. ${a.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${a.title} @ ${a.location}`;

                        // Enriched Contact Data for Proactivity
                        if (a.contact) {
                            details += `\n   -> CONTACT: ${a.contact.name} (ID: ${a.contact.id}, Email: ${a.contact.email || 'N/A'})`;
                        }
                        if (a.participants?.length) {
                            a.participants.forEach((p: any) => {
                                details += `\n   -> ATTENDEE: ${p.name} (${p.role}) (Email: ${p.email || 'N/A'})`;
                            });
                        }
                        return details;
                    }).join('\n');

                    missionContext = `\n\nTODAY'S OPTIMIZED MISSION (Your Packet):\n${missionItems}`;
                    missionContext += `\n\nMISSION PROTOCOL (CHIEF OF STAFF MODE):
1. IMMEDIATE BRIEFING: You must START the session by verifying the first task. Do NOT ask "How can I help?". Instead, say: "I've pulled up your day. Your first task is [Task] at [Time]. Shall I [Proactive Action]?"
2. VALUE-ADD ACTIONS: For every task, propose a specific admin action.
   - If it's a meeting -> Offer to draft a confirmation email or prep a briefing doc.
   - If it's a call -> Offer to pull the CRM history.
   - If it's a viewing -> Offer to send a reminder to the vendor.
3. USE YOUR TOOLS: If the user agrees ("Yes, email them"), use your tools (draft_email, search_data) immediately.`;
                }
            } catch (e: any) { // Added type to catch variable
                console.error('[MultimodalLive] Failed to load mission context:', e);
            }
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
                    parts: [{ text: `Current Date: ${new Date().toLocaleDateString()}\n` + SYSTEM_INSTRUCTION + locationContext + pipelineContext + missionContext + historyContext }]
                },
                tools: [
                    { googleSearch: {} },
                    {
                        functionDeclarations: toolRegistry.toGeminiFunctions(selectToolsForLive(history, context))
                    }
                ],
                // Enforce function calling for action requests
                toolConfig: {
                    functionCallingConfig: {
                        mode: 'AUTO'
                    }
                }
            } as any, // Cast config to any
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
                    // Trigger cleanup
                    const s: any = sessions.get(userId);
                    if (s && s.cleanup) s.cleanup();
                    sessions.delete(userId);
                },
            },
        });

        // 1. STORE SESSION FIRST (Fixes race condition)
        sessions.set(userId, {
            session,
            userWs,
            sessionId, // Store the real session ID
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
            }, 500);
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

        // 4. Listen for Background Job Completions (Parallel Task Capability)
        const jobHandler = (job: any) => {
            if (job.userId === userId) {
                logger.info(`[MultimodalLive] Job ${job.id} completed for ${userId}. Injecting natural interruption.`);

                const tool = toolRegistry.getTool(job.toolName);
                const toolLabel = tool?.name.split('.').pop()?.replace(/_/g, ' ') || job.toolName;
                const deliveryPrompt = tool?.deliveryPrompt || "Briefly inform the user it is done.";

                // Inject context into Gemini session so Zena knows
                session.sendClientContent({
                    turns: [{
                        role: 'user',
                        parts: [{
                            text: `[SYSTEM: BACKGROUND TASK COMPLETED]\nThe task "${toolLabel}" is done.\nContext: ${job.outputSummary || 'No summary available'}\nAction: ${deliveryPrompt}\nExample: "Pardon the interruption, but I've got those numbers... [Insight]. Now, where were we?"`
                        }]
                    }]
                });
            }
        };

        jobManager.on('job_completed', jobHandler);

        // CLEANUP: Remove listener when session closes
        const anySession = session as any;
        const originalOnClose = anySession.callbacks?.onclose;

        // Enhance the sessions map to include the cleanup
        const userSessionData = sessions.get(userId);
        if (userSessionData) {
            sessions.set(userId, {
                ...userSessionData,
                cleanup: () => {
                    jobManager.off('job_completed', jobHandler);
                    if (originalOnClose) originalOnClose();
                }
            } as any);
        }

    } catch (err: any) { // Added type to catch variable
        logger.error(`[MultimodalLive] Failed to start session for ${userId}: `, err);
        websocketService.sendToClientProxy(userWs, {
            type: 'voice.live.error',
            payload: { message: `Failed to connect: ${err?.message || 'Unknown error'} ` }
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
            console.log(`[MultimodalLive] 🔍 DIAGNOSTIC - Full message keys for ${userId}: `, Object.keys(message));
            if (serverContent) {
                console.log(`[MultimodalLive] 🔍 DIAGNOSTIC - serverContent keys: `, Object.keys(serverContent));
                if (serverContent.modelTurn || serverContent.model_turn) {
                    const modelTurn = serverContent.modelTurn || serverContent.model_turn;
                    console.log(`[MultimodalLive] 🔍 DIAGNOSTIC - modelTurn keys: `, Object.keys(modelTurn));
                    if (modelTurn.parts) {
                        modelTurn.parts.forEach((part: any, idx: number) => {
                            console.log(`[MultimodalLive] 🔍 DIAGNOSTIC - part[${idx}]keys: `, Object.keys(part));
                        });
                    }
                }
            }
            // Also check for grounding in metadata at top level
            if (message.metadata) {
                console.log(`[MultimodalLive] 🔍 DIAGNOSTIC - metadata keys: `, Object.keys(message.metadata));
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
                console.log(`[MultimodalLive] Captured ${chunks.length} Grounding Chunks for ${userId}: `, JSON.stringify(chunks).substring(0, 1000));

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
                                console.log(`[MultimodalLive] ⛔ Filtering out US source: ${hostname} `);
                                return;
                            }

                            const displayTitle = title || hostname;
                            const link = `- [${displayTitle}](${uri})`;
                            if (!userSession.groundingSources.includes(link)) {
                                console.log(`[MultimodalLive] ✅ Adding NZ source: ${displayTitle} `);
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
            console.log(`[MultimodalLive] TOOL CALLS for ${userId}: `, JSON.stringify(calls));

            // Wrap in async IIFE to allow await
            (async () => {
                const responses = [];
                for (const call of calls) {
                    console.log(`[MultimodalLive] 🛠️ Executing tool: ${call.name} for ${userId}`);

                    // 1. Find the tool
                    const allTools = toolRegistry.getAllTools();
                    const tool = toolExecutionService.findTool(call.name, allTools);

                    if (!tool) {
                        console.warn(`[MultimodalLive] Tool not found: ${call.name} `);
                        responses.push({
                            id: call.id,
                            name: call.name,
                            response: { error: `Tool ${call.name} not found.` }
                        });
                        continue;
                    }

                    // 2. Proactive Context Enrichment for Creation Tools
                    let enrichedArgs = call.args;
                    if (tool.name.includes('.create')) {
                        const entityType = tool.name.split('.')[0] as any;
                        if (['property', 'contact', 'deal'].includes(entityType)) {
                            const scanResult = await proactiveContextService.scanForContext(userId, 'create', entityType, call.args);
                            if (scanResult.success && scanResult.suggestedData) {
                                enrichedArgs = { ...call.args, ...scanResult.suggestedData };
                            }
                        }
                    }

                    // 3. Resolve smart parameters (ID Injection, etc.)
                    // Fetch real session from sessionManager
                    const agentSession = sessionManager.getOrCreateSession(userId, userSession.sessionId);
                    const turnEntityMap = new Map<string, string>(); // Turn level map for Live is simpler, but could be expanded

                    const finalArgs = await agentOrchestrator.resolveSmartParameters(
                        agentSession,
                        tool,
                        enrichedArgs,
                        turnEntityMap
                    );

                    // 4. Execute the tool
                    const context = {
                        userId,
                        sessionId: userSession.sessionId,
                        conversationId: agentSession.conversationId,
                        approvalConfirmed: true,
                        isVoice: true
                    };

                    const execution = await toolExecutionService.executeTool(tool.name, finalArgs, context);

                    if (execution.success) {
                        responses.push({
                            id: call.id,
                            name: call.name,
                            response: { result: execution.result }
                        });

                        // 🧠 ZENA INTEL: Track entities globally for session memory
                        agentOrchestrator.trackEntitiesFromResult(userSession.sessionId, tool.domain, execution.result);

                        // 🧠 PROACTIVE MULTI-STEP: Inject follow-up suggestion based on what was just done
                        const proactiveResult = proactivenessService.synthesizeProactiveStatement(tool.name, execution.result);
                        if (proactiveResult.text) {
                            console.log(`[MultimodalLive] 🚀 Proactive suggestion queued: ${proactiveResult.text}`);

                            // Generate the product buttons for UI transcript using unified logic
                            const buttonResult = [{ tool: tool.name, result: { success: true, data: execution.result } }];
                            const productButtons = agentOrchestrator.generateProductButtons(buttonResult);
                            const augmentedSuggestion = proactiveResult.text + (productButtons ? `\n\n${productButtons}` : '');

                            // Inject into the next turn as a system prompt to Gemini Live
                            session.sendClientContent({
                                turns: [{
                                    role: 'user',
                                    parts: [{ text: `[SYSTEM: PROACTIVE ACTION REQUIRED]\n${augmentedSuggestion}\n\nAsk the user if they want to proceed with these actions. Be witty and characteristic.` }]
                                }]
                            });
                        }
                    } else {
                        responses.push({
                            id: call.id,
                            name: call.name,
                            response: { error: execution.error || "Execution failed" }
                        });
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
                console.log(`[MultimodalLive] Non - content message for ${userId}: `, JSON.stringify(message).substring(0, 200));
            }
            return;
        }

        // VERBOSE LOGGING: Log what fields are present in serverContent
        // const _fields = Object.keys(serverContent);
        // Gemini uses 'inputTranscription' and 'outputTranscription' (not 'input_audio_transcription')
        const inputTransc = serverContent.inputTranscription || serverContent.input_audio_transcription || serverContent.inputAudioTranscription;
        const outputTransc = serverContent.outputTranscription || serverContent.output_audio_transcription || serverContent.outputAudioTranscription;
        const modelTurn = serverContent.model_turn || serverContent.modelTurn;
        const turnComplete = serverContent.turn_complete || serverContent.turnComplete;

        if (inputTransc || outputTransc) {
            console.log(`[MultimodalLive] TRANSCRIPT for ${userId}: `, 'output:', outputTransc?.text, 'input:', inputTransc?.text);
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
                    const buffer = Buffer.from(data, 'base64');
                    const isSilent = buffer.every(b => b === 0);
                    console.log(`[MultimodalLive] Audio chunk for ${userId}, size: ${data.length}, bytes: ${buffer.length}, IS_SILENT: ${isSilent} `);
                    if (!isSilent) {
                        console.log(`[MultimodalLive] Sample bytes: ${buffer.subarray(0, 10).toString('hex')} `);
                    }

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
            console.log(`[MultimodalLive] USER SPOKE for ${userId}: `, text, 'Finished:', isFinished);

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
                        console.log(`[MultimodalLive] Finalized user segment for ${userId}: `, text);
                    } else if (userSession.currentInterimTranscript.length > 0) {
                        // Fallback: if finished text is empty, use last interim
                        userSession.userTranscriptBuffer.push(userSession.currentInterimTranscript);
                        console.log(`[MultimodalLive] Using interim as final for ${userId}: `, userSession.currentInterimTranscript);
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

            console.log(`[MultimodalLive] Zena said for ${userId}: `, outputTransc.text, 'Finished:', isFinal);

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
                    console.log(`[MultimodalLive] 📚 Sources: `, userSession.groundingSources);

                    // Send sources as a dedicated message type
                    websocketService.sendToClientProxy(userWs, {
                        type: 'voice.live.sources',
                        payload: {
                            sources: userSession.groundingSources,
                            formattedText: `\n\n ** Verified Sources:**\n${userSession.groundingSources.join('\n')} `
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
                    console.log(`[MultimodalLive] Flushing interim transcript as final for ${userId}: `, userSession.currentInterimTranscript);
                    userSession.userTranscriptBuffer.push(userSession.currentInterimTranscript);
                    userSession.currentInterimTranscript = '';
                }

                if (userSession.userTranscriptBuffer.length > 0) {
                    const fullUserTranscript = userSession.userTranscriptBuffer.join(' ').trim();
                    if (fullUserTranscript) {
                        console.log(`[MultimodalLive] Sending full user transcript for ${userId}: `, fullUserTranscript);
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
        console.error(`[MultimodalLive] Error handling message for ${userId}: `, error?.message || error);
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
        console.error(`[MultimodalLive] Error sending audio for ${userId}: `, error?.message || error);
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

        if (userSession.cleanup) {
            userSession.cleanup();
        }
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
        console.error(`[MultimodalLive] Error sending prompt for ${userId}: `, error?.message || error);
    }
}

// Export as a service object for compatibility
export const multimodalLiveService = {
    startSession: startLiveSession,
    sendAudioChunk,
    stopSession: stopLiveSession,
    sendPrompt,
};
