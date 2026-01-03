/**
 * Oracle Controller - API endpoints for predictive intelligence
 */

import { Request, Response } from 'express';
import { oracleService, OraclePrediction } from '../services/oracle.service.js';

/**
 * GET /api/oracle/contact/:id
 * Get Oracle predictions for a contact
 */
export async function getContactPrediction(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const { id: contactId } = req.params;

        if (!contactId) {
            res.status(400).json({ error: 'Contact ID required' });
            return;
        }

        const prediction = await oracleService.getContactPrediction(contactId);

        if (!prediction) {
            // Return a "learning" state if no prediction exists yet
            res.status(200).json({
                maturityLevel: 0,
                maturityLabel: 'Learning',
                personalityType: null,
                personalityConfidence: null,
                communicationTips: [],
                sellProbability: null,
                buyProbability: null,
                churnRisk: null,
                signalsDetected: [],
                dataPoints: {
                    emailsAnalyzed: 0,
                    eventsCount: 0,
                    monthsActive: 0,
                },
                message: 'Zena is still learning about this contact. Predictions will unlock as more data is gathered.',
            });
            return;
        }

        res.status(200).json(prediction);
    } catch (error) {
        console.error('Error fetching Oracle prediction:', error);
        res.status(500).json({ error: 'Failed to fetch prediction' });
    }
}

/**
 * POST /api/oracle/analyze/:id
 * Trigger fresh analysis for a contact
 */
export async function analyzeContact(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const { id: contactId } = req.params;

        if (!contactId) {
            res.status(400).json({ error: 'Contact ID required' });
            return;
        }

        const prediction = await oracleService.analyzeContact(contactId, req.user.userId);

        res.status(200).json({
            success: true,
            prediction,
            message: `Analysis complete. Maturity level: ${prediction.maturityLabel}`,
        });
    } catch (error) {
        console.error('Error analyzing contact:', error);
        res.status(500).json({ error: 'Failed to analyze contact' });
    }
}

/**
 * POST /api/oracle/batch-analyze
 * Analyze multiple contacts in batch
 */
export async function batchAnalyzeContacts(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const { contactIds } = req.body;

        if (!Array.isArray(contactIds) || contactIds.length === 0) {
            res.status(400).json({ error: 'contactIds array required' });
            return;
        }

        // Limit batch size
        const idsToProcess = contactIds.slice(0, 20);

        const results: Record<string, OraclePrediction> = {};
        const errors: string[] = [];

        for (const contactId of idsToProcess) {
            try {
                const prediction = await oracleService.analyzeContact(contactId, req.user.userId);
                results[contactId] = prediction;
            } catch (err) {
                console.error(`Failed to analyze contact ${contactId}:`, err);
                errors.push(contactId);
            }
        }

        res.status(200).json({
            success: true,
            analyzed: Object.keys(results).length,
            failed: errors.length,
            predictions: results,
            errors,
        });
    } catch (error) {
        console.error('Error in batch analysis:', error);
        res.status(500).json({ error: 'Failed to batch analyze contacts' });
    }
}

/**
 * POST /api/oracle/record-email
 * Record that an email was analyzed (increments counter)
 */
export async function recordEmailAnalyzed(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const { contactId, emailContent } = req.body;

        if (!contactId) {
            res.status(400).json({ error: 'contactId required' });
            return;
        }

        await oracleService.recordEmailAnalyzed(contactId, req.user.userId, emailContent || '');

        res.status(200).json({ success: true, message: 'Email recorded' });
    } catch (error) {
        console.error('Error recording email:', error);
        res.status(500).json({ error: 'Failed to record email' });
    }
}
