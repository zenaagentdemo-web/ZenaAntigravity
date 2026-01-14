
import { Request, Response } from 'express';
import { driveModeService } from '../services/drive-mode.service.js';

export const getDriveQueue = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id; // Auth middleware must be used
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const queue = await driveModeService.getDriveQueue(userId);

        res.json({
            success: true,
            queue
        });
    } catch (error) {
        console.error('[DriveMode] Error fetching queue:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch drive queue' });
    }
};
