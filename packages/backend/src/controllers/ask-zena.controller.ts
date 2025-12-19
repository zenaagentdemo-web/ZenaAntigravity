import { Request, Response } from 'express';
import { askZenaService, type ConversationMessage } from '../services/ask-zena.service.js';
import { voiceService } from '../services/voice.service.js';

/**
 * Ask Zena Controller
 * Handles conversational AI queries
 */

/**
 * POST /api/ask
 * Submit a natural language query
 */
export async function submitQuery(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { query, conversationHistory, conversationId, attachments } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Query is required and must be a string' });
      return;
    }

    // Process the query
    const response = await askZenaService.processQuery({
      userId,
      query,
      conversationHistory: conversationHistory || [],
      conversationId,
      attachments
    });

    // Store the query and response in conversation history (optional - could be stored in DB)
    // For now, we'll just return the response in the format expected by frontend

    res.status(200).json({
      response: response.answer,
      messageId: Date.now().toString(),
      sources: response.sources,
      suggestedActions: response.suggestedActions,
    });
  } catch (error) {
    console.error('Error in submitQuery:', error);
    res.status(500).json({
      error: 'Failed to process query',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/ask/voice
 * Submit a voice query (with audio file)
 */
export async function submitVoiceQuery(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // For voice queries, we would:
    // 1. Receive audio file
    // 2. Transcribe using STT service
    // 3. Process as text query
    // 4. Optionally return TTS audio response

    // For now, we'll implement a simplified version that expects transcribed text
    const { transcript, conversationHistory } = req.body;

    if (!transcript || typeof transcript !== 'string') {
      res.status(400).json({ error: 'Transcript is required and must be a string' });
      return;
    }

    // Process the transcribed query
    const response = await askZenaService.processQuery({
      userId,
      query: transcript,
      conversationHistory: conversationHistory || [],
    });

    res.status(200).json({
      response: response.answer,
      messageId: Date.now().toString(),
      sources: response.sources,
      suggestedActions: response.suggestedActions,
    });
  } catch (error) {
    console.error('Error in submitVoiceQuery:', error);
    res.status(500).json({
      error: 'Failed to process voice query',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/ask/history
 * Get conversation history
 */
export async function getConversationHistory(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // For now, we'll return an empty array
    // In a full implementation, we would store conversation history in the database
    // and retrieve it here

    const history: ConversationMessage[] = [];

    res.status(200).json({ history });
  } catch (error) {
    console.error('Error in getConversationHistory:', error);
    res.status(500).json({
      error: 'Failed to retrieve conversation history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/ask/draft
 * Generate a draft communication
 */
export async function generateDraft(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { request } = req.body;

    if (!request || typeof request !== 'string') {
      res.status(400).json({ error: 'Request is required and must be a string' });
      return;
    }

    // Generate draft
    const draft = await askZenaService.generateDraft(userId, request);

    res.status(200).json({ draft });
  } catch (error) {
    console.error('Error in generateDraft:', error);
    res.status(500).json({
      error: 'Failed to generate draft',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
/**
 * POST /api/ask/stt
 * Transcribe audio
 */
export async function transcribe(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Expecting base64 audio and mimeType in body
    const { audio, mimeType } = req.body;

    if (!audio) {
      res.status(400).json({ error: 'Audio data is required' });
      return;
    }

    const transcript = await voiceService.transcribe(audio, mimeType || 'audio/webm');
    res.status(200).json({ transcript });
  } catch (error) {
    console.error('STT error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
}

/**
 * POST /api/ask/tts
 * Text to speech
 */
export async function synthesizeSpeech(req: Request, res: Response): Promise<void> {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    const audioBuffer = await voiceService.textToSpeech(text);
    res.set('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'Failed to synthesize speech' });
  }
}
