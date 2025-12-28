import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import * as askZenaController from '../controllers/ask-zena.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/ask - Submit natural language query
router.post('/', askZenaController.submitQuery);

// POST /api/ask/voice - Submit voice query
router.post('/voice', askZenaController.submitVoiceQuery);

// GET /api/ask/history - Get conversation history
router.get('/history', askZenaController.getConversationHistory);

// POST /api/ask/stt - Transcribe audio
router.post('/stt', askZenaController.transcribe);

// POST /api/ask/tts - Synthesize speech
router.post('/tts', askZenaController.synthesizeSpeech);

// POST /api/ask/draft - Generate draft communication
router.post('/draft', askZenaController.generateDraft);

// POST /api/ask/compose-email - Generate AI-powered email draft for contacts
// This connects ZenaBatchComposeModal to Zena's high intelligence brain
router.post('/compose-email', askZenaController.composeEmail);

// POST /api/ask/improvement-actions - Generate AI-powered improvement actions
// This powers the IntelScoreTooltip "Improve Now" feature
router.post('/improvement-actions', askZenaController.getImprovementActions);

// GET /api/ask/contact-call-intel/:id - Get predictive call intelligence
router.get('/contact-call-intel/:id', askZenaController.getContactCallIntel);

// POST /api/ask/smart-search - Parse natural language search query
router.post('/smart-search', askZenaController.parseSearchQuery);

// POST /api/ask/record-action - Record execution of an AI-suggested action
router.post('/record-action', askZenaController.recordAction);

// POST /api/ask/discover - Trigger deep intelligence discovery for a contact
router.post('/discover', askZenaController.discover);

// POST /api/ask/cleanup - Cleanup transcript text
router.post('/cleanup', askZenaController.cleanupTranscript);

export default router;
