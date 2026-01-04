import { Request, Response } from 'express';
import { marketScraperService } from '../services/market-scraper.service.js';

export class MarketDataController {
    /**
     * POST /api/market-data/scrape
     * Generate a comparable sales report for any address manually provided
     */
    async generateReport(req: Request, res: Response): Promise<void> {
        try {
            const { address, bedrooms } = req.body;

            if (!address) {
                res.status(400).json({ error: 'Address is required' });
                return;
            }

            // Extract suburb from address (Assume "Street, Suburb, City")
            const parts = address.split(',').map((p: string) => p.trim());
            let suburb = address;

            if (parts.length >= 3) {
                // Return middle part for "Street, Suburb, City"
                suburb = parts[parts.length - 2];
            } else if (parts.length === 2) {
                // Return last part for "Street, Suburb"
                suburb = parts[1];
            }
            const beds = bedrooms || 3;

            console.log(`[MarketDataController] Standalone scrape triggered for: ${address} (Suburb: ${suburb})`);

            const comparables = await marketScraperService.findComparableSales(suburb, beds);

            res.status(200).json({
                success: true,
                address,
                suburb,
                comparables,
                message: `Found ${comparables.length} comparable sales for ${suburb}`
            });
        } catch (error) {
            console.error('[MarketDataController] Scrape failed:', error);
            res.status(500).json({ error: 'Failed to generate comparable analysis report' });
        }
    }

    /**
     * GET /api/market-data/autocomplete
     * Provide address/suburb suggestions as the user types
     */
    async getAutocompleteSuggestions(req: Request, res: Response): Promise<void> {
        try {
            const { query } = req.query;
            const q = (query as string || '').toLowerCase();

            if (!q || q.length < 2) {
                res.status(200).json({ suggestions: [] });
                return;
            }

            // Real estate geography database simulation (Common NZ Suburbs/Addresses)
            const seedData = [
                "Point Chevalier, Auckland",
                "Pt Chev, Auckland",
                "Parnell, Auckland",
                "Grey Lynn, Auckland",
                "Ponsonby, Auckland",
                "Waterview, Auckland",
                "Mount Eden, Auckland",
                "Remuera, Auckland",
                "3/186 Point Chevalier Road, Point Chevalier, Auckland",
                "45 Walmer Road, Point Chevalier, Auckland",
                "108 The Strand, Parnell, Auckland",
                "24 Beach Road, Parnell, Auckland"
            ];

            const suggestions = seedData.filter(item =>
                item.toLowerCase().includes(q)
            ).slice(0, 5);

            res.status(200).json({ suggestions });
        } catch (error) {
            console.error('[MarketDataController] Autocomplete failed:', error);
            res.status(500).json({ error: 'Failed to fetch suggestions' });
        }
    }
}

export const marketDataController = new MarketDataController();
