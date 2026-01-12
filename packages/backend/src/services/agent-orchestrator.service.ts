/**
 * Agent Orchestrator Service
 * 
 * The "Brain" of Zena. Coordinates between:
 * - User input (text/voice)
 * - Session state (SessionManager)
 * - Tools (ToolRegistry)
 * - LLM (Gemini 2.0/3 Flash)
 */

import { sessionManager, AgentSession, CurrentFocus, ConversationMessage } from './session-manager.service.js';
import { toolRegistry } from '../tools/registry.js';
import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../tools/types.js';
import '../tools/index.js';
import { websocketService } from './websocket.service.js';
import { logger } from './logger.service.js';
import prisma from '../config/database.js';
import { proactiveContextService } from './proactive-context.service.js';
import { getNZDateTime } from '../utils/date-utils.js';
// Node 25 has built-in fetch

export interface OrchestratorResponse {
    answer: string;
    toolCalls?: any[];
    requiresApproval?: boolean;
    pendingAction?: any;
    sessionId: string;
}

class AgentOrchestratorService {
    private readonly GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    private readonly GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
    private readonly GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${this.GEMINI_MODEL}:generateContent?key=${this.GEMINI_API_KEY}`;

    /**
     * Main entry point for processing user queries
     */
    async processQuery(userId: string, query: string, options: { conversationId?: string, isVoice?: boolean } = {}): Promise<OrchestratorResponse> {
        // ═══════════════════════════════════════════════════════════════
        // 🧠 ZENA DEBUG - AGENT ORCHESTRATOR ENTRY
        // ═══════════════════════════════════════════════════════════════
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('🧠 ZENA DEBUG - AGENT ORCHESTRATOR ENTRY');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('👤 User ID:', userId);
        console.log('💬 Full Query:', query);
        console.log('🆔 Conversation ID:', options.conversationId || 'None');
        console.log('🎤 Is Voice Mode:', options.isVoice || false);
        console.log('═══════════════════════════════════════════════════════════════\n');

        logger.info(`[AgentOrchestrator] Processing query for user ${userId}: "${query}"`);

        // 1. Get or create session
        const session = sessionManager.getOrCreateSession(userId, options.conversationId);
        if (options.isVoice) session.isVoiceMode = true;

        // 🔍 ADVANCED DEBUG: Log session state immediately
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('🔍 SESSION STATE AT ENTRY');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📍 Session ID:', session.sessionId);
        console.log('👤 User ID:', session.userId);
        console.log('🕐 Last Activity:', session.lastActivityAt.toISOString());
        console.log('⏳ Pending Confirmation:', session.pendingConfirmation ?
            `YES - Tool: ${session.pendingConfirmation.toolName}` : 'NONE');
        if (session.pendingConfirmation) {
            console.log('   📦 Pending Params:', JSON.stringify(session.pendingConfirmation.accumulatedParams));
        }
        console.log('═══════════════════════════════════════════════════════════════\n');

        // Log session state to debug.log (file) for persistent debugging
        logger.info(`[AgentOrchestrator] Session state - ID: ${session.sessionId}, User: ${session.userId}, PendingConfirmation: ${session.pendingConfirmation ? session.pendingConfirmation.toolName : 'NONE'}`);

        // ═══════════════════════════════════════════════════════════════
        // 🧠 ZENA DEBUG - CONFIRMATION CHECK
        // ═══════════════════════════════════════════════════════════════
        const lowerQuery = query.toLowerCase().trim();
        const isAffirmative = ['yes', 'y', 'yup', 'correct', 'confirm', 'approve', 'ok', 'okay', 'do it'].includes(lowerQuery);
        const isNegative = ['no', 'n', 'nope', 'cancel', 'stop', 'dont', 'don\'t', 'deny'].includes(lowerQuery);

        // Log confirmation check to debug.log
        if (isAffirmative || isNegative) {
            logger.info(`[AgentOrchestrator] User response: ${isAffirmative ? 'AFFIRMATIVE' : 'NEGATIVE'}, PendingConfirmation present: ${!!session.pendingConfirmation}`);
        }

        if (session.pendingConfirmation && (isAffirmative || isNegative)) {
            logger.info(`[AgentOrchestrator] CONFIRMATION HANDLER ENTERED - Tool: ${session.pendingConfirmation.toolName}, Response: ${isAffirmative ? 'AFFIRMATIVE' : 'NEGATIVE'}`);
            console.log('\n═══════════════════════════════════════════════════════════════');
            console.log('🧠 ZENA DEBUG - HANDLING PENDING CONFIRMATION');
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('🔧 Pending Tool:', session.pendingConfirmation.toolName);
            console.log('🔘 User Response:', isAffirmative ? 'AFFIRMATIVE' : 'NEGATIVE');
            console.log('═══════════════════════════════════════════════════════════════\n');

            if (isAffirmative) {
                const pending = session.pendingConfirmation;
                const tool = toolRegistry.getTool(pending.toolName);
                logger.info(`[AgentOrchestrator] Looking up tool "${pending.toolName}" - Found: ${!!tool}`);

                if (tool) {
                    logger.info(`[AgentOrchestrator] EXECUTING confirmed tool: ${tool.name}`);
                    // Clear pending immediately to avoid double execution
                    sessionManager.clearPendingConfirmation(session.sessionId);

                    // 🧠 ZENA AUTO-EXECUTE: Once user confirms ONE action, all subsequent actions are auto-approved
                    // This prevents annoying back-and-forth for multi-action commands
                    session.autoExecuteMode = true;
                    logger.info(`[AgentOrchestrator] AUTO-EXECUTE MODE ENABLED for session ${session.sessionId}`);

                    // Add user message to history
                    sessionManager.addMessage(session.sessionId, { role: 'user', content: query });

                    // Re-prepare context for tool execution WITH approvalConfirmed
                    const context: ToolExecutionContext = {
                        userId,
                        sessionId: session.sessionId,
                        conversationId: session.conversationId,
                        isVoiceMode: session.isVoiceMode,
                        approvalConfirmed: true // CRITICAL: This enables execution
                    };

                    // Use accumulatedParams which contains merged data from all turns
                    let finalParams = { ...pending.accumulatedParams } || pending.payload;

                    // 🧠 ZENA SUPER-SMART: Merge suggested context data on confirmation
                    if (finalParams.__suggestedData) {
                        const suggestions = finalParams.__suggestedData;
                        for (const [key, value] of Object.entries(suggestions)) {
                            // Only fill in if not already provided by user
                            if (finalParams[key] === undefined || finalParams[key] === null || finalParams[key] === '') {
                                console.log(`   📋 Merging suggested ${key}: ${value}`);
                                finalParams[key] = value;
                            }
                        }
                        delete finalParams.__suggestedData; // Clean up before execution
                    }

                    console.log('🧠 ZENA DEBUG - EXECUTING TOOL WITH ACCUMULATED PARAMS');
                    console.log('   Tool:', tool.name);
                    console.log('   Final Params:', JSON.stringify(finalParams, null, 2));

                    // Execute the tool that was waiting
                    const result = await tool.execute(finalParams, context);

                    // Handle the tool result just like handleGeminiResponse does
                    websocketService.broadcastToUser(userId, 'agent.tool_call', {
                        toolName: tool.name,
                        status: result.success ? 'success' : 'error',
                        result: result.data
                    });

                    sessionManager.addMessage(session.sessionId, {
                        role: 'assistant',
                        content: `(Executed ${tool.name})`,
                        toolName: tool.name
                    });

                    this.trackEntitiesFromResult(session.sessionId, tool.domain, result.data);

                    if (result.success) {
                        const systemPrompt = this.buildSystemPrompt(session);

                        // 🧠 ZENA SUPER-SMART: After confirmation, we need to provide ALL tools relevant to the ORIGINAL command
                        // so that Gemini can continue with the rest of the steps (updating price, linking contacts, etc.)
                        // Use stored originalQuery from pendingConfirmation (most reliable), fallback to conversation history
                        const originalQuery = pending.originalQuery ||
                            session.conversationHistory
                                .filter(m => m.role === 'user' && !m.content.startsWith('[TOOL_RESULT]') && !['yes', 'no', 'y', 'n'].includes(m.content.toLowerCase().trim()))
                                .pop()?.content;

                        const followUpTools = originalQuery
                            ? this.selectTools(originalQuery, session)
                            : [tool]; // Fallback to just this tool if can't find original

                        logger.info(`[AgentOrchestrator] Confirmation follow-up with ${followUpTools.length} tools (Original Query: "${originalQuery?.substring(0, 50) || 'Unknown'}...")`);

                        return await this.processFollowUp(userId, session, result.data, followUpTools, systemPrompt);
                    } else {
                        return {
                            answer: `I encountered an error while trying to ${tool.name}: ${result.error}`,
                            sessionId: session.sessionId
                        };
                    }
                } else {
                    // Tool not found in registry - this is a bug!
                    logger.error(`[AgentOrchestrator] CRITICAL: Tool "${pending.toolName}" not found in registry! Available tools: ${toolRegistry.getAllTools().map(t => t.name).slice(0, 10).join(', ')}...`);
                    sessionManager.clearPendingConfirmation(session.sessionId);
                    return {
                        answer: `I tried to execute ${pending.toolName} but that tool is not available. This seems to be a system issue.`,
                        sessionId: session.sessionId
                    };
                }
            } else {
                // Negative response
                sessionManager.clearPendingConfirmation(session.sessionId);
                return {
                    answer: "No problem, I've canceled that action. Is there anything else I can help with?",
                    sessionId: session.sessionId
                };
            }
        }

        // 2. Select relevant tools for this turn
        const tools = this.selectTools(query, session);

        // 🧠 ZENA SUPER-INTEL: Context Switch Detection
        // If the user's latest query is a "full command" (not a simple yes/no) 
        // and there's a pending confirmation, we check if we should clear it.
        if (session.pendingConfirmation && !['yes', 'no', 'y', 'n'].includes(query.toLowerCase().trim())) {
            // If the query contains a new address or person name that doesn't match the pending one,
            // we assume the user has changed their mind and wants to start a new command.
            const pendingParams = session.pendingConfirmation.accumulatedParams || session.pendingConfirmation.payload;
            const newAddress = query.match(/\d+[\w\s,]+Street|Road|Avenue|Lane/i)?.[0];
            const newName = query.match(/(?:for|with|link|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/)?.[1];

            const isAddressSwitch = newAddress && pendingParams.address && !pendingParams.address.toLowerCase().includes(newAddress.toLowerCase());
            const isNameSwitch = newName && pendingParams.name && !pendingParams.name.toLowerCase().includes(newName.toLowerCase());
            const isIntentSwitch = query.toLowerCase().includes('create') || query.toLowerCase().includes('search') || query.toLowerCase().includes('find');

            if (isAddressSwitch || isNameSwitch || isIntentSwitch) {
                logger.info(`[AgentOrchestrator] Context switch detected (Switch: ${isAddressSwitch ? 'Address' : isNameSwitch ? 'Name' : 'Intent'}). Clearing pending action.`);
                sessionManager.clearPendingConfirmation(session.sessionId);
            }
        }

        // 🧠 ZENA CONTEXT PRESERVATION: Add user message to history immediately
        // This ensures follow-up turns (synthesis) have the original request context.
        // We only add it if it's not already the latest message (prevents duplication)
        const history = session.conversationHistory;
        const lastMsg = history[history.length - 1];
        if (!lastMsg || lastMsg.content !== query || lastMsg.role !== 'user') {
            sessionManager.addMessage(session.sessionId, { role: 'user', content: query });
        }

        logger.agent('Query received', {
            userId,
            sessionId: session.sessionId,
            query: query.substring(0, 500),
            domains: Array.from(new Set(tools.map(t => t.domain))),
            toolCount: tools.length,
            focus: session.currentFocus
        });

        const functionDeclarations = toolRegistry.toGeminiFunctions(tools);

        // 3. Prepare prompt and context
        const systemPrompt = this.buildSystemPrompt(session);

        // 4. Call Gemini with function calling enabled
        const startTime = Date.now();
        const response = await this.callGemini(userId, session.sessionId, query, systemPrompt, session.conversationHistory, functionDeclarations);
        const duration = Date.now() - startTime;

        logger.agent('Gemini response received', {
            sessionId: session.sessionId,
            durationMs: duration,
            hasToolCalls: !!(response.candidates?.[0]?.content?.parts?.some((p: any) => p.functionCall))
        });

        // 5. Handle response (text or tool call)
        return await this.handleGeminiResponse(userId, session, response, tools, systemPrompt);
    }

    /**
     * Internal loop for processing tool results or follow-up turns
     */
    private async processFollowUp(userId: string, session: AgentSession, toolResult: any, availableTools: ZenaToolDefinition[], systemPrompt: string): Promise<OrchestratorResponse> {
        // Add tool result to history in a way Gemini understands (using tool role or system hint)
        const toolResultMsg = {
            role: 'user' as const,
            content: `[TOOL_RESULT] ${JSON.stringify(toolResult)}`
        };

        // 🔥 ZENA CONTEXT PERSERVATION: Persist tool results to the session history
        // so that Gemini remembers what was found/done in the NEXT turn.
        sessionManager.addMessage(session.sessionId, toolResultMsg);

        const temporaryHistory = session.conversationHistory;

        // 🧠 ZENA COMMAND MODE: When autoExecuteMode is true, be VERY assertive about just doing the job
        const synthesisPrompt = session.autoExecuteMode
            ? `The user already confirmed their intent. Execute the requested property creation action NOW without asking any questions. DO NOT ask "Would you like me to...". DO NOT mention IDs or UUIDs. Report back what was done in a concise, action-focused summary.

