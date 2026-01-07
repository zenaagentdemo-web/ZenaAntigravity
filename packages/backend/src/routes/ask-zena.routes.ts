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

// POST /api/ask/property-improvement-actions - Generate AI-powered improvement actions for properties
// This powers the PropertyIntelScoreTooltip "Improve Now" feature
router.post('/property-improvement-actions', askZenaController.getPropertyImprovementActions);

// GET /api/ask/contact-call-intel/:id - Get predictive call intelligence
router.get('/contact-call-intel/:id', askZenaController.getContactCallIntel);

// POST /api/ask/smart-search - Parse natural language search query
router.post('/smart-search', askZenaController.parseSearchQuery);

// POST /api/ask/deal-search - Parse natural language deal search query
router.post('/deal-search', askZenaController.parseDealSearchQuery);

// POST /api/ask/property-search - Parse natural language property search query
router.post('/property-search', askZenaController.parsePropertySearchQuery);

// POST /api/ask/contact-search - Parse natural language contact search query
router.post('/contact-search', askZenaController.parseContactSearchQuery);

// Magic Entry
router.post('/parse-property', askZenaController.parsePropertyDetails);

// POST /api/ask/record-action - Record execution of an AI-suggested action
router.post('/record-action', askZenaController.recordAction);

// POST /api/ask/discover - Trigger deep intelligence discovery for a contact
router.post('/discover', askZenaController.discover);

// POST /api/ask/cleanup - Cleanup transcript text
router.post('/cleanup', askZenaController.cleanupTranscript);

// GET /api/ask/proactive-hud - Get Zena's #1 recommendation
router.get('/proactive-hud', askZenaController.getProactiveHud);

// POST /api/ask/suggest-batch-tags - AI-powered batch tag suggestions
router.post('/suggest-batch-tags', askZenaController.suggestBatchTags);

// POST /api/ask/predict-contact-type - Predict contact type from email/name
router.post('/predict-contact-type', askZenaController.predictContactType);

// POST /api/ask/relationships - Discover contact-to-contact links
router.post('/relationships', askZenaController.getRelationships);

// PropertyDetailPage Intelligence Gaps
// POST /api/ask/schedule-suggestions - AI-suggested open home times
router.post('/schedule-suggestions', askZenaController.getScheduleSuggestions);

// POST /api/ask/milestone-suggestions - AI-suggested milestones
router.post('/milestone-suggestions', askZenaController.getMilestoneSuggestions);

// POST /api/ask/timeline-summary - AI summary of property activity
router.post('/timeline-summary', askZenaController.getTimelineSummary);

// POST /api/ask/generate-pdf - Generate PDF from report content
router.post('/generate-pdf', askZenaController.generateReportPdf);

export default router;

