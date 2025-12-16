import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  uploadVoiceNote,
  getVoiceNote,
  getVoiceNotes,
  getVoiceNoteAudio,
} from '../controllers/voice-note.controller.js';

const router = Router();

// All voice note routes require authentication
router.use(authenticateToken);

// Get all voice notes
router.get('/', getVoiceNotes);

// Upload a new voice note
router.post('/', uploadVoiceNote);

// Get a single voice note
router.get('/:id', getVoiceNote);

// Get audio file URL for a voice note
router.get('/:id/audio', getVoiceNoteAudio);

export default router;