               ⚠️ CRITICAL UNBUNDLING RULE: If you just executed property.create, do NOT auto-call property.generate_comparables or property.add_milestone in the same response. Instead, OFFER: "Would you like me to set up the standard campaign milestones and generate a CMA for this property?"
               
               CRITICAL TRUST REQUIREMENT: When presenting market data or comparable sales, you MUST format every property address and source portal as a clickable markdown link: [Address](URL). Plain text site names are strictly forbidden.
               
               🚨 TOOL EXECUTION REQUIRED (only when explicitly requested by user):
               - For CMA: You MUST call property.generate_comparables. DO NOT make up addresses or prices.
               - For milestones: You MUST call property.add_milestone for EACH milestone. DO NOT just mention milestones without creating them.
               - Only use data returned FROM the tools. Never fabricate results.`
            : `IMPORTANT: If the user confirmed a suggested action (CMA, milestones, discovery), you MUST call the actual tools.

               🚨 MANDATORY TOOL EXECUTION RULES:
               1. For CMA/Comparables: Call property.generate_comparables with the propertyId. DO NOT generate fake addresses from your training data.
               2. For Milestones: Call property.add_milestone for EACH milestone you want to add. Just mentioning milestones DOES NOT create them.
               3. For Discovery: Call contact.run_discovery with the contactId.
               4. Only use data returned FROM the tool results. Never fabricate addresses, prices, or dates.
               5. If a tool fails, report the error—do not make up results.
               
