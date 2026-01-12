/**
 * Audit Logger Service
 * 
 * Tracks all agent tool executions for compliance, debugging, and analytics.
 */

import prisma from '../config/database.js';
import { ToolAuditEntry } from '../tools/types.js';

export interface AuditLogEntry {
    id: string;
    timestamp: Date;
    userId: string;
    sessionId: string;
    conversationId: string;

    // Tool execution details
    toolName: string;
    domain: string;
    action: string;
    summary: string;

    // Input/Output (sanitized)
    inputSummary: string;
    outputSummary: string;

    // Approval details
    approvalRequired: boolean;
    approvalMethod?: 'voice' | 'text' | 'ui_button' | 'auto_full_god';
    approvedAt?: Date;

    // Execution result
    success: boolean;
    durationMs: number;
    errorMessage?: string;

    // Context
    precedingUserMessage: string;
    entityType?: string;
    entityId?: string;
}

class AuditLoggerService {
    private recentLogs: AuditLogEntry[] = [];
    private readonly MAX_RECENT = 100;

    /**
     * Log a tool execution
     */
    async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
        const fullEntry: AuditLogEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            ...entry
        };

        // Store in memory for quick access
        this.recentLogs.unshift(fullEntry);
        if (this.recentLogs.length > this.MAX_RECENT) {
            this.recentLogs.pop();
        }

        // Also persist to database for long-term storage
        try {
            await prisma.timelineEvent.create({
                data: {
                    id: fullEntry.id,
                    userId: fullEntry.userId,
                    entityType: 'agent_action',
                    entityId: fullEntry.entityId || fullEntry.sessionId,
                    type: 'agent_tool_execution',
                    summary: `[${fullEntry.toolName}] ${fullEntry.summary}`,
                    content: JSON.stringify({
                        toolName: fullEntry.toolName,
                        domain: fullEntry.domain,
                        action: fullEntry.action,
                        inputSummary: fullEntry.inputSummary,
                        outputSummary: fullEntry.outputSummary,
                        approvalRequired: fullEntry.approvalRequired,
                        approvalMethod: fullEntry.approvalMethod,
                        success: fullEntry.success,
                        durationMs: fullEntry.durationMs,
                        errorMessage: fullEntry.errorMessage
                    }),
                    metadata: {
                        sessionId: fullEntry.sessionId,
                        conversationId: fullEntry.conversationId,
                        precedingUserMessage: fullEntry.precedingUserMessage
                    },
                    timestamp: fullEntry.timestamp
                }
            });
        } catch (error) {
            console.error('[AuditLogger] Failed to persist audit log:', error);
            // Don't throw - audit logging should never break the main flow
        }

        // Console log for debugging
        const emoji = fullEntry.success ? '✅' : '❌';
        console.log(
            `[AuditLogger] ${emoji} ${fullEntry.toolName}: ${fullEntry.summary} ` +
            `(${fullEntry.durationMs}ms)`
        );
    }

    /**
     * Log a tool execution start (for timing)
     */
    startExecution(toolName: string): { startTime: number; end: () => number } {
        const startTime = Date.now();
        return {
            startTime,
            end: () => Date.now() - startTime
        };
    }

    /**
     * Get recent audit logs for a user
     */
    async getRecentLogs(userId: string, limit: number = 20): Promise<AuditLogEntry[]> {
        // First check memory
        const memoryLogs = this.recentLogs.filter(l => l.userId === userId).slice(0, limit);

        if (memoryLogs.length >= limit) {
            return memoryLogs;
        }

        // Fetch from database if needed
        try {
            const dbLogs = await prisma.timelineEvent.findMany({
                where: {
                    userId,
                    type: 'agent_tool_execution'
                },
                orderBy: { timestamp: 'desc' },
                take: limit
            });

            return dbLogs.map(log => {
                const content = log.content ? JSON.parse(log.content as string) : {};
                const metadata = (log.metadata as any) || {};

                return {
                    id: log.id,
                    timestamp: log.timestamp,
                    userId: log.userId,
                    sessionId: metadata.sessionId || '',
                    conversationId: metadata.conversationId || '',
                    toolName: content.toolName || '',
                    domain: content.domain || '',
                    action: content.action || '',
                    summary: log.summary,
                    inputSummary: content.inputSummary || '',
                    outputSummary: content.outputSummary || '',
                    approvalRequired: content.approvalRequired || false,
                    success: content.success !== false,
                    durationMs: content.durationMs || 0,
                    precedingUserMessage: metadata.precedingUserMessage || ''
                };
            });
        } catch (error) {
            console.error('[AuditLogger] Failed to fetch logs:', error);
            return memoryLogs;
        }
    }

    /**
     * Sanitize input for logging (remove sensitive data)
     */
    sanitizeInput(input: any): string {
        if (!input) return '';

        const sanitized = { ...input };

        // Remove sensitive fields
        const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
        for (const field of sensitiveFields) {
            if (field in sanitized) {
                sanitized[field] = '[REDACTED]';
            }
        }

        // Truncate long strings
        for (const [key, value] of Object.entries(sanitized)) {
            if (typeof value === 'string' && value.length > 200) {
                sanitized[key] = value.substring(0, 200) + '...';
            }
        }

        return JSON.stringify(sanitized);
    }

    /**
     * Format a ToolAuditEntry for logging
     */
    formatEntry(
        toolAudit: ToolAuditEntry,
        context: {
            userId: string;
            sessionId: string;
            conversationId: string;
            toolName: string;
            domain: string;
            input: any;
            success: boolean;
            durationMs: number;
            approvalRequired: boolean;
            approvalMethod?: string;
            errorMessage?: string;
            precedingUserMessage: string;
        }
    ): Omit<AuditLogEntry, 'id' | 'timestamp'> {
        return {
            userId: context.userId,
            sessionId: context.sessionId,
            conversationId: context.conversationId,
            toolName: context.toolName,
            domain: context.domain,
            action: toolAudit.action,
            summary: toolAudit.summary,
            inputSummary: this.sanitizeInput(context.input),
            outputSummary: '',
            approvalRequired: context.approvalRequired,
            approvalMethod: context.approvalMethod as any,
            success: context.success,
            durationMs: context.durationMs,
            errorMessage: context.errorMessage,
            precedingUserMessage: context.precedingUserMessage,
            entityType: toolAudit.entityType,
            entityId: toolAudit.entityId
        };
    }
}

export const auditLogger = new AuditLoggerService();
