import { Router } from 'express';
import { threadsController } from '../controllers/threads.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All thread routes require authentication
router.use(authenticate);

// Get statistics (must come before /:id route)
router.get('/statistics', (req, res) => threadsController.getStatistics(req, res));

// List threads with filters
router.get('/', (req, res) => threadsController.listThreads(req, res));

// Get specific thread
router.get('/:id', (req, res) => threadsController.getThread(req, res));

// Get messages in a thread
router.get('/:id/messages', (req, res) => threadsController.getMessages(req, res));

// Update thread metadata
router.put('/:id', (req, res) => threadsController.updateThread(req, res));

// Reply to thread
router.post('/:id/reply', (req, res) => threadsController.replyToThread(req, res));

// Snooze thread
router.post('/:id/snooze', (req, res) => threadsController.snoozeThread(req, res));

// Classify specific thread
router.post('/:id/classify', (req, res) => threadsController.classifyThread(req, res));

// Extract entities from specific thread
router.post('/:id/extract-entities', (req, res) => threadsController.extractEntities(req, res));

// Batch classify threads
router.post('/classify-batch', (req, res) => threadsController.classifyBatch(req, res));

// Batch extract entities from threads
router.post('/extract-entities-batch', (req, res) => threadsController.extractEntitiesBatch(req, res));

// Classify all unclassified threads
router.post('/classify-unclassified', (req, res) => threadsController.classifyUnclassified(req, res));

export default router;
