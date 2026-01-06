import { Request, Response } from 'express';
import { crmDeliveryService } from '../services/crm-delivery.service.js';
import prisma from '../config/database.js';
import { syncLedgerService } from '../services/sync-ledger.service.js';

export const syncContactToCrm = async (req: Request, res: Response) => {
    try {
        const { contactId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const contact = await prisma.contact.findUnique({
            where: { id: contactId, userId }
        });

        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        const result = await crmDeliveryService.syncContact(userId, contact);

        if (result.success) {
            return res.json({
                message: 'Contact synced to CRM successfully via Email Bridge',
                messageId: result.messageId
            });
        } else {
            return res.status(500).json({ error: result.error || 'Failed to sync contact' });
        }
    } catch (error) {
        console.error('[CrmDeliveryController] syncContactToCrm error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const syncPropertyToCrm = async (req: Request, res: Response) => {
    try {
        const { propertyId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const property = await prisma.property.findUnique({
            where: { id: propertyId, userId }
        });

        if (!property) {
            return res.status(404).json({ error: 'Property not found' });
        }

        const result = await crmDeliveryService.syncProperty(userId, property);

        if (result.success) {
            return res.json({
                message: 'Property synced to CRM successfully via Email Bridge',
                messageId: result.messageId
            });
        } else {
            return res.status(500).json({ error: result.error || 'Failed to sync property' });
        }
    } catch (error) {
        console.error('[CrmDeliveryController] syncPropertyToCrm error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateCrmConfig = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { crmEmails, crmType } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Validate crmEmails array format
        if (crmEmails && !Array.isArray(crmEmails)) {
            return res.status(400).json({ error: 'crmEmails must be an array' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { crmEmails, crmType },
            select: { crmEmails: true, crmType: true }
        });

        res.json({ message: 'CRM configuration updated successfully', config: updatedUser });
    } catch (error) {
        console.error('[CrmDeliveryController] updateCrmConfig error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getCrmConfig = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { crmEmails: true, crmType: true }
        });

        // Return in expected format with backwards compat
        const crmEmails = (user?.crmEmails as any[]) || [];
        res.json({
            crmEmails,
            crmType: user?.crmType,
            // Legacy field for backwards compat
            crmEmail: crmEmails.length > 0 ? crmEmails[0].email : null
        });
    } catch (error) {
        console.error('[CrmDeliveryController] getCrmConfig error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const sendTestCrmSync = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { crmEmail: true, crmType: true, email: true }
        });

        if (!user?.crmEmail) {
            return res.status(400).json({ error: 'CRM Email Bridge not configured' });
        }

        // Mock contact for testing
        const testContact: any = {
            name: 'Testing Zena Sync',
            emailAddresses: 'test@example.com',
            phoneNumbers: '021 000 0000',
            role: 'Test Entity',
            notes: 'This is a test notification from Zena AI to verify your email bridge is working correctly.'
        };

        const result = await crmDeliveryService.syncContact(userId, testContact as any);

        if (result.success) {
            res.json({ message: 'Test email sent successfully to your CRM dropbox' });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('[CrmDeliveryController] sendTestCrmSync error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getDeltaStatus = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const delta = await syncLedgerService.getUnsyncedChanges(userId);
        res.json(delta);
    } catch (error) {
        console.error('[CrmDeliveryController] getDeltaStatus error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
