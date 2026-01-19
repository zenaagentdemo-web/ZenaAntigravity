/**
 * Zena API Library
 * 
 * Auto-generates capability summaries from the tool registry.
 * Built ONCE at server startup and cached for all user sessions.
 * Zero manual maintenance - new tools are automatically included.
 */

import { toolRegistry } from './registry.js';
import { ZenaToolDefinition } from './types.js';

interface DomainCapabilities {
    domain: string;
    tools: string[];
    capabilities: string[];
}

interface APILibrary {
    domains: DomainCapabilities[];
    totalTools: number;
    cachedSummary: string | null;
}

class ZenaAPILibraryService {
    private library: APILibrary = {
        domains: [],
        totalTools: 0,
        cachedSummary: null
    };

    /**
     * Initialize the library by scanning the tool registry.
     * Called once at server startup.
     */
    initialize(): void {
        console.log('[ZenaAPILibrary] Initializing capability library from tool registry...');

        const allTools = toolRegistry.getAllTools();
        const domainMap = new Map<string, ZenaToolDefinition[]>();

        // Group tools by domain
        for (const tool of allTools) {
            const existing = domainMap.get(tool.domain) || [];
            existing.push(tool);
            domainMap.set(tool.domain, existing);
        }

        // Build domain capabilities
        this.library.domains = [];
        for (const [domain, tools] of domainMap) {
            this.library.domains.push({
                domain,
                tools: tools.map(t => t.name),
                capabilities: tools.map(t => this.formatCapability(t))
            });
        }

        this.library.totalTools = allTools.length;
        this.library.cachedSummary = this.generateSummary();

        console.log(`[ZenaAPILibrary] ✅ Initialized with ${this.library.totalTools} tools across ${this.library.domains.length} domains`);
    }

    /**
     * Format a tool into a human-readable capability string
     */
    private formatCapability(tool: ZenaToolDefinition): string {
        // Extract action from tool name (e.g., property.create -> Create)
        const parts = tool.name.split('.');
        const action = parts[1]?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || tool.name;

        // Add hint for complex tools
        let hint = '';
        if (tool.isAsync) hint = ' (background)';
        if (tool.requiresApproval) hint = ' (requires confirmation)';

        return `${action}: ${tool.description}${hint}`;
    }

    /**
     * Generate the compact capability summary for the system prompt.
     * Uses a condensed format to minimize token usage.
     */
    private generateSummary(): string {
        const lines: string[] = [];

        for (const domain of this.library.domains) {
            // Domain header
            const domainLabel = domain.domain.charAt(0).toUpperCase() + domain.domain.slice(1);
            lines.push(`**${domainLabel}** (${domain.tools.length} tools)`);

            // Condensed capabilities - group by action type
            const creates = domain.tools.filter(t => t.includes('.create') || t.includes('.add'));
            const reads = domain.tools.filter(t => t.includes('.list') || t.includes('.get') || t.includes('.search'));
            const updates = domain.tools.filter(t => t.includes('.update') || t.includes('.move') || t.includes('.reschedule'));
            const deletes = domain.tools.filter(t => t.includes('.delete') || t.includes('.archive') || t.includes('.remove'));
            const special = domain.tools.filter(t =>
                !t.includes('.create') && !t.includes('.add') &&
                !t.includes('.list') && !t.includes('.get') && !t.includes('.search') &&
                !t.includes('.update') && !t.includes('.move') && !t.includes('.reschedule') &&
                !t.includes('.delete') && !t.includes('.archive') && !t.includes('.remove')
            );

            const actions: string[] = [];
            if (creates.length) actions.push(`Create/Add`);
            if (reads.length) actions.push(`List/Search`);
            if (updates.length) actions.push(`Update/Move`);
            if (deletes.length) actions.push(`Delete/Archive`);
            if (special.length) {
                // Extract special action names
                const specialNames = special.map(t => {
                    const action = t.split('.')[1]?.replace(/_/g, ' ');
                    return action?.charAt(0).toUpperCase() + action?.slice(1);
                }).filter(Boolean);
                if (specialNames.length > 0) {
                    actions.push(specialNames.slice(0, 3).join(', '));
                }
            }

            lines.push(`  Actions: ${actions.join(' | ')}`);
        }

        return lines.join('\n');
    }

    /**
     * Get the cached capability summary for injection into system prompt.
     * This is the main method used by AgentOrchestratorService.
     */
    getCapabilitySummary(): string {
        if (!this.library.cachedSummary) {
            this.initialize();
        }
        return this.library.cachedSummary || 'Capability library not initialized.';
    }

    /**
     * Get full library data (for debugging/admin)
     */
    getLibrary(): APILibrary {
        return this.library;
    }

    /**
     * Get tools for a specific domain
     */
    getToolsForDomain(domain: string): string[] {
        const domainData = this.library.domains.find(d => d.domain === domain);
        return domainData?.tools || [];
    }

    /**
     * Get all domain names
     */
    getDomains(): string[] {
        return this.library.domains.map(d => d.domain);
    }

    /**
     * Get statistics
     */
    getStats(): { totalTools: number; domains: number; tokensEstimate: number } {
        return {
            totalTools: this.library.totalTools,
            domains: this.library.domains.length,
            tokensEstimate: Math.ceil((this.library.cachedSummary?.length || 0) / 4)
        };
    }
}

// Singleton instance
export const zenaAPILibrary = new ZenaAPILibraryService();
