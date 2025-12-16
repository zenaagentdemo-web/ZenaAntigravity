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

// PUT /api/contacts/:id - Update contact
router.put('/:id', (req, res) => contactsController.updateContact(req, res));

// POST /api/contacts/:id/notes - Add relationship note
router.post('/:id/notes', (req, res) => contactsController.addNote(req, res));

export default router;
