/**
 * Geocoding Controller
 * Provides address autocomplete using OpenStreetMap Nominatim API
 * Free, no API key required, but respects rate limits
 */

import { Request, Response } from 'express';

// Nominatim API base URL
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

// Rate limiting - Nominatim requires max 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 seconds to be safe

interface NominatimResult {
    place_id: number;
    licence: string;
    osm_type: string;
    osm_id: number;
    lat: string;
    lon: string;
    display_name: string;
    address: {
        house_number?: string;
        road?: string;
        suburb?: string;
        city?: string;
        state?: string;
        postcode?: string;
        country?: string;
        country_code?: string;
    };
    boundingbox: string[];
}

interface AddressSuggestion {
    id: string;
    fullAddress: string;
    streetAddress: string;
    suburb: string;
    city: string;
    postcode: string;
    lat: number;
    lon: number;
    source: 'nominatim' | 'database' | 'manual';
}

class GeocodingController {
    /**
     * GET /api/geocoding/autocomplete
     * Search for NZ addresses
     */
    async autocomplete(req: Request, res: Response): Promise<void> {
        try {
            const { query } = req.query;

            if (!query || typeof query !== 'string' || query.trim().length < 3) {
                res.json({ suggestions: [] });
                return;
            }

            const searchQuery = query.trim();
            const suggestions: AddressSuggestion[] = [];

            // Rate limit check
            const now = Date.now();
            const timeSinceLastRequest = now - lastRequestTime;

            if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
                await new Promise(resolve =>
                    setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
                );
            }
            lastRequestTime = Date.now();

            // Query Nominatim for NZ addresses
            const params = new URLSearchParams({
                q: searchQuery,
                format: 'json',
                addressdetails: '1',
                countrycodes: 'nz',
                limit: '8',
                dedupe: '1',
            });

            const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
                headers: {
                    'User-Agent': 'ZenaAntigravity/1.0 (Real Estate CRM)',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                console.error('Nominatim API error:', response.status, response.statusText);
                res.json({ suggestions: [] });
                return;
            }

            const results: NominatimResult[] = await response.json();

            // Transform results to our format
            for (const result of results) {
                const addr = result.address;

                // Filter to only include results that look like street addresses
                // Skip places without house numbers or road names
                if (!addr.road) continue;

                const streetAddress = addr.house_number
                    ? `${addr.house_number} ${addr.road}`
                    : addr.road;

                const suburb = addr.suburb || '';
                const city = addr.city || addr.state || '';
                const postcode = addr.postcode || '';

                // Build full address
                const parts = [streetAddress];
                if (suburb) parts.push(suburb);
                if (city) parts.push(city);
                if (postcode) parts.push(postcode);
                const fullAddress = parts.join(', ');

                suggestions.push({
                    id: `nom-${result.place_id}`,
                    fullAddress,
                    streetAddress,
                    suburb,
                    city,
                    postcode,
                    lat: parseFloat(result.lat),
                    lon: parseFloat(result.lon),
                    source: 'nominatim',
                });
            }

            res.json({
                suggestions,
                query: searchQuery,
            });

        } catch (error) {
            console.error('Geocoding autocomplete error:', error);
            res.json({ suggestions: [] });
        }
    }

    /**
     * GET /api/geocoding/enrich
     * Lookup full property details (specs, RV, sale history)
     */
    async enrichProperty(req: Request, res: Response): Promise<void> {
        try {
            const { address } = req.query;

            if (!address || typeof address !== 'string' || address.trim().length < 5) {
                res.json({ found: false });
                return;
            }

            const searchAddress = address.trim();

            // Dynamic import to avoid circular dependencies
            const { marketScraperService } = await import('../services/market-scraper.service.js');
            // Use getPropertyDetails which now includes full enrichment (specs + RV + sales)
            const details = await marketScraperService.getPropertyDetails(searchAddress);

            if (details) {
                res.json({
                    found: true,
                    data: details
                });
            } else {
                res.json({ found: false });
            }

        } catch (error) {
            console.error('Property enrichment error:', error);
            res.json({ found: false });
        }
    }
}

export const geocodingController = new GeocodingController();
