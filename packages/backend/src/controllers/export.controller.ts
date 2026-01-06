import { Request, Response } from 'express';
import { exportService } from '../services/export.service.js';
import prisma from '../config/database.js';

/**
 * Create a new export job
 * POST /api/export/contacts
 * POST /api/export/properties
 * POST /api/export/deals
 */
export async function createExport(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { format, recordIds } = req.body;

    // Determine type from URL path
    const pathParts = req.path.split('/');
    const type = pathParts[pathParts.length - 1] as 'contacts' | 'properties' | 'deals';

    // Validate format
    const validFormats = type === 'contacts'
      ? ['csv', 'xlsx', 'vcard']
      : ['csv', 'xlsx'];

    if (!format || !validFormats.includes(format)) {
      return res.status(400).json({
        error: `Invalid format. Supported formats for ${type}: ${validFormats.join(', ')}`,
      });
    }

    // Validate recordIds if provided
    if (recordIds && !Array.isArray(recordIds)) {
      return res.status(400).json({
        error: 'recordIds must be an array',
      });
    }

    const exportId = await exportService.createExport({
      userId,
      type,
      format,
      recordIds,
    });

    res.status(202).json({
      exportId,
      status: 'pending',
      message: 'Export job created. Use the exportId to check status and download.',
    });
  } catch (error) {
    console.error('Create export error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create export',
    });
  }
}

/**
 * Get export status and download URL
 * GET /api/export/:id
 */
export async function getExportStatus(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const exportResult = await exportService.getExport(id, userId);

    res.json(exportResult);
  } catch (error) {
    console.error('Get export status error:', error);

    if (error instanceof Error && error.message === 'Export not found') {
      return res.status(404).json({ error: 'Export not found' });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get export status',
    });
  }
}

/**
 * Download export file
 * GET /api/export/:id/download
 */
export async function downloadExport(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Get export from Prisma to access content and format directly
    // This avoids having to trust the service's ExportResult interface for the binary/text content
    const exportRecord = await prisma.export.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!exportRecord) {
      return res.status(404).json({ error: 'Export not found' });
    }

    if (exportRecord.status !== 'completed') {
      return res.status(400).json({
        error: `Export is not ready. Current status: ${exportRecord.status}`,
      });
    }

    if (!exportRecord.content) {
      return res.status(410).json({ error: 'Export content has expired or was not generated' });
    }

    // Set headers based on format
    let contentType = 'text/csv';
    let extension = 'csv';

    if (exportRecord.format === 'vcard') {
      contentType = 'text/vcard';
      extension = 'vcf';
    } else if (exportRecord.format === 'xlsx') {
      // For now, Zena generates CSV even for XLSX request as a placeholder
      contentType = 'text/csv';
      extension = 'csv';
    }

    const filename = `${exportRecord.type.charAt(0).toUpperCase() + exportRecord.type.slice(1)}_Export_${new Date().toISOString().split('T')[0]}.${extension}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.send(exportRecord.content);
  } catch (error) {
    console.error('Download export error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to download export',
    });
  }
}
