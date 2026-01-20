import { Request, Response } from 'express';
import { voiceNoteService } from '../services/voice-note.service.js';

/**
 * Upload and create a new voice note
 * POST /api/voice-notes
 */
export async function uploadVoiceNote(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { audioUrl } = req.body;

    if (!audioUrl) {
      return res.status(400).json({ error: 'audioUrl is required' });
    }

    // Create voice note record
    const voiceNoteId = await voiceNoteService.createVoiceNote(userId, audioUrl);

    // Process voice note synchronously to return result to frontend
    const result = await voiceNoteService.processVoiceNote(voiceNoteId);

    res.status(201).json({
      id: voiceNoteId,
      ...result,
      message: 'Voice note processed successfully',
    });
  } catch (error) {
    console.error('Error uploading voice note:', error);
    res.status(500).json({
      error: 'Failed to upload voice note',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get voice note details
 * GET /api/voice-notes/:id
 */
export async function getVoiceNote(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const voiceNote = await voiceNoteService.getVoiceNote(id, userId);

    res.json(voiceNote);
  } catch (error) {
    console.error('Error getting voice note:', error);

    if (error instanceof Error && error.message === 'Voice note not found') {
      return res.status(404).json({ error: 'Voice note not found' });
    }

    res.status(500).json({
      error: 'Failed to get voice note',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get all voice notes for the authenticated user
 * GET /api/voice-notes
 */
export async function getVoiceNotes(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { status, limit, offset } = req.query;

    const voiceNotes = await voiceNoteService.getVoiceNotes(userId, {
      status: status as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(voiceNotes);
  } catch (error) {
    console.error('Error getting voice notes:', error);
    res.status(500).json({
      error: 'Failed to get voice notes',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get audio file URL for a voice note
 * GET /api/voice-notes/:id/audio
 */
export async function getVoiceNoteAudio(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const voiceNote = await voiceNoteService.getVoiceNote(id, userId);

    // Return the audio URL (in production, this might be a signed S3 URL)
    res.json({ audioUrl: voiceNote.audioUrl });
  } catch (error) {
    console.error('Error getting voice note audio:', error);

    if (error instanceof Error && error.message === 'Voice note not found') {
      return res.status(404).json({ error: 'Voice note not found' });
    }

    res.status(500).json({
      error: 'Failed to get voice note audio',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
