/**
 * Zena Tool Types
 * 
 * Core type definitions for the Agent Zena tool system.
 * All tools must conform to the ZenaToolDefinition interface.
 */

import { JSONSchema7 } from 'json-schema';

// Tool domains matching app feature areas
export type ToolDomain = 'inbox' | 'deal' | 'contact' | 'property' | 'task' | 'calendar' | 'core' | string;

// Approval types for different risk levels
export type ApprovalType = 'none' | 'standard' | 'destructive';

/**
 * Execution context passed to every tool
 */
export interface ToolExecutionContext {
    userId: string;
    sessionId: string;
    conversationId: string;
    approvalConfirmed: boolean;
    currentFocus?: {
        type: string;
        id: string | null;
    };
    isVoiceMode?: boolean;
}

/**
 * Result of tool execution
 */
export interface ToolExecutionResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    requiresFollowUp?: boolean;
    followUpPrompt?: string;
}

/**
 * Audit log entry for tool execution
 */
export interface ToolAuditEntry {
    action: string;
    summary: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, any>;
}

/**
 * Core tool definition interface
 * All Zena tools must implement this interface
 */
export interface ZenaToolDefinition<TInput = any, TOutput = any> {
    // Identity
    name: string;
    domain: ToolDomain;
    description: string;

    // Schemas (JSON Schema format for Gemini function calling)
    inputSchema: JSONSchema7;
    outputSchema: JSONSchema7;

    // Permissions required to use this tool
    permissions: string[];

    // Approval settings
    requiresApproval: boolean;
    approvalType?: ApprovalType;

    /**
     * Generate confirmation prompt for approval
     * Only called if requiresApproval is true
     */
    confirmationPrompt?: (params: TInput) => string;

    /**
     * For destructive actions, validate that user said "YES"
     */
    validateApproval?: (userResponse: string) => boolean;

    /**
     * Generate idempotency key to prevent duplicate executions
     * Return undefined if idempotency check not needed
     */
    idempotencyKey?: (input: TInput) => string | undefined;

    /**
     * Execute the tool
     */
    execute: (params: TInput, context: ToolExecutionContext) => Promise<ToolExecutionResult<TOutput>>;

    /**
     * Format audit log entry for this execution
     */
    auditLogFormat: (input: TInput, output: ToolExecutionResult<TOutput>) => ToolAuditEntry;

    /**
     * Optional flag for MCP-originated tools
     */
    isMCP?: boolean;

    /**
     * Optional ROLLBACK function for reversible actions
     */
    rollback?: (params: TInput, context: ToolExecutionContext) => Promise<void>;

    /**
     * Fields that Zena should proactively try to collect for a "richer" experience.
     * If these are missing, Zena will ask the user before proceeding.
     */
    recommendedFields?: string[];

    /**
     * Parallel Task Capability:
     * If true, this tool will run in the background (JobManager) and return 
     * an immediate "Job Started" signal to the LLM.
     */
    isAsync?: boolean;

    /**
     * Estimated duration in seconds. used to manage user expectations.
     */
    estimatedDuration?: number;

    /**
     * Instructions for how Zena should deliver the result naturally.
     * e.g., "Highlight the median estimated value for the CMA."
     */
    deliveryPrompt?: string;
}


/**
 * Tool bundle for domain-scoped tool loading
 */
export interface ToolBundle {
    name: string;
    tools: string[];  // Tool names in this bundle
    policy: {
        maxToolsPerTurn: number;
        requiresContext?: string;  // e.g., 'thread', 'deal'
    };
}

/**
 * Convert a ZenaToolDefinition to Gemini function calling format
 */
export function toGeminiFunctionDeclaration(tool: ZenaToolDefinition): {
    name: string;
    description: string;
    parameters: JSONSchema7;
} {
    return {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
    };
}

/**
 * Standard delete confirmation validator
 * Requires user to say "YES" exactly
 */
export function validateDeleteConfirmation(userResponse: string): boolean {
    return userResponse.trim().toUpperCase() === 'YES';
}

/**
 * Generate idempotency key using SHA256
 */
export async function generateIdempotencyKey(...parts: string[]): Promise<string> {
    const text = parts.join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