               Synthesize any completed results for the user. Use markdown links [Address](URL) for all CMA data.`;


        logger.agent('Starting follow-up turn', {
            sessionId: session.sessionId,
            autoExecuteMode: session.autoExecuteMode
        });

        const response = await this.callGemini(userId, session.sessionId, synthesisPrompt, systemPrompt, temporaryHistory, toolRegistry.toGeminiFunctions(availableTools));
        return await this.handleGeminiResponse(userId, session, response, availableTools, systemPrompt);
    }

    /**
     * Dynamically select tools based on intent and session focus
     */
    private selectTools(query: string, session: AgentSession): ZenaToolDefinition[] {
        const q = query.toLowerCase();
        const domains = new Set<string>(['core']); // Always include core

        // Intent detection (simplified for now, Phase 2 will enhance this)
        if (q.includes('email') || q.includes('inbox') || q.includes('message') || session.currentFocus.type === 'thread') {
            domains.add('inbox');
        }
        if (q.includes('deal') || q.includes('pipeline') || q.includes('portfolio') || q.includes('business') || q.includes('summary') || session.currentFocus.type === 'deal') {
            domains.add('deal');
        }
        if (q.includes('contact') || q.includes('person') || q.includes('who is') || q.includes('note') || session.currentFocus.type === 'contact') {
            domains.add('contact');
        }
        if (q.includes('property') || q.includes('address') || q.includes('listing') || q.includes('market analysis') || q.includes('cma') || session.currentFocus.type === 'property') {
            domains.add('property');
        }

        // 🧠 ZENA SMART AFFIRMATIVE: If user says "yes" or "ok" and we have a property focus,
        // include property tools even if addresses aren't explicitly mentioned.
        const isAffirmative = ['yes', 'y', 'yup', 'do it', 'ok', 'okay', 'yes to all'].includes(q);
        if (isAffirmative && (session.currentFocus.type === 'property' || session.recentEntities.properties.length > 0)) {
            domains.add('property');
            domains.add('task'); // Often milestones/tasks follow property creation
        }

        // 🔥 ZENA CONTEXT REINFORCEMENT: If we have ANY recent entities, include their domains
        if (session.recentEntities.properties.length > 0) domains.add('property');
        if (session.recentEntities.contacts.length > 0) domains.add('contact');
        if (session.recentEntities.deals.length > 0) domains.add('deal');
        if (session.recentEntities.tasks.length > 0) domains.add('task');

        if (q.includes('task') || q.includes('todo') || q.includes('remind') || q.includes('follow up') || q.includes('reminder') || session.currentFocus.type === 'task') {
            domains.add('task');
        }

        // 🧠 ZENA SMART DOMAIN DETECTION: Look for names and addresses in the query
        // Detect likely contact names (Capitalized capitalized)
        const namePattern = /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g;
        if (namePattern.test(query)) {
            domains.add('contact');
        }
        // Detect likely addresses (number + comma? + space? + word)
        const addressPattern = /\b\d+,?\s+[A-Z][a-z]+\b/g;
        if (addressPattern.test(query)) {
            domains.add('property');
        }

        // If 'create' or 'update' or 'log' is mentioned, be more inclusive
        if (q.includes('create') || q.includes('update') || q.includes('log') || q.includes('change')) {
            // For now, if updating/creating, include the most likely domains
            if (q.includes('chen') || q.includes('smith') || q.includes('john') || q.includes('jane')) {
                domains.add('contact');
            }
            // UNIVERSAL FALLBACK: If doing an action, always include major domains to be safe
            domains.add('contact');
            domains.add('property');
            domains.add('deal');
        }

        // MCP-specific intent detection (e.g., github, slack)
        const allTools = toolRegistry.getAllTools();
        const mcpDomains = new Set(allTools.filter(t => t.isMCP).map(t => t.domain));
        for (const mcpDomain of mcpDomains) {
            if (q.includes(mcpDomain)) {
                domains.add(mcpDomain);
            }
        }

        // Always include the domain of a pending action to ensure the tool is available during confirmation turns
        if (session.pendingConfirmation) {
            const tool = toolRegistry.getTool(session.pendingConfirmation.toolName);
            if (tool) {
                domains.add(tool.domain);
            }
        }

        // Get tools for selected domains
        const selectedTools: ZenaToolDefinition[] = [];
        for (const domain of domains) {
            selectedTools.push(...toolRegistry.getToolsByDomain(domain));
        }

        return selectedTools;
    }

    /**
     * Core Gemini API call with function support
     */
    private async callGemini(
        userId: string,
        sessionId: string,
        query: string,
        systemPrompt: string,
        history: ConversationMessage[],
        tools: any[]
    ): Promise<any> {
        const contents = [];

        // Add history
        for (const msg of history) {
            // Skips tool role for now (simplified)
            if (msg.role === 'tool') continue;

            // 🔥 ZENA INTEL: If this is the LATEST message and it's from the user,
            // check if it matches the current query. If so, we'll skip adding it twice.
            const isLatestUser = msg.role === 'user' && history.indexOf(msg) === history.length - 1;
            if (isLatestUser && msg.content === query) continue;

            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            });
        }

        // Add current query (the canonical latest message)
        contents.push({
            role: 'user',
            parts: [{ text: query }]
        });

        const body = {
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            contents,
            tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
            generationConfig: {
                temperature: 0.2, // Low temperature for tool reliability
                maxOutputTokens: 4096,
            }
        };

        logger.agent('Calling Gemini API', {
            sessionId,
            toolCount: tools.length,
            historyDepth: contents.length,
            model: this.GEMINI_MODEL,
            fullRequest: body // 🧠 LOG EVERYTHING
        });

        const response = await fetch(this.GEMINI_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.text();
            console.log('\n❌ ZENA DEBUG - GEMINI API ERROR:');
            console.log(err);
            logger.error(`[AgentOrchestrator] Gemini API error: ${err}`);
            throw new Error(`Gemini calling failed: ${response.statusText}`);
        }

        const responseJson = await response.json();

        if (responseJson.error) {
            logger.error(`[AgentOrchestrator] Gemini internal error: ${JSON.stringify(responseJson.error)}`);
            throw new Error(`Gemini internal error: ${responseJson.error.message}`);
        }

        return responseJson;
    }

    /**
     * Handle the response from Gemini, executing tools if needed
     */
    private async handleGeminiResponse(
        userId: string,
        session: AgentSession,
        geminiResponse: any,
        availableTools: ZenaToolDefinition[],
        systemPrompt: string
    ): Promise<OrchestratorResponse> {
        const candidate = geminiResponse.candidates?.[0];
        const parts = candidate?.content?.parts || [];

        // Check for function calls
        const toolCalls = parts.filter((p: any) => p.functionCall);

        logger.agent('Processing Gemini response', {
            sessionId: session.sessionId,
            toolCallCount: toolCalls.length,
            toolNames: toolCalls.map((tc: any) => tc.functionCall.name)
        });

        logger.info(`[AgentOrchestrator] Tool calls detected: ${toolCalls.map((tc: any) => tc.functionCall.name).join(', ')}`);

        if (toolCalls.length > 0) {
            // 🚀 ZENA PARALLEL SEARCH: Execute ALL search tools first to detect missing entities early
            const searchCalls = toolCalls.filter((tc: any) => tc.functionCall.name.endsWith('.search'));
            const actionCalls = toolCalls.filter((tc: any) => !tc.functionCall.name.endsWith('.search'));

            // 🔥 ZENA UX: If we are about to run slow tools (CMA, Discovery), notify the user immediately
            // This manages user expectations for the ~1 minute wait time
            const SLOW_TOOLS = ['property.generate_comparables', 'contact.run_discovery'];
            const hasSlowTools = actionCalls.some((tc: any) => SLOW_TOOLS.some(st => tc.functionCall.name.includes(st)));

            if (hasSlowTools) {
                logger.info(`[AgentOrchestrator] Detected slow tools, sending interim message`);
                websocketService.broadcastAgentMessage(userId, "Working on it! This involves a deep market analysis and may take up to 1-2 minutes so hang in there! 🚀");
            }

            const executedResults: any[] = [];

            if (searchCalls.length > 0) {
                console.log(`🧠 ZENA DEBUG: Executing ${searchCalls.length} search tool(s) in parallel first...`);

                const context: ToolExecutionContext = {
                    userId,
                    sessionId: session.sessionId,
                    conversationId: session.conversationId,
                    isVoiceMode: session.isVoiceMode
                };

                // Execute all searches 
                for (const searchCall of searchCalls) {
                    if (!searchCall.functionCall) continue;
                    const call = searchCall.functionCall;
                    const tool = this.findTool(call.name, availableTools);

                    if (!tool) {
                        console.log(`⚠️ ZENA DEBUG: Search tool "${call.name}" not found in available tools.`);
                        continue;
                    }

                    console.log(`🔍 Executing search: ${tool.name} with args:`, call.args);
                    const result = await tool.execute(call.args, context);

                    // Track found entities
                    if (result.success && result.data?.found) {
                        this.trackEntitiesFromResult(session.sessionId, tool.domain, result.data.contact || result.data.property || result.data.deal);
                        executedResults.push(result.data); // 🚀 ZENA INTEL: Collect result to trigger follow-up turn
                    }

                    // 🧠 ZENA CONTEXT: Add search result to history so Gemini knows it happened
                    sessionManager.addMessage(session.sessionId, {
                        role: 'assistant',
                        content: `(Searching for ${tool.domain}: ${call.args.address || call.args.name || call.args.query})`,
                        toolName: tool.name
                    });

                    sessionManager.addMessage(session.sessionId, {
                        role: 'user', // We use 'user' role for tool results in raw contents
                        content: `[TOOL_RESULT] ${JSON.stringify(result.data)}`,
                        toolName: tool.name
                    });

                    // 🛑 EARLY EXIT: If any search returns "not found", immediately offer to create
                    // 🛑 EARLY EXIT: If any search returns "not found", immediately offer to create
                    if (result.success && result.data?.found === false) {
                        const entityType = tool.domain;
                        const searchTerm = call.args.address || call.args.name || call.args.query || call.args.propertyAddress || call.args.contactName || 'the requested item';

                        console.log(`🛑 ZENA EARLY EXIT: ${entityType} "${searchTerm}" not found - offering creation`);

                        // 🔥 PROACTIVE WEB SEARCH: Before offering creation, check if we can find it on the web
                        // This ensures the user sees property details immediately, not after they say "yes"
                        let webContextResult = null;
                        let accumulatedParams = this.buildCreatePayloadFromSearch(entityType, call.args);

                        if (entityType === 'property' && searchTerm) {
                            console.log(`🌐 [EARLY EXIT] Running web search for "${searchTerm}" before offering creation...`);
                            websocketService.broadcastAgentMessage(userId, "Searching the web for property details... 🔎");
                            try {
                                const start = Date.now();
                                webContextResult = await proactiveContextService.scanForContext(userId, 'create', 'property', { address: searchTerm });
                                console.log(`🌐 [EARLY EXIT] Web search took ${Date.now() - start}ms. Found: ${webContextResult.hasMatches}`);

                                if (webContextResult.hasMatches) {
                                    // Merge found data into params for the pending action
                                    accumulatedParams = { ...accumulatedParams, ...webContextResult.suggestedData };

                                    // Remove 'listingPrice' from auto-fill to be safe, unless we want it
                                    delete accumulatedParams.listingPrice;
                                }
                            } catch (err) {
                                console.error('🌐 [EARLY EXIT] Web search failed:', err);
                            }
                        }

                        // Get the original query from conversation history (since 'query' is not available in this scope)
                        const origUserMsg = session.conversationHistory
                            .filter(m => m.role === 'user' && !m.content.startsWith('[TOOL_RESULT]') && !['yes', 'no', 'y', 'n'].includes(m.content.toLowerCase().trim()))
                            .pop();

                        // Construct the answer based on whether we found web data
                        let answer = `I couldn't find a ${entityType} matching "**${searchTerm}**" in your database.`;

