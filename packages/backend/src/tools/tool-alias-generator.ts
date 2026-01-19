/**
 * Tool Alias Generator
 * 
 * Auto-generates predictable aliases for all registered tools at server startup.
 * This ensures LLM tool calls match even when the LLM uses variations of tool names.
 * 
 * WHEN: Generated once at server startup
 * HOW: Pattern-based generation from tool names
 * COST: Zero tokens (server-side only), O(1) lookup
 */

import { toolRegistry } from './registry.js';

// Action verb synonyms - common variations LLMs use
const ACTION_SYNONYMS: Record<string, string[]> = {
    'create': ['add', 'new', 'make', 'insert', 'book', 'schedule'],
    'update': ['edit', 'modify', 'change', 'set', 'update_event', 'edit_event'],
    'delete': ['remove', 'destroy', 'erase', 'trash'],
    'list': ['get_all', 'fetch', 'show', 'display', 'find_all', 'list_events', 'get_events'],
    'get': ['fetch', 'retrieve', 'find', 'lookup', 'load', 'get_event'],
    'search': ['find', 'query', 'lookup'],
    'archive': ['hide', 'store'],
    'complete': ['done', 'finish', 'mark_done', 'mark_complete'],
    'reschedule': ['move', 'postpone', 'delay', 'change_time'],
    'generate': ['create', 'build', 'make', 'produce'],
    'refresh': ['reload', 'update', 'sync'],
    'link': ['connect', 'attach', 'associate', 'bind'],
    'send': ['submit', 'dispatch', 'deliver'],
    'draft': ['compose', 'write', 'prepare'],
};

// Domain noun synonyms - common variations LLMs use
const DOMAIN_SYNONYMS: Record<string, string[]> = {
    'contact': ['person', 'client', 'customer', 'user'],
    'property': ['listing', 'house', 'home', 'address'],
    'calendar': ['schedule', 'event', 'appointment', 'meeting'],
    'task': ['todo', 'item', 'action', 'reminder'],
    'deal': ['transaction', 'sale', 'opportunity'],
    'inbox': ['email', 'message', 'mail'],
};

// Entity suffixes LLMs often add
const ENTITY_SUFFIXES: Record<string, string[]> = {
    'calendar': ['event', 'appointment', 'meeting'],
    'contact': ['person', 'card', 'record'],
    'property': ['listing', 'record'],
    'task': ['item', 'todo'],
    'deal': ['record', 'transaction'],
};

interface AliasMap {
    [alias: string]: string;
}

class ToolAliasGenerator {
    private aliases: AliasMap = {};
    private initialized = false;

    /**
     * Generate all aliases at startup
     */
    initialize(): void {
        if (this.initialized) return;

        const allTools = toolRegistry.getAllTools();
        console.log(`[ToolAliasGenerator] Generating aliases for ${allTools.length} tools...`);

        for (const tool of allTools) {
            const generatedAliases = this.generateAliasesForTool(tool.name);
            for (const alias of generatedAliases) {
                if (alias !== tool.name && !this.aliases[alias]) {
                    this.aliases[alias] = tool.name;
                }
            }
        }

        this.initialized = true;
        const aliasCount = Object.keys(this.aliases).length;
        console.log(`[ToolAliasGenerator] ✅ Generated ${aliasCount} aliases for ${allTools.length} tools`);
    }

    /**
     * Generate all possible aliases for a single tool
     */
    private generateAliasesForTool(toolName: string): string[] {
        const aliases: string[] = [];
        const parts = toolName.split('.');

        if (parts.length !== 2) {
            return aliases;
        }

        const [domain, action] = parts;

        // Pattern 1: Underscore variations
        aliases.push(`${action}_${domain}`);          // create_contact
        aliases.push(`${domain}_${action}`);          // contact_create

        // Pattern 2: CamelCase variations
        aliases.push(`${action}${this.capitalize(domain)}`);     // createContact
        aliases.push(`${domain}${this.capitalize(action)}`);     // contactCreate

        // Pattern 3: With entity suffixes (e.g., calendar.create_event)
        const suffixes = ENTITY_SUFFIXES[domain] || [];
        for (const suffix of suffixes) {
            aliases.push(`${domain}.${action}_${suffix}`);       // calendar.create_event
            aliases.push(`${domain}.${action}${this.capitalize(suffix)}`); // calendar.createEvent
            aliases.push(`${action}_${suffix}`);                  // create_event
            aliases.push(`${action}_${domain}_${suffix}`);        // create_calendar_event
        }

        // Pattern 4: Action synonyms
        const actionSynonyms = ACTION_SYNONYMS[action] || [];
        for (const synonym of actionSynonyms) {
            aliases.push(`${domain}.${synonym}`);                // contact.add
            aliases.push(`${synonym}_${domain}`);                // add_contact
            aliases.push(`${synonym}${this.capitalize(domain)}`); // addContact

            // With suffixes
            for (const suffix of suffixes) {
                aliases.push(`${domain}.${synonym}_${suffix}`);   // calendar.book_appointment
            }
        }

        // Pattern 5: Domain synonyms
        const domainSynonyms = DOMAIN_SYNONYMS[domain] || [];
        for (const domainSyn of domainSynonyms) {
            aliases.push(`${domainSyn}.${action}`);              // person.create (for contact)
            aliases.push(`${action}_${domainSyn}`);              // create_person
        }

        // Pattern 6: Just the action (for unambiguous cases)
        if (['search', 'list', 'generate'].includes(action)) {
            aliases.push(`${action}_${domain}s`);                // search_contacts (plural)
            aliases.push(`${action}${this.capitalize(domain)}s`); // searchContacts
        }

        return aliases;
    }

    /**
     * Resolve an alias to the real tool name
     */
    resolve(name: string): string {
        if (!this.initialized) {
            this.initialize();
        }
        return this.aliases[name] || name;
    }

    /**
     * Check if an alias exists
     */
    hasAlias(name: string): boolean {
        return name in this.aliases;
    }

    /**
     * Get all aliases (for debugging)
     */
    getAllAliases(): AliasMap {
        return { ...this.aliases };
    }

    /**
     * Get stats
     */
    getStats(): { totalAliases: number; averagePerTool: number } {
        const toolCount = toolRegistry.getAllTools().length;
        return {
            totalAliases: Object.keys(this.aliases).length,
            averagePerTool: Math.round(Object.keys(this.aliases).length / toolCount * 10) / 10
        };
    }

    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Singleton instance
export const toolAliasGenerator = new ToolAliasGenerator();
