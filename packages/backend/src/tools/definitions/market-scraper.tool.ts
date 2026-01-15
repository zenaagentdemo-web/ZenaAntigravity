
import { ZenaToolDefinition } from '../types.js';
import { marketScraperService } from '../../services/market-scraper.service.js';

export const MarketScraperTool: ZenaToolDefinition = {
    name: 'market_scraper.search',
    domain: 'property',
    description: 'Search the web for real estate market data, property listings, and sales history. Use this for CMAs and market research.',
    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'The search query (e.g., "3 bedroom house sales in Parnell", "123 Main St owner details")'
            },
            type: {
                type: 'string',
                enum: ['listings', 'sales', 'stats'],
                description: 'Type of data to search for'
            }
        },
        required: ['query']
    },
    outputSchema: {
        type: 'object',
        properties: {
            results: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        url: { type: 'string' },
                        snippet: { type: 'string' }
                    }
                }
            },
            summary: { type: 'string' }
        }
    },
    permissions: ['web_access'],
    requiresApproval: false,

    // PARALLEL CAPABILITY ENABLED
    isAsync: true,

    execute: async (params, context) => {
        const results = await marketScraperService.search(params.query);
        return {
            success: true,
            data: results
        };
    },

    auditLogFormat: (input, output) => ({
        action: 'market_search',
        summary: `Searched web for "${input.query}"`,
        metadata: { resultCount: output.data?.results?.length || 0 }
    })
};