                        if (webContextResult?.hasMatches) {
                            answer += `\n\nHowever, I found some details online:\n${webContextResult.summaryForUser}\n\nShall I create a new property card with these details?`;
                        } else {
                            answer += ` Would you like me to create a new ${entityType} card for it?`;
                        }

                        sessionManager.setPendingConfirmation(session.sessionId, {
                            toolName: `${entityType}.create`,
                            payload: accumulatedParams,
                            confirmationPrompt: answer,
                            isDestructive: false,
                            accumulatedParams: accumulatedParams,
                            originalQuery: origUserMsg?.content,  // Store original query for multi-action completion
                            wasPrompted: true,
                            contextScanned: true // Mark as scanned so we don't scan again
                        });

                        // 🔍 VERIFY confirmation was saved
                        const verifySession = sessionManager.getSession(session.sessionId);
                        logger.info(`[AgentOrchestrator] SET pendingConfirmation - SessionID: ${session.sessionId}, ToolName: ${entityType}.create, OriginalQuery: "${origUserMsg?.content?.substring(0, 50) || 'Unknown'}...", Verified: ${verifySession?.pendingConfirmation?.toolName || 'NONE'}`);

                        sessionManager.addMessage(session.sessionId, {
                            role: 'assistant',
                            content: answer
                        });

