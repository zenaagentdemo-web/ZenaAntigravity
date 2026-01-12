import { Request, Response } from 'express';
import { userPersonaService } from '../services/user-persona.service.js';

export async function getPersona(req: Request, res: Response): Promise<void> {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const persona = await userPersonaService.getPersona(userId);
        res.status(200).json(persona);
    } catch (error) {
        console.error('[UserPersonaController] Error:', error);
        res.status(500).json({ error: 'Failed to fetch persona' });
    }
}

export async function refreshPersona(req: Request, res: Response): Promise<void> {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const persona = await userPersonaService.synthesizePersona(userId);
        res.status(200).json(persona);
    } catch (error) {
        console.error('[UserPersonaController] Error:', error);
        res.status(500).json({ error: 'Failed to refresh persona' });
    }
}
