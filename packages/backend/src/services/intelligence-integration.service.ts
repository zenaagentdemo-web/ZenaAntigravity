/**
 * Intelligence Integration Service
 * 
 * Takes extracted data from custom connections and integrates it
 * into Zena's intelligence layer for use in prompts and reports.
 */

import { ExtractedData } from './cloud-robot.service.js';

export interface IntelligenceRecord {
    id: string;
    source: string;
    domain: string;
    dataType: string;
    content: Record<string, any>;
    extractedAt: string;
    integratedAt: string;
}

// In-memory intelligence store (would be vector DB in production)
const intelligenceStore: Map<string, IntelligenceRecord[]> = new Map();

export class IntelligenceIntegrationService {
    /**
     * Process and store extracted data as intelligence records
     */
    async integrateExtractedData(extraction: ExtractedData): Promise<IntelligenceRecord[]> {
        if (!extraction.success) {
            console.log(`[IntelligenceIntegration] Skipping failed extraction for ${extraction.domain}`);
            return [];
        }

        console.log(`[IntelligenceIntegration] Processing data from ${extraction.domain}`);

        const records: IntelligenceRecord[] = [];
        const now = new Date().toISOString();

        // Convert each field to intelligence records
        for (const [fieldName, values] of Object.entries(extraction.fields)) {
            if (!values || values.length === 0) continue;

            const record: IntelligenceRecord = {
                id: `intel_${extraction.domain}_${fieldName}_${Date.now()}`,
                source: 'custom_connection',
                domain: extraction.domain,
                dataType: fieldName,
                content: {
                    fieldName,
                    values,
                    count: values.length
                },
                extractedAt: extraction.extractedAt,
                integratedAt: now
            };

            records.push(record);
        }

        // Store records
        const existingRecords = intelligenceStore.get(extraction.domain) || [];
        intelligenceStore.set(extraction.domain, [...existingRecords, ...records]);

        console.log(`[IntelligenceIntegration] Stored ${records.length} intelligence records for ${extraction.domain}`);

        return records;
    }

    /**
     * Query intelligence by domain
     */
    getIntelligenceByDomain(domain: string): IntelligenceRecord[] {
        return intelligenceStore.get(domain) || [];
    }

    /**
     * Query intelligence by data type across all domains
     */
    getIntelligenceByType(dataType: string): IntelligenceRecord[] {
        const results: IntelligenceRecord[] = [];

        intelligenceStore.forEach((records) => {
            records.forEach(record => {
                if (record.dataType === dataType) {
                    results.push(record);
                }
            });
        });

        return results;
    }

    /**
     * Search intelligence records
     */
    searchIntelligence(query: string): IntelligenceRecord[] {
        const results: IntelligenceRecord[] = [];
        const lowerQuery = query.toLowerCase();

        intelligenceStore.forEach((records) => {
            records.forEach(record => {
                const contentStr = JSON.stringify(record.content).toLowerCase();
                if (contentStr.includes(lowerQuery)) {
                    results.push(record);
                }
            });
        });

        return results;
    }

    /**
     * Get all intelligence summary
     */
    getIntelligenceSummary(): { domain: string; recordCount: number; dataTypes: string[] }[] {
        const summary: { domain: string; recordCount: number; dataTypes: string[] }[] = [];

        intelligenceStore.forEach((records, domain) => {
            const dataTypes = [...new Set(records.map(r => r.dataType))];
            summary.push({
                domain,
                recordCount: records.length,
                dataTypes
            });
        });

        return summary;
    }

    /**
     * Clear intelligence for a domain
     */
    clearIntelligence(domain: string): boolean {
        return intelligenceStore.delete(domain);
    }

    /**
     * Format intelligence for LLM context
     */
    formatForLLM(domain: string): string {
        const records = this.getIntelligenceByDomain(domain);

        if (records.length === 0) {
            return `No intelligence data available from ${domain}.`;
        }

        let context = `## Intelligence from ${domain}\n\n`;

        const groupedByType: Record<string, any[]> = {};
        records.forEach(record => {
            if (!groupedByType[record.dataType]) {
                groupedByType[record.dataType] = [];
            }
            groupedByType[record.dataType].push(record.content);
        });

        for (const [type, data] of Object.entries(groupedByType)) {
            context += `### ${type}\n`;
            data.forEach(item => {
                if (item.values && Array.isArray(item.values)) {
                    context += item.values.slice(0, 10).map((v: any) =>
                        typeof v === 'object' ? JSON.stringify(v) : v
                    ).join('\n');
                    if (item.values.length > 10) {
                        context += `\n... and ${item.values.length - 10} more items`;
                    }
                }
            });
            context += '\n\n';
        }

        return context;
    }
}

export const intelligenceIntegrationService = new IntelligenceIntegrationService();
