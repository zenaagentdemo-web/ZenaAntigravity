/**
 * Zena Tool Registry
 * 
 * Central registry for all agent tools. Handles registration, lookup,
 * and conversion to Gemini function calling format.
 */

import { ZenaToolDefinition, ToolBundle, toGeminiFunctionDeclaration } from './types.js';

class ToolRegistry {
    private tools: Map<string, ZenaToolDefinition> = new Map();
    private bundles: Map<string, ToolBundle> = new Map();
    private idempotencyCache: Map<string, number> = new Map();

    // Idempotency cache TTL in milliseconds (5 minutes)
    private readonly IDEMPOTENCY_TTL = 5 * 60 * 1000;

    /**
     * Register a tool with the registry
     */
    register(tool: ZenaToolDefinition): void {
        if (this.tools.has(tool.name)) {
            console.warn(`[ToolRegistry] Tool ${tool.name} already registered, overwriting`);
        }
        this.tools.set(tool.name, tool);
        console.log(`[ToolRegistry] ✅ Registered tool: ${tool.name}`);
    }

    /**
     * Register a bundle of tools
     */
    registerBundle(bundle: ToolBundle): void {
        this.bundles.set(bundle.name, bundle);
        console.log(`[ToolRegistry] 📦 Registered bundle: ${bundle.name} (${bundle.tools.length} tools)`);
    }

    /**
     * Get a tool by name
     */
    getTool(name: string): ZenaToolDefinition | undefined {
        return this.tools.get(name);
    }

    /**
     * Get all tools in a bundle
     */
    getBundle(name: string): ZenaToolDefinition[] {
        const bundle = this.bundles.get(name);
        if (!bundle) return [];

        return bundle.tools
            .map(toolName => this.tools.get(toolName))
            .filter((t): t is ZenaToolDefinition => t !== undefined);
    }

    /**
     * Get tools for multiple bundles
     */
    getToolsForBundles(bundleNames: string[]): ZenaToolDefinition[] {
        const toolSet = new Set<ZenaToolDefinition>();

        for (const bundleName of bundleNames) {
            const tools = this.getBundle(bundleName);
            tools.forEach(t => toolSet.add(t));
        }

        return Array.from(toolSet);
    }

    /**
     * Get all registered tools
     */
    getAllTools(): ZenaToolDefinition[] {
        return Array.from(this.tools.values());
    }

    /**
     * Get tools by domain
     */
    getToolsByDomain(domain: string): ZenaToolDefinition[] {
        return Array.from(this.tools.values())
            .filter(t => t.domain === domain);
    }

    /**
     * Convert tools to Gemini function calling format
     */
    toGeminiFunctions(tools: ZenaToolDefinition[]): Array<{
        name: string;
        description: string;
        parameters: any;
    }> {
        return tools.map(toGeminiFunctionDeclaration);
    }

    /**
     * Check idempotency for a tool execution
     * Returns true if this is a duplicate call within TTL
     */
    isDuplicate(idempotencyKey: string): boolean {
        const lastExecution = this.idempotencyCache.get(idempotencyKey);
        if (!lastExecution) return false;

        const now = Date.now();
        if (now - lastExecution < this.IDEMPOTENCY_TTL) {
            return true;
        }

        // Expired, remove from cache
        this.idempotencyCache.delete(idempotencyKey);
        return false;
    }

    /**
     * Record an execution for idempotency tracking
     */
    recordExecution(idempotencyKey: string): void {
        this.idempotencyCache.set(idempotencyKey, Date.now());

        // Cleanup old entries periodically
        if (this.idempotencyCache.size > 1000) {
            this.cleanupIdempotencyCache();
        }
    }

    /**
     * Remove expired idempotency entries
     */
    private cleanupIdempotencyCache(): void {
        const now = Date.now();
        const entries = Array.from(this.idempotencyCache.entries());
        for (const [key, timestamp] of entries) {
            if (now - timestamp > this.IDEMPOTENCY_TTL) {
                this.idempotencyCache.delete(key);
            }
        }
    }

    /**
     * Get registry statistics
     */
    getStats(): {
        totalTools: number;
        totalBundles: number;
        toolsByDomain: Record<string, number>;
    } {
        const toolsByDomain: Record<string, number> = {};

        const tools = Array.from(this.tools.values());
        for (const tool of tools) {
            toolsByDomain[tool.domain] = (toolsByDomain[tool.domain] || 0) + 1;
        }

        return {
            totalTools: this.tools.size,
            totalBundles: this.bundles.size,
            toolsByDomain
        };
    }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();