                        return {
                            answer,
                            requiresApproval: true,
                            pendingAction: {
                                toolName: `${entityType}.create`,
                                args: accumulatedParams
                            },
                            sessionId: session.sessionId
                        };
                    }
                }

            }



            // 🚀 ZENA MULTI-ACTION: Process action tools
            // We execute as many as we can auto-approve. If we hit one needing approval:
            // - If we already did some work, we stop and synthesize so Gemini can re-emit the rest.
            // - If we haven't done anything, we show the approval prompt.

            for (const toolCall of actionCalls) {
                const call = toolCall.functionCall;
                if (!call) continue;

                const tool = this.findTool(call.name, availableTools);

                if (!tool) {
                    logger.error(`[AgentOrchestrator] Tool not found: ${call.name}`);
                    continue;
                }

                // Check for approval
                const existingPending = session.pendingConfirmation;
                let accumulatedParams: Record<string, any>;

                if (existingPending && existingPending.toolName === tool.name) {
                    accumulatedParams = { ...existingPending.accumulatedParams, ...call.args };
                } else {
                    accumulatedParams = { ...call.args };
                }

                // 🧠 ZENA SUPER-INTEL: Step 1 - Proactive Context & Enrichment Scan
                // 🔥 PERFORMANCE FIX: Only scan for TRUE creation tools, not updates/adds
                // This prevents slow web searches during simple update operations
                const TRUE_CREATION_TOOLS = ['property.create', 'contact.create', 'deal.create'];
                const isCreation = TRUE_CREATION_TOOLS.includes(tool.name);
                const lastScanKey = session.pendingConfirmation?.contextScannedKey;

                // 🔥 FAST-PATH: Skip if we already have key data (bedrooms, bathrooms, etc.)
                const alreadyHasData = accumulatedParams.bedrooms || accumulatedParams.bathrooms ||
                    accumulatedParams.emails?.length > 0 || accumulatedParams.phones?.length > 0;

                if (isCreation && !alreadyHasData) {
                    console.log(`⏱️ [Performance] Starting proactive context scan for ${tool.name}...`);

                    // 🚀 ZENA EXPECTATION MANAGEMENT: Notify user immediately about the proactive scan
                    // Since web search timeout is now 45s, we must inform the user.
                    websocketService.broadcastAgentMessage(userId, "I'm checking various data sources to fill in missing property details... this might take a moment. 🔎");

                    const scanStartTime = Date.now();

                    const entityType = tool.domain as 'property' | 'contact' | 'deal' | 'task' | 'calendar';
                    const contextResult = await proactiveContextService.scanForContext(userId, 'create', entityType, accumulatedParams);

                    console.log(`⏱️ [Performance] Proactive scan took ${Date.now() - scanStartTime}ms`);

                    if (contextResult.hasMatches && contextResult.scanKey !== lastScanKey) {
                        logger.agent('Found proactive context items', { tool: tool.name, matchCount: contextResult.matches.length, scanKey: contextResult.scanKey });

                        // 🔥 AUTO-MERGE: If we found data point that user didn't provide, fill them in.
                        // This allows auto-execution from web-lookup or email history.
                        for (const [key, value] of Object.entries(contextResult.suggestedData)) {
                            // 🚨 DATA INTEGRITY: Never silenty auto-enrich listingPrice.
                            // The user MUST provide this or explicitly confirm a suggested value.
                            if (key === 'listingPrice') continue;

                            if (accumulatedParams[key] === undefined || accumulatedParams[key] === null || accumulatedParams[key] === '') {
                                console.log(`   ✨ Auto-enriching ${key}: ${value}`);
                                accumulatedParams[key] = value;
                            }
                        }

                        // Also store results for potential display in prompt if we ultimately fail to auto-execute
                        accumulatedParams.__contextResult = contextResult;
                    }
                } else if (!isCreation) {
                    console.log(`⚡ [Performance] Skipping proactive scan for ${tool.name} (not a creation tool)`);
                } else if (alreadyHasData) {
                    console.log(`⚡ [Performance] Skipping proactive scan - data already provided`);
                }

                // 🧠 ZENA FRICTION REMOVAL: Auto-execute if all recommended fields are present
                // OR if we've already prompted for them once and the user has replied.
                // SPECIAL RULE: For "update" and "log" tools, auto-execute if ANY field is present and we're not deleting.
                const isDestructive = tool.name.includes('delete') || tool.name.includes('remove');
                const isUpdateOrLog = tool.name.includes('update') || tool.name.includes('add_note') || tool.name.includes('relationship_note');

                const hasAnyUpdateInfo = Object.keys(call.args).length > 0;
                const hasAllRecommended = tool.recommendedFields && tool.recommendedFields.every(f =>
                    accumulatedParams[f] !== undefined &&
                    accumulatedParams[f] !== null &&
                    (typeof accumulatedParams[f] !== 'string' || accumulatedParams[f].trim() !== '')
                );

                const wasAlreadyPrompted = existingPending?.wasPrompted || false;

                // 🔥 ZENA AGENT SUPER-INTEL: Auto-proceed if intent is clear
                // Also auto-execute if we're in autoExecuteMode (user already confirmed one action in this conversation)
                // EXCEPT for .create tools where we prioritize data richness (bedrooms, bathrooms, etc.)
                const shouldAutoExecute = !isDestructive && (
                    tool.requiresApproval === false ||
                    hasAllRecommended ||
                    (isUpdateOrLog && hasAnyUpdateInfo) ||
                    (session.autoExecuteMode === true && !(tool.name.includes('.create') || tool.name === 'contact.add'))
                );

                if (shouldAutoExecute) {
                    const context: ToolExecutionContext = {
                        userId,
                        sessionId: session.sessionId,
                        conversationId: session.conversationId,
                        isVoiceMode: session.isVoiceMode,
                        approvalConfirmed: true
                    };

                    console.log(`⚡ Auto-executing action: ${tool.name}`);
                    const result = await tool.execute(accumulatedParams, context);

                    this.trackEntitiesFromResult(session.sessionId, tool.domain, result.data);

                    websocketService.broadcastToUser(userId, 'agent.tool_call', {
                        toolName: tool.name,
                        status: result.success ? 'success' : 'error',
                        result: result.data
                    });

                    sessionManager.addMessage(session.sessionId, {
                        role: 'assistant',
                        content: `(Auto-executed ${tool.name})`,
                        toolName: tool.name
                    });

                    // 🔥 ZENA INTEL: Add tool result to history too!
                    sessionManager.addMessage(session.sessionId, {
                        role: 'user',
                        content: `[TOOL_RESULT] ${JSON.stringify(result.data)}`,
                        toolName: tool.name
                    });

                    if (result.success) {
                        executedResults.push(result.data);

                        // 🔥 ZENA INTEL: If we auto-executed and had context, mention it in the follow-up
                        if (accumulatedParams.__contextResult) {
                            sessionManager.addMessage(session.sessionId, {
                                role: 'system',
                                content: `Note: I used information found in your ${accumulatedParams.__contextResult.matches[0].source} to complete this.`
                            });
                        }

                        continue; // Keep going through actionCalls!
                    } else {
                        // Error during auto-execution
                        return {
                            answer: `I tried to automatically execute ${tool.name} for you, but it failed: ${result.error}`,
                            sessionId: session.sessionId
                        };
                    }
                }

                // If we get here, this tool REQUIRES APPROVAL
                // If we've already executed some tools, we stop and synthesize what we've done.
                // Gemini will re-emit the next tools (including this one) in the next turn.
                if (executedResults.length > 0) {
                    console.log(`⏸️ Interrupted multi-action flow: ${tool.name} requires approval. Synthesizing existing results first.`);
                    break;
                }

                // Standard approval flow for the first tool that needs it
                let prompt = tool.confirmationPrompt ? tool.confirmationPrompt(accumulatedParams) : `I need your approval to execute ${tool.name}.`;

                // 🧠 ZENA CONTEXT AWARENESS: Add scan results to prompt if available
                if (accumulatedParams.__contextResult) {
                    const contextResult = accumulatedParams.__contextResult;
                    prompt = contextResult.summaryForUser + '\n\n---\n\n' + prompt;
                }

                // 🧠 ZENA COGNITIVE AWARENESS: Check for missing recommended fields
                if (tool.recommendedFields && tool.recommendedFields.length > 0) {
                    const missingFields = tool.recommendedFields.filter(f => !accumulatedParams[f] || (typeof accumulatedParams[f] === 'string' && accumulatedParams[f].trim() === ''));
                    if (missingFields.length > 0) {
                        const fieldLabels = missingFields.map(f => f.replace(/([A-Z])/g, ' $1').toLowerCase()).join(', ');

                        // 🔥 ZENA SMART SYNTHESIS: Mention what we DID find vs what's missing
                        const enrichedFields = Object.keys(accumulatedParams).filter(k =>
                            tool.recommendedFields?.includes(k) &&
                            accumulatedParams[k] !== undefined &&
                            accumulatedParams[k] !== null &&
                            (typeof accumulatedParams[k] !== 'string' || accumulatedParams[k].trim() !== '') &&
                            k !== '__contextResult'
                        );

                        if (enrichedFields.length > 0) {
                            const foundLabels = enrichedFields.map(f => f.replace(/([A-Z])/g, ' $1').toLowerCase()).join(', ');
                            prompt += `\n\nI found the **${foundLabels}** on the web! 🌐`;
                        }

                        prompt += `\n\nI also noticed some details are still missing: **${fieldLabels}**. Would you like to add these now to make this record even richer?`;
                    }
                }

                // Store in session as pending with accumulated params
                // Get the original query from conversation history (since 'query' is not available in this scope)
                const lastUserMsg = session.conversationHistory
                    .filter(m => m.role === 'user' && !m.content.startsWith('[TOOL_RESULT]') && !['yes', 'no', 'y', 'n'].includes(m.content.toLowerCase().trim()))
                    .pop();

                sessionManager.setPendingConfirmation(session.sessionId, {
                    toolName: tool.name,
                    payload: call.args,
                    confirmationPrompt: prompt,
                    isDestructive: isDestructive,
                    accumulatedParams, // Use the merged accumulated params
                    originalQuery: lastUserMsg?.content,  // Store original query for multi-action completion
                    wasPrompted: true, // Mark as prompted so we don't loop
                    contextScannedKey: accumulatedParams.__contextResult?.scanKey // Store key of what we scanned
                });

                logger.agent('Tool requires approval', { tool: tool.name, prompt: prompt.substring(0, 100) });

                sessionManager.addMessage(session.sessionId, {
                    role: 'assistant',
                    content: prompt
                });

                return {
                    answer: prompt,
                    requiresApproval: true,
                    pendingAction: {
                        toolName: tool.name,
                        payload: accumulatedParams
                    },
                    sessionId: session.sessionId
                };
            } // End of actionCalls loop

            // If we executed tools, synthesize the results
            if (executedResults.length > 0) {
                const combinedResult = executedResults.length === 1 ? executedResults[0] : { multipleActions: true, results: executedResults };
                return await this.processFollowUp(userId, session, combinedResult, availableTools, systemPrompt);
            }

        } // End of if (toolCalls.length > 0)

        // No tool calls, just return text
        let finalResponseText = parts.map((p: any) => p.text || '').join('\n').trim();

        // 🧠 ZENA HANG PREVENTION: If Gemini provided tool calls that were invalid/filtered, 
        // and forgot to provide a text response, we must provide a fallback.
        if (!finalResponseText && toolCalls.length > 0) {
            finalResponseText = "I've processed your request. Is there anything specific you'd like to see next?";
        }

        if (finalResponseText) {
            sessionManager.addMessage(session.sessionId, {
                role: 'assistant',
                content: finalResponseText
            });

            return {
                answer: finalResponseText,
                sessionId: session.sessionId
            };
        }

        // Final fallback to avoid hang if absolutely nothing was generated
        return {
            answer: "I'm here to help. Could you please clarify what you'd like me to do?",
            sessionId: session.sessionId
        };
    }

    /**
     * Track entities returned from tool results for pronoun resolution
     */
    private trackEntitiesFromResult(sessionId: string, domain: string, data: any): void {
        if (!data) return;

        // 🧠 ZENA INTEL: Check for nested contacts first (common in property creation)
        if (data.contact && data.contact.id && data.contact.name) {
            sessionManager.trackEntity(sessionId, 'contact', data.contact);
            sessionManager.setFocus(sessionId, { type: 'contact', id: data.contact.id, metadata: { name: data.contact.name } });
        }

        // Standard tracking logic
        if (domain === 'contact' && data.id && data.name) {
            sessionManager.trackEntity(sessionId, 'contact', data);
            sessionManager.setFocus(sessionId, { type: 'contact', id: data.id, metadata: { name: data.name } });
        } else if (domain === 'property') {
            const property = data.property || data;
            if (property.id && property.address) {
                sessionManager.trackEntity(sessionId, 'property', property);
                sessionManager.setFocus(sessionId, { type: 'property', id: property.id, metadata: { address: property.address } });
            }
        } else if (domain === 'deal' && data.id && data.address) {
            sessionManager.trackEntity(sessionId, 'deal', data);
            sessionManager.setFocus(sessionId, { type: 'deal', id: data.id, metadata: { address: data.address } });
        } else if (data.task && data.task.id) {
            sessionManager.trackEntity(sessionId, 'task', data.task);
            sessionManager.setFocus(sessionId, { type: 'task', id: data.task.id, metadata: { subject: data.task.label } });
        }
    }

    /**
     * Build the Zena Agent System Prompt
     */
    private buildSystemPrompt(session: AgentSession): string {
        // Include pending action context if there's an action in progress
        let pendingContext = '';
        if (session.pendingConfirmation) {

            const params = session.pendingConfirmation.accumulatedParams || session.pendingConfirmation.payload;
            pendingContext = `
PENDING ACTION IN PROGRESS:
- Tool: ${session.pendingConfirmation.toolName}
- Collected Parameters: ${JSON.stringify(params)}
CRITICAL: When calling this tool again, you MUST include ALL these previously collected parameters plus any new ones from the user's latest message. Do NOT omit any previously provided values.`;
        }

        const nz = getNZDateTime();

        return `You are Zena, a highly intelligent AI real estate agent assistant for the New Zealand (NZ) market.
You have access to a variety of tools to help the user manage their inbox, deals, contacts, properties, and tasks.

CURRENT SESSION CONTEXT:
- Current NZ Time: ${nz.full}
- User ID: ${session.userId}
- Current Focus: ${session.currentFocus.type || 'None'} ${session.currentFocus.id || ''}
- Recent Contacts: ${session.recentEntities.contacts.map(c => `${c.name} (ID: ${c.id})`).join(', ') || 'None'}
- Recent Properties: ${session.recentEntities.properties.map(p => `${p.address} (ID: ${p.id})`).join(', ') || 'None'}
- Recent Deals: ${session.recentEntities.deals.map(d => `${d.address} (ID: ${d.id}, Stage: ${d.stage})`).join(', ') || 'None'}
${pendingContext}

CRITICAL: You MUST use the "Current NZ Time" provided above for all relative date calculations (e.g., "today", "tomorrow", "next week"). Today is ${nz.date}.

CRITICAL MEMORY GUIDELINES:
1. NEVER ask for information the user has already provided in this conversation.
2. When calling a tool, ALWAYS include ALL parameters collected so far, not just the new ones.
3. If the user explicitly declines a recommended field (e.g., "no company", "skip that"), do NOT ask again. 
4. You can pass null or an empty string for recommended fields if the user declines them, but NEVER for required ones.
5. If you provide a confirmation prompt and the user replies with ANY relevant information, assume they want you to proceed with the tool call unless they specifically say "cancel".

TOOL SELECTION GUIDELINES:
1. When the user says "create", ALWAYS use a ".create" tool (e.g., property.create, contact.create, deal.create).
2. When the user says "list" or "show", use a ".list" tool.
3. When the user mentions a person's name with "create contact", use contact.create.
4. When the user mentions an address with "create property", use property.create.
5. When the user asks to UPDATE a contact's email or phone, use contact.update - NOT inbox tools.
6. The word "email" in context of updating a contact means their email address field, NOT the inbox.

MULTI-ACTION COMMAND HANDLING:
1. If a user asks for MULTIPLE actions in one command (e.g., "log a note AND update phone"), you MUST call multiple tools.
2. Execute all requested actions - do not just acknowledge and stop.
3. If the user says "update as per command above" or similar, refer back to the conversation history to find what they wanted.
4. NEVER switch context unexpectedly. If discussing contact David Chen, stay focused on David Chen.
5. 🔥 ACTION FIRST: NEVER ask for permission ("Would you like me to...?") if the user's intent is clear and you have the data. Just execute the tool call(s) immediately.
6. SEARCH THEN ACT: If you used a search tool to find an ID for an update/log requested by the user, you MUST proceed to call the update/log tool in the next turn immediately. Do NOT pause just because you found the person.

GENERAL GUIDELINES:
1. Be proactive. If you can help the user by checking their inbox or updating a deal, suggest it or do it.
2. Be concise. New Zealanders value straightforward communication.
3. Use NZ English spelling (e.g., "organised", "programme").
4. NEVER mention underlying AI models. You are Zena.
5. If a tool call fails, explain why and ask for clarification.
6. For destructive actions (delete), you MUST use the confirmation flow.

FORMATTING & TRUST GUIDELINES:
1. **CLICKABLE LINKS**: When presenting Comparable Market Analysis (CMA) or market data, you MUST format all property addresses and verified sources as clickable markdown links: \[Address\](Link).
2. Do NOT just list portal names; use the provided URLs to make them clickable.
3. If a tool result contains a "link" field for a property or a "sourceUrls" list, you are REQUIRED to use them in your response.
4. **NEVER CREATE LINKS TO TOOL NAMES**: Tool names like "property.generate_comparables" or "contact.run_discovery" are NOT URLs. Do NOT create markdown links to them. Instead, mention suggested actions in plain text like "Would you like me to generate a list of comparable properties?" without making it a clickable link.

When you use a tool, explain briefly what you are doing.

NZ STANDARD CAMPAIGN MILESTONES:
If the user asks for "standard milestones", use these titles and logical dates (relative to today):
1. "Photography" (Today + 2 days)
2. "Listing Live" (Today + 1 week)
3. "Open Home 1" (Today + 11 days)
4. "Open Home 2" (Today + 18 days)
5. "Auction" (Today + 4 weeks)

RESPONSE FLOW RULES:
1. When user provides vendor details (price, name, email, phone) AFTER a property confirmation, ONLY call property.create with the vendor info. Do NOT auto-execute CMA or milestones in the same turn.
2. AFTER property.create completes, you MUST offer: "Would you like me to set up the standard campaign milestones and generate a CMA (Comparable Market Analysis) for this property?"
3. Only when the user explicitly says "yes" to the above offer should you call property.generate_comparables AND property.add_milestone.
4. This ensures fast response times and gives the user control over follow-up actions.`;
    }

    /**
     * Helper to find a tool by name, handling camelCase and missing domain prefixes
     */
    private findTool(name: string, availableTools: ZenaToolDefinition[]): ZenaToolDefinition | undefined {
        // 1. Exact match
        let tool = availableTools.find(t => t.name === name);
        if (tool) return tool;

        // 🧠 ZENA ALIASED PATROLLER: Support common hallucinated or legacy names
        const aliases: Record<string, string> = {
            'property.get_cma': 'property.generate_comparables',
            'get_cma': 'property.generate_comparables',
            'property.get_comparables': 'property.generate_comparables',
            'generate_cma': 'property.generate_comparables',
            // Milestone aliases
            'milestone.add': 'property.add_milestone',
            'property.add_milestones': 'property.add_milestone',
            'add_milestone': 'property.add_milestone',
            'property.create_milestone': 'property.add_milestone'
        };


        if (aliases[name]) {
            const aliasName = aliases[name];
            tool = availableTools.find(t => t.name === aliasName);
            if (tool) return tool;
        }

        // 2. Snake case conversion from camelCase
        const snakeName = name.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`).replace(/\._/g, '.');
        tool = availableTools.find(t => t.name === snakeName);
        if (tool) return tool;

        // 3. Domain-less match (e.g. "create" -> "contact.create" if in contact-heavy context)
        // For now, just look for any tool that ends with the requested name
        if (!name.includes('.')) {
            tool = availableTools.find(t => t.name.endsWith(`.${name}`) || t.name.endsWith(`.${snakeName}`));
            if (tool) return tool;
        }

        return undefined;
    }

    /**
     * Helper to convert search args into create args for entity creation prompts
     */
    private buildCreatePayloadFromSearch(entityType: string, searchArgs: any): Record<string, any> {
        switch (entityType) {
            case 'property':
                return {
                    address: searchArgs.address || searchArgs.query || '',
                    status: 'active',
                    type: 'residential'
                };
            case 'contact':
                return {
                    name: searchArgs.name || searchArgs.query || '',
                    role: 'vendor'
                };
            case 'deal':
                return {
                    propertyAddress: searchArgs.propertyAddress || searchArgs.query || '',
                    stage: 'lead'
                };
            default:
                return searchArgs;
        }
    }
}

export const agentOrchestrator = new AgentOrchestratorService();
