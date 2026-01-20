/**
 * Tool Execution Service
 * 
 * Shared utility for executing Zena tools.
 * Extracted from AgentOrchestrator to support Multimodal Live.
 */

import { ZenaToolDefinition, ToolExecutionContext } from '../tools/types.js';
import { logger } from './logger.service.js';
import { JobManagerService, jobManager } from './job-manager.service.js';
import { ToolRegistry, toolRegistry } from '../tools/registry.js';

export class ToolExecutionService {
    private registry: ToolRegistry;
    private jobs: JobManagerService;

    constructor(
        registry: ToolRegistry = toolRegistry,
        jobs: JobManagerService = jobManager
    ) {
        this.registry = registry;
        this.jobs = jobs;
    }

    /**
     * Find a tool by name, handling aliases and normalization
     * (Logic ported from AgentOrchestratorService)
     */
    findTool(name: string, availableTools: ZenaToolDefinition[]): ZenaToolDefinition | undefined {
        // 1. Exact match
        let tool = availableTools.find(t => t.name === name);
        if (tool) return tool;

        // 🧠 ZENA GLOBAL ALIAS: Use the unified pattern-based generator
        const { toolAliasGenerator } = require('../tools/tool-alias-generator.js');
        const resolvedName = toolAliasGenerator.resolve(name);

        if (resolvedName !== name) {
            tool = availableTools.find(t => t.name === resolvedName);
            if (tool) {
                console.log(`🔄 [ToolExc] Alias resolved: ${name} → ${resolvedName}`);
                return tool;
            }
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
     * Prepare arguments for a creation tool based on search data
     * (Logic ported from AgentOrchestratorService)
     */
    buildCreatePayloadFromSearch(entityType: string, searchArgs: any): Record<string, any> {
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

    async executeToolCall(toolCall: any, userId: string): Promise<any> {
        const toolName = toolCall.functionCall.name;
        const args = toolCall.functionCall.args;

        logger.info(`[ToolExc] Processing call: ${toolName}`, { userId });

        return this.executeTool(toolName, args, {
            userId,
            conversationId: 'generic-live-session',
            approvalConfirmed: true // Live mode implies proactive approval for now
        });
    }

    /**
     * Execute a specific tool by name
     */
    async executeTool(
        toolName: string,
        args: any,
        context: ToolExecutionContext
    ): Promise<{
        success: boolean;
        result?: any;
        error?: string;
    }> {
        // Ensure context has minimal required fields
        const safeContext = {
            ...context,
            conversationId: context.conversationId || 'system-tool-exec',
            approvalConfirmed: context.approvalConfirmed ?? true
        };

        try {
            const tool = this.registry.getTool(toolName);
            if (!tool) {
                // If this is a Gemini-hallucinated tool, handle gracefully
                logger.warn(`[ToolExc] Tool not found: ${toolName}`);
                return {
                    success: false,
                    error: `Tool ${toolName} does not exist.`
                };
            }

            logger.info(`[ToolExc] Executing ${tool.name}`, { args, userId: context.userId });

            // ASYNC PATTERN: If tool is marked async, offload to JobManager
            if (tool.isAsync) {
                const job = this.jobs.startJob(context.userId, tool.name);

                // Fire and forget (but catch errors for logging)
                tool.execute(args, safeContext as any)
                    .then(res => {
                        if (res.success) {
                            // Strip success field before completing
                            const { success, ...payload } = res;
                            this.jobs.completeJob(job.id, payload);
                        } else {
                            this.jobs.failJob(job.id, res.error || 'Unknown tool error');
                        }
                    })
                    .catch(err => this.jobs.failJob(job.id, err.message));

                return {
                    success: true,
                    result: {
                        background_job_id: job.id,
                        status: 'started',
                        message: `Started background job for ${tool.name}. I will notify you when it completes.`
                    }
                };
            }

            const executionResult = await tool.execute(args, safeContext as any);
            if (executionResult.success) {
                const { success, ...payload } = executionResult;
                return { success: true, result: payload };
            } else {
                return { success: false, error: executionResult.error };
            }
        } catch (error: any) {
            logger.error(`[ToolExc] Failed to execute ${toolName}:`, error);
            return {
                success: false,
                error: error.message || 'Unknown tool execution error'
            };
        }
    }
}

export const toolExecutionService = new ToolExecutionService();
