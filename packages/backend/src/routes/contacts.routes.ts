import { Router } from 'express';
import { contactsController } from '../controllers/contacts.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/contacts - List contacts with search and filters
router.get('/', (req, res) => contactsController.listContacts(req, res));

// GET /api/contacts/:id - Get contact details
router.get('/:id', (req, res) => contactsController.getContact(req, res));

// POST /api/contacts - Create a new contact
router.post('/', (req, res) => contactsController.createContact(req, res));

// PUT /api/contacts/:id - Update contact
router.put('/:id', (req, res) => contactsController.updateContact(req, res));

// DELETE /api/contacts/:id - Delete contact
router.delete('/:id', (req, res) => contactsController.deleteContact(req, res));

// POST /api/contacts/bulk-delete - Bulk delete contacts
router.post('/bulk-delete', (req, res) => contactsController.bulkDeleteContacts(req, res));

// PATCH /api/contacts/bulk - Bulk update contacts
router.patch('/bulk', (req, res) => contactsController.bulkUpdateContacts(req, res));

// POST /api/contacts/:id/notes - Add relationship note
router.post('/:id/notes', (req, res) => contactsController.addNote(req, res));

// POST /api/contacts/:id/recategorize - Recategorize a single contact
router.post('/:id/recategorize', (req, res) => contactsController.recategorizeContact(req, res));

// POST /api/contacts/recategorize-all - Recategorize all contacts
router.post('/recategorize-all', (req, res) => contactsController.recategorizeAll(req, res));

// GET /api/contacts/:id/engagement - Get real engagement data from Zena's AI brain
router.get('/:id/engagement', (req, res) => contactsController.getContactEngagement(req, res));

// POST /api/contacts/batch-engagement - Get engagement data for multiple contacts
router.post('/batch-engagement', (req, res) => contactsController.getBatchEngagement(req, res));

export default router;
