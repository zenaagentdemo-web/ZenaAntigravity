import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';
import { marketScraperService } from '../../services/market-scraper.service.js';
import { logger } from '../../services/logger.service.js';

export const createPropertyTool: ZenaToolDefinition = {
    name: 'property.create',
    domain: 'property',
    description: 'Create a new property listing.',

    inputSchema: {
        type: 'object',
        properties: {
            address: { type: 'string', description: 'Full address of the property' },
            type: { type: 'string', enum: ['residential', 'commercial', 'land'], default: 'residential' },
            status: { type: 'string', enum: ['active', 'under_contract', 'sold', 'withdrawn'], default: 'active' },
            listingPrice: { type: 'number', description: 'Listing price in dollars' },
            bedrooms: { type: 'number', description: 'Number of bedrooms' },
            bathrooms: { type: 'number', description: 'Number of bathrooms' },
            landSize: { type: 'string', description: 'Land size (e.g., "650m²")' },
            floorSize: { type: 'string', description: 'Floor area (e.g., "180m²")' },
            vendorName: { type: 'string', description: 'Full name of the vendor/seller' },
            vendorEmail: { type: 'string', description: 'Email address of the vendor' },
            vendorPhone: { type: 'string', description: 'Phone number of the vendor' }
        },
        required: ['address']
    },

    recommendedFields: ['bedrooms', 'bathrooms', 'type', 'listingPrice', 'vendorName', 'vendorEmail', 'vendorPhone'],

    outputSchema: {
        type: 'object',
        properties: {
            property: { type: 'object' }
        }
    },

    permissions: ['properties:write'],
    requiresApproval: true,
    confirmationPrompt: (input) => {
        const price = Number(input.listingPrice);
        const priceStr = !isNaN(price) && price > 0 ? ` with a listing price of **$${price.toLocaleString()}**` : '';
        return `I'm ready to create a new residential listing at **${input.address}**${priceStr}. Shall I proceed?`;
    },

    execute: async (params, context) => {
        const userId = context.userId;
        const {
            address, type, status, listingPrice, bedrooms, bathrooms, landSize, floorSize,
            vendorName, vendorEmail, vendorPhone
        } = params;

        // 🚨 DATA INTEGRITY: listingPrice is mandatory for creation.
        // It must be provided by the user or confirmed via suggested data.
        if (listingPrice === undefined || listingPrice === null) {
            throw new Error("Listing price is required for property creation. Please provide a price or confirm a suggested one.");
        }

        let finalAddress = address;
        let inferredBeds = bedrooms;
        let inferredBaths = bathrooms;
        let inferredLandSize = landSize;
        let inferredFloorSize = floorSize;
        let inferredType = type || 'residential';
        let inferredFromWeb = false;

        // 🧠 ZENA SUPER-INTEL: Step 1 & 2 - Parallel Geocoding and Enrichment
        console.time(`[property.create] Intelligence Phase for "${address}"`);
        try {
            const [geocodeResponse, webDetails] = await Promise.all([
                fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&addressdetails=1&countrycodes=nz&limit=1`, {
                    headers: { 'User-Agent': 'ZenaAntigravity/1.0' }
                }).then(res => res.ok ? res.json() as Promise<any[]> : []),
                (!bedrooms || !bathrooms) ? marketScraperService.getPropertyDetails(address) : Promise.resolve(null)
            ]);

            // Process Geocoding - Preserve original street number!
            if (geocodeResponse && geocodeResponse.length > 0) {
                const geocoded = geocodeResponse[0];
                const addressDetails = geocoded.address || {};

                // Extract suburb, city, region from geocoded result
                const enrichmentParts = [
                    addressDetails.suburb || addressDetails.neighbourhood,
                    addressDetails.city || addressDetails.town || addressDetails.village,
                    addressDetails.state || addressDetails.region,
                    addressDetails.country
                ].filter(Boolean);

                // Use original address + enrichment (keeps street number!)
                if (enrichmentParts.length > 0) {
                    finalAddress = `${address}, ${enrichmentParts.join(', ')}`;
                }
                // Otherwise keep the original address as-is

                logger.info(`[property.create] Address enriched: ${address} -> ${finalAddress}`);
            }

            // Process Enrichment
            if (webDetails) {
                if (!bedrooms && webDetails.bedrooms) {
                    inferredBeds = webDetails.bedrooms;
                    inferredFromWeb = true;
                }
                if (!bathrooms && webDetails.bathrooms) {
                    inferredBaths = webDetails.bathrooms;
                    inferredFromWeb = true;
                }
                if (!landSize && webDetails.landArea) {
                    inferredLandSize = webDetails.landArea;
                    inferredFromWeb = true;
                }
                if (!floorSize && webDetails.floorArea) {
                    inferredFloorSize = webDetails.floorArea;
                    inferredFromWeb = true;
                }
                if (!type && webDetails.type) {
                    inferredType = webDetails.type;
                }
                logger.info(`[property.create] Enriched from web: ${inferredBeds} beds, ${inferredBaths} baths`);
            }
        } catch (err) {
            logger.warn(`[property.create] Intelligence Phase failed: ${err}`);
        } finally {
            console.timeEnd(`[property.create] Intelligence Phase for "${address}"`);
        }

        // 🧠 ZENA INTEL: Handle Vendor Contact Creation/Linking
        let vendorConnect = {};
        let createdContact = null;

        if (vendorName || vendorEmail) {
            // Try to find existing contact by email first
            let contact = vendorEmail ? await prisma.contact.findFirst({
                where: { userId, emails: { has: vendorEmail } }
            }) : null;

            if (!contact && vendorName) {
                // Initial context for the contact intelligence
                const initialSnippet = `Initial contact created as vendor for ${address}.`;
                const activityDetail = `Contact created during property creation for ${address}.`;

                // Create new contact if not found
                contact = await prisma.contact.create({
                    data: {
                        userId,
                        name: vendorName,
                        emails: vendorEmail ? [vendorEmail] : [],
                        phones: vendorPhone ? [vendorPhone] : [],
                        role: 'vendor',
                        intelligenceSnippet: initialSnippet,
                        lastActivityDetail: activityDetail,
                        lastActivityAt: new Date()
                    }
                });

                // Step 3: Proactive Enrichment - Trigger deep discovery pulse after a short delay
                // Using setTimeout to fully break the execution chain and prevent any blocking
                setTimeout(async () => {
                    try {
                        const { askZenaService } = await import('../../services/ask-zena.service.js');
                        askZenaService.runDiscovery(userId, contact.id);
                    } catch (err) {
                        logger.error(`[property.create] Neural pulse failed for new contact: `, err);
                    }
                }, 100);

                createdContact = contact;
            } else if (contact && vendorPhone && !contact.phones.includes(vendorPhone)) {
                // Update phone if contact found but phone missing
                await prisma.contact.update({
                    where: { id: contact.id },
                    data: { phones: { push: vendorPhone } }
                });
            }

            if (contact) {
                // If the contact exists but has no intelligence, trigger discovery after a short delay
                if (!contact.intelligenceSnippet) {
                    setTimeout(async () => {
                        try {
                            const { askZenaService } = await import('../../services/ask-zena.service.js');
                            askZenaService.runDiscovery(userId, contact.id);
                        } catch (err) {
                            logger.error(`[property.create] Neural pulse failed for existing contact: `, err);
                        }
                    }, 100);
                }

                vendorConnect = {
                    vendors: {
                        connect: { id: contact.id }
                    }
                };
                createdContact = contact;
            }
        }

        const property = await prisma.property.create({
            data: {
                userId,
                address: finalAddress,
                type: inferredType,
                status: status || 'active',
                listingPrice: listingPrice ? Number(listingPrice) : null,
                bedrooms: inferredBeds,
                bathrooms: inferredBaths,
                landSize: inferredLandSize,
                floorSize: inferredFloorSize,
                inferredFromWeb,
                ...vendorConnect
            },
            include: {
                vendors: true
            }
        });

        return {
            success: true,
            data: {
                property: {
                    ...property,
                    listingPrice: property.listingPrice ? Number(property.listingPrice) : null
                },
                contact: createdContact
            }
        };
    },

    auditLogFormat: (input, _output) => ({
        action: 'PROPERTY_CREATE',
        summary: `Created new property listing at ${input.address}`
    })
};

toolRegistry.register(createPropertyTool);
