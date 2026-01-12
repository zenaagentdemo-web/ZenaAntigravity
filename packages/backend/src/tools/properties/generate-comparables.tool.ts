import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';
import { marketScraperService } from '../../services/market-scraper.service.js';

export const generateComparablesTool: ZenaToolDefinition = {
    name: 'property.generate_comparables',
    domain: 'property',
    description: 'Generate list of comparable properties (CMA) for valuation.',

    inputSchema: {
        type: 'object',
        properties: {
            propertyId: { type: 'string' }
        },
        required: ['propertyId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            comparables: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        address: { type: 'string' },
                        soldPrice: { type: 'string' },
                        soldDate: { type: 'string' },
                        agency: { type: 'string' },
                        bedrooms: { type: 'number' },
                        bathrooms: { type: 'number' },
                        distance: { type: 'string' },
                        link: { type: 'string' }
                    }
                }
            },
            sourceUrls: {
                type: 'array',
                items: { type: 'string' }
            }
        }
    },

    permissions: ['properties:read'],
    requiresApproval: false,

    execute: async (params, context) => {
        const userId = context.userId;
        const { propertyId } = params;

        const property = await prisma.property.findFirst({
            where: { id: propertyId, userId }
        });

        if (!property) return { success: false, error: 'Property not found' };

        // 🧠 REAL DATA FETCHING: Extract suburb AND city for geographic anchoring
        // NZ Format: "48 Woodward Street, Nukuhau, Taupo, 3330, New Zealand"
        // Parts:     ["48 Woodward Street", "Nukuhau", "Taupo", "3330", "New Zealand"]
        const addressParts = property.address.split(',').map((p: string) => p.trim());

        // Extract suburb (usually second part after street address)
        let suburb = addressParts[1] || '';

        // 🔥 FIX: Extract city/region to prevent cross-city confusion
        // City is typically the part after suburb, before postcode
        const extractCity = (parts: string[]): string => {
            // Known NZ major cities/regions for matching
            const nzCities = [
                'Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga',
                'Dunedin', 'Palmerston North', 'Napier', 'Hastings', 'Nelson',
                'Rotorua', 'New Plymouth', 'Whangarei', 'Invercargill', 'Whanganui',
                'Gisborne', 'Taupo', 'Blenheim', 'Timaru', 'Pukekohe', 'Kapiti',
                'Queenstown', 'Masterton', 'Levin', 'Ashburton', 'Cambridge',
                'Feilding', 'Tokoroa', 'Hawera', 'Greymouth', 'Oamaru',
                'Mangere', 'Otahuhu', 'Manukau', 'North Shore', 'Waitakere'
            ];

            for (const part of parts) {
                const cleanPart = part.replace(/\d{4}/g, '').replace(/New Zealand/gi, '').trim();
                for (const city of nzCities) {
                    if (cleanPart.toLowerCase().includes(city.toLowerCase())) {
                        return city;
                    }
                }
            }

            // If no known city found, use the third part (common position)
            if (parts.length >= 3) {
                return parts[2].replace(/\d{4}/g, '').replace(/New Zealand/gi, '').trim();
            }

            return '';
        };

        const city = extractCity(addressParts);

        // Smart suburb extraction for Auckland/NZ common formats
        if (addressParts.length >= 2) {
            suburb = addressParts[1];
        } else {
            // If no comma, try to strip the street address part
            const streetPattern = /^(?:\d+\/?d*|\d+[A-Za-z]?)\s+[\w\s]+(?:Road|Rd|Street|St|Avenue|Ave|Drive|Dr|Place|Pl|Lane|Ln|Crescent|Cres|Grove|Gve|Way|Parade|Pde)\b/i;
            suburb = property.address.replace(streetPattern, '').trim();
        }

        // Clean up suburb noise (but DON'T strip city - we need it for context!)
        suburb = suburb.replace(/New Zealand|\d{4}/gi, '').trim();
        if (suburb.startsWith(',')) suburb = suburb.substring(1).trim();

        const bedrooms = property.bedrooms || 3;

        console.log(`[CMA Tool] Generating real-time comparables for ${property.address}`);
        console.log(`[CMA Tool] Extracted: Suburb="${suburb}", City="${city}", Bedrooms=${bedrooms}`);

        // 🔥 FIX: Pass full context including city for geographic anchoring
        const { comparables, sourceUrls, targetSaleHistory } = await marketScraperService.findComparableSales({
            targetAddress: property.address,
            suburb,
            city,
            bedrooms
        });

        return {
            success: true,
            data: {
                comparables,
                sourceUrls,
                suburb,
                city,
                targetSaleHistory, // 🆕 Include target property's last sale if found
                source: comparables.length > 0 ? 'real-time-search' : 'no-results-found'
            }
        };
    },

    auditLogFormat: (input, _output) => ({
        action: 'PROPERTY_COMPARABLES_GENERATE',
        summary: `Generated comparables for property ${input.propertyId}`
    })
};

toolRegistry.register(generateComparablesTool);
