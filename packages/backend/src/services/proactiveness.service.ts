
/**
 * Proactiveness Service
 * 
 * Logic to identify information gaps in created entities and
 * suggest logical next steps (cascading value-adds).
 */

import { logger } from './logger.service.js';

import { DOMAIN_FIELD_LIBRARY, FieldDefinition } from '../config/domain-fields.js';

export interface GapAnalysis {
    hasGaps: boolean;
    missingFields: FieldDefinition[];
    summary: string;
}

export interface CascadingSuggestion {
    label: string;
    suggestion: string;
    toolName?: string;
    params?: any;
    priority?: 'high' | 'medium' | 'low';
}

export interface ProactiveResult {
    text: string;
    suggestedActions: SuggestedAction[];
}

export interface SuggestedAction {
    label: string;
    toolName: string;
    payload: any;
    icon?: string;
}

export class ProactivenessService {

    /**
     * Check for missing essential information using Domain Field Library
     */
    checkGaps(domain: string, data: any): GapAnalysis {
        const schema = DOMAIN_FIELD_LIBRARY[domain];
        if (!schema) {
            return { hasGaps: false, missingFields: [], summary: '' };
        }

        const missingFields: FieldDefinition[] = [];

        for (const field of schema) {
            // 1. Check condition (skip if not relevant)
            if (field.condition && !field.condition(data)) {
                continue;
            }

            // 2. Resolve value from multiple potential keys (nested or flat)
            let val: any = undefined;
            const keysToCheck = [field.key, ...(field.contextKeys || [])];

            for (const key of keysToCheck) {
                val = this.resolveValue(data, key);
                if (this.isValid(val)) break;
            }

            // 3. Mark as missing if invalid
            if (!this.isValid(val)) {
                missingFields.push(field);
            }
        }

        return {
            hasGaps: missingFields.length > 0,
            missingFields,
            summary: missingFields.length > 0
                ? `Missing ${missingFields.length} fields for ${domain}.`
                : ''
        };
    }

    /**
     * Synthesize a proactive response suffix AND structured actions
     */
    synthesizeProactiveStatement(toolName: string, result: any): ProactiveResult {
        const domain = toolName.split('.')[0];
        const gaps = this.checkGaps(domain, result);
        const suggestions = this.getSuggestions(toolName, result);

        let statement = '';
        const actions: SuggestedAction[] = [];

        // 🚨 PRIORITY 1: Critical Gaps (Email, Phone, Role/Type)
        if (gaps.hasGaps) {
            // Find the highest priority gap to ask about first
            const criticalGaps = gaps.missingFields.filter(f => f.priority === 'critical');
            const highGaps = gaps.missingFields.filter(f => f.priority === 'high');

            // Combine critical and high as "important" gaps to mention
            const importantGaps = [...criticalGaps, ...highGaps];

            // Focus on the most important missing piece
            const targetGap = importantGaps[0] || gaps.missingFields[0];

            if (targetGap) {
                statement += `\n\nI've set that up. ${targetGap.question}`;
            }

            // If there are multiple important gaps, list them briefly
            if (importantGaps.length > 1) {
                const otherGaps = importantGaps.slice(1).map(f => f.label).join(', ');
                statement += ` (I also need: ${otherGaps})`;
            }

        } else if (suggestions.length > 0) {
            // PRIORITY 2: Cascading Suggestions (CMA, Discovery, Marketing, etc.)
            const topSuggestion = suggestions[0];
            const followUp = topSuggestion.suggestion;
            statement += `\n\n${followUp}`;

            // Map suggestions to actions
            suggestions.forEach(s => {
                if (s.toolName && s.params) {
                    actions.push({
                        label: s.label,
                        toolName: s.toolName,
                        payload: s.params,
                        icon: '⚡' // Default fast action icon
                    });
                }
            });
        }

        // Add domain-specific check for Marketing & Reporting even if no direct gap was found by the basic check
        // (Just in case the 'create' tool didn't trigger gaps but we know what comes next)
        if (domain === 'property' && result.id) {
            // Check if active but no marketing
            const marketingGaps = this.checkGaps('marketing', { ...result, status: result.status || 'active' }); // Assume active if newly created for now
            if (marketingGaps.hasGaps) {
                const sched = marketingGaps.missingFields.find(f => f.key === 'campaign.scheduled');
                if (sched && !actions.find(a => a.toolName === 'marketing.generate_campaign')) {
                    // Add One-Click Action
                    actions.push({
                        label: 'Plan Campaign',
                        toolName: 'marketing.generate_campaign',
                        payload: { propertyId: result.id, budgetLevel: 'medium' },
                        icon: '📅'
                    });
                    if (!statement.includes('marketing')) statement += `\n\n${sched.question}`;
                }
            }
        }

        return {
            text: statement,
            suggestedActions: actions
        };
    }

    /**
     * Get logical next steps based on what was just done
     */
    getSuggestions(toolName: string, result: any): CascadingSuggestion[] {
        const suggestions: CascadingSuggestion[] = [];
        const domain = toolName.split('.')[0];
        const action = toolName.split('.')[1];
        const entityId = result?.id || result?.property?.id || result?.deal?.id || result?.contact?.id;

        if (action === 'create' || action?.includes('create') || action?.includes('update')) {
            switch (domain) {
                case 'contact':
                    suggestions.push({
                        label: 'Enrich Profile',
                        suggestion: "Would you like me to run a discovery scan to find their LinkedIn and social profiles?",
                        toolName: 'contact.run_discovery',
                        params: { contactId: entityId }
                    });
                    break;

                case 'property':
                    // Marketing is handled in the synthesized logic for now to ensure robust check,
                    // but we can add CMA here too.
                    suggestions.push({
                        label: 'Market Analysis',
                        suggestion: "Calculated that market data is available. Should I generate a CMA report?",
                        toolName: 'property.generate_comparables',
                        params: { propertyId: entityId }
                    });

                    // Add Campaign Action explicitly if needed
                    suggestions.push({
                        label: 'Generate Campaign',
                        suggestion: "Shall I plan the marketing campaign?",
                        toolName: 'marketing.generate_campaign',
                        params: { propertyId: entityId, budgetLevel: 'medium' }
                    });
                    break;

                case 'calendar':
                case 'calendar_event':
                    suggestions.push({
                        label: 'Draft Confirmation',
                        suggestion: "I can draft a confirmation email for this appointment if you'd like.",
                        toolName: 'core.draft_email', // Assuming generic tool or specific one exists
                        params: { context: `Confirmation for event: ${result.title} at ${result.time}` }
                    });
                    break;

                case 'deal':
                    suggestions.push({
                        label: 'Weekly Report',
                        suggestion: "Shall I compile and send the weekly vendor report?",
                        toolName: 'vendor_report.generate_weekly',
                        params: { dealId: entityId }
                    });
                    break;
            }
        }

        return suggestions;
    }

    // --- Helpers ---

    private resolveValue(data: any, path: string): any {
        return path.split('.').reduce((acc, part) => acc && acc[part], data);
    }

    private isValid(value: any): boolean {
        return value !== undefined && value !== null && value !== '' &&
            !(Array.isArray(value) && value.length === 0);
    }
}

export const proactivenessService = new ProactivenessService();
