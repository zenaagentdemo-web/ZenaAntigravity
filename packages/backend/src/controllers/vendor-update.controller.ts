import { Request, Response } from 'express';
import { vendorUpdateService } from '../services/vendor-update.service.js';

/**
 * Generate a vendor update for a property
 * POST /api/properties/:propertyId/vendor-update
 */
export async function generateVendorUpdate(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { propertyId } = req.params;
    
    if (!propertyId) {
      return res.status(400).json({ error: 'Property ID is required' });
    }
    
    const vendorUpdate = await vendorUpdateService.generateVendorUpdate({
      propertyId,
      userId,
    });
    
    res.json(vendorUpdate);
  } catch (error) {
    console.error('Generate vendor update error:', error);
    
    if (error instanceof Error && error.message === 'Property not found') {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate vendor update',
    });
  }
}
