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

export default router;
