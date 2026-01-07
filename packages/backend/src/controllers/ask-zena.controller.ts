import { Request, Response } from 'express';
import { askZenaService, type ConversationMessage } from '../services/ask-zena.service.js';
import { relationshipService } from '../services/relationship.service.js';
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
  console.log('[AskZenaController] 📥 RECEIVED REQUEST TO /api/ask');
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
 * POST /api/ask/compose-email
 * Generate AI-powered email draft for contacts
 * This connects ZenaBatchComposeModal to Zena's high intelligence brain
 */
export async function composeEmail(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { contacts, draftType = 'quick', actionContext, propertyContext } = req.body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      res.status(400).json({ error: 'contacts array is required and must not be empty' });
      return;
    }

    // Validate draftType
    if (draftType !== 'quick' && draftType !== 'detailed') {
      res.status(400).json({ error: 'draftType must be "quick" or "detailed"' });
      return;
    }

    console.log(`[Ask Zena] Generating ${draftType} email for ${contacts.length} contact(s)${actionContext ? ` with context: ${actionContext}` : ''}${propertyContext ? ` for property: ${propertyContext.address}` : ''}`);

    // Generate AI email draft with full property context for grounding
    const result = await askZenaService.generateContactEmail(userId, contacts, draftType, actionContext, propertyContext);

    res.status(200).json({
      subject: result.subject,
      body: result.body,
      draftType
    });
  } catch (error) {
    console.error('Error in composeEmail:', error);
    res.status(500).json({
      error: 'Failed to generate email draft',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/ask/improvement-actions
 * Generate AI-powered improvement actions for a contact
 * This powers the IntelScoreTooltip "Improve Now" feature
 */
export async function getImprovementActions(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { contact } = req.body;

    if (!contact || !contact.id || !contact.name) {
      res.status(400).json({ error: 'contact object with id and name is required' });
      return;
    }

    console.log(`[Ask Zena] Generating improvement actions for ${contact.name}`);

    // Generate AI improvement actions
    const result = await askZenaService.generateImprovementActions(userId, contact);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getImprovementActions:', error);
    res.status(500).json({
      error: 'Failed to generate improvement actions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/ask/property-improvement-actions
 * Generate AI-powered improvement actions for a property
 */
export async function getPropertyImprovementActions(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { propertyId } = req.body;

    if (!propertyId) {
      res.status(400).json({ error: 'propertyId is required' });
      return;
    }

    console.log(`[Ask Zena] Generating improvement actions for property ${propertyId}`);

    const result = await askZenaService.generatePropertyImprovementActions(userId, propertyId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getPropertyImprovementActions:', error);
    res.status(500).json({
      error: 'Failed to generate property improvement actions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/ask/contact-call-intel/:id
 * Generate AI-powered call intelligence for a contact (Best time, talking points)
 */
export async function getContactCallIntel(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const contactId = req.params.id;
    if (!contactId) {
      res.status(400).json({ error: 'Contact ID is required' });
      return;
    }

    console.log(`[Ask Zena] Generating call intel for contact ${contactId}`);

    // Generate Call Intel
    // Note: We'll implement this method in the service next
    const result = await askZenaService.generateCallIntel(userId, contactId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getContactCallIntel:', error);
    res.status(500).json({
      error: 'Failed to generate call intelligence',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/ask/smart-search
 * Parse natural language search query into structured filters
 */
export async function parseSearchQuery(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { query } = req.body;
    if (!query) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    console.log(`[Ask Zena] Parsing smart search query: "${query}"`);

    const result = await askZenaService.parseSearchQuery(userId, query);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in parseSearchQuery:', error);
    res.status(500).json({
      error: 'Failed to parse search query',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/ask/property-search
 * Parse natural language property search query into structured filters
 */
export async function parsePropertySearchQuery(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { query } = req.body;
    if (!query) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    console.log(`[Ask Zena] Parsing property smart search query: "${query}"`);

    const result = await askZenaService.parsePropertySearchQuery(userId, query);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in parsePropertySearchQuery:', error);
    res.status(500).json({
      error: 'Failed to parse property search query',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/ask/deal-search
 * Parse natural language deal search query into structured filters
 */
export async function parseDealSearchQuery(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { query } = req.body;
    if (!query) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    console.log(`[Ask Zena] Parsing deal smart search query: "${query}"`);

    const result = await askZenaService.parseDealSearchQuery(userId, query);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in parseDealSearchQuery:', error);
    res.status(500).json({
      error: 'Failed to parse deal search query',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/ask/contact-search
 * Parse natural language contact search queries and return rich AI responses
 */
export async function parseContactSearchQuery(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { query } = req.body;
    if (!query) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    console.log(`[Ask Zena] Parsing contact smart search query: "${query}"`);
    const result = await askZenaService.parseContactSearchQuery(userId, query);
    res.status(200).json(result);

  } catch (error) {
    console.error('Error in parseContactSearchQuery:', error);
    res.status(500).json({
      error: 'Failed to parse contact search query',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/ask/record-action
 * Record execution of an AI-suggested action
 */
export async function recordAction(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { contactId, actionType, actionDescription } = req.body;
    if (!contactId || !actionType) {
      res.status(400).json({ error: 'contactId and actionType are required' });
      return;
    }

    console.log(`[Ask Zena] Recording action "${actionType}" for contact ${contactId}`);

    const result = await askZenaService.recordActionExecution(userId, contactId, actionType, actionDescription);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in recordAction:', error);
    res.status(500).json({
      error: 'Failed to record action execution',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/ask/discover
 * Trigger deep intelligence discovery for a contact
 */
export async function discover(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { contactId } = req.body;
    if (!contactId) {
      res.status(400).json({ error: 'contactId is required' });
      return;
    }

    console.log(`[Ask Zena] Triggering intelligence discovery for contact ${contactId}`);

    const result = await askZenaService.runDiscovery(userId, contactId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in discover:', error);
    res.status(500).json({
      error: 'Failed to run intelligence discovery',
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

/**
 * POST /api/ask/cleanup
 * Cleanup transcript text
 */
export async function cleanupTranscript(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { text } = req.body;
    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    const cleaned = await askZenaService.cleanupTranscript(text);
    res.status(200).json({ text: cleaned });
  } catch (error) {
    console.error('Error in cleanupTranscript:', error);
    res.status(500).json({ error: 'Failed to cleanup transcript' });
  }
}

/**
 * GET /api/ask/proactive-hud
 * Get Zena's #1 recommendation across the whole database
 */
export async function getProactiveHud(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id || 'demo-user-id';

    const recommendation = await askZenaService.getProactiveRecommendation(userId);
    res.status(200).json(recommendation);
  } catch (error) {
    console.error('Error in getProactiveHud:', error);
    res.status(500).json({ error: 'Failed to get recommendation' });
  }
}
/**
 * POST /api/ask/suggest-batch-tags
 * Get AI-powered suggestions for batch tagging contacts
 * Analyzes selected contacts and recommends roles/categories
 */
export async function suggestBatchTags(req: Request, res: Response): Promise<void> {
  try {
    const { contactIds } = req.body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      res.status(400).json({ error: 'contactIds array is required' });
      return;
    }

    const suggestions = await askZenaService.suggestBatchTags(contactIds);
    res.status(200).json(suggestions);
  } catch (error) {
    console.error('Error in suggestBatchTags:', error);
    res.status(500).json({ error: 'Failed to generate tag suggestions' });
  }
}

/**
 * POST /api/ask/predict-contact-type
 * Predict contact type/role based on email domain and name patterns
 */
export async function predictContactType(req: Request, res: Response): Promise<void> {
  try {
    const { email, name } = req.body;

    if (!email && !name) {
      res.status(400).json({ error: 'email or name is required' });
      return;
    }

    const prediction = await askZenaService.predictContactType(email, name);
    res.status(200).json(prediction);
  } catch (error) {
    console.error('Error in predictContactType:', error);
    res.status(500).json({ error: 'Failed to predict contact type' });
  }
}

/**
 * POST /api/ask/relationships
 * Get discovered links between contacts
 */
export async function getRelationships(req: Request, res: Response): Promise<void> {
  try {
    const contactIds = req.body.ids;
    if (!Array.isArray(contactIds)) {
      res.status(400).json({ error: 'Contact IDs must be an array' });
      return;
    }

    const results = await relationshipService.batchDiscoverLinks(contactIds);
    res.status(200).json(results);
  } catch (error) {
    console.error('Error in getRelationships:', error);
    res.status(500).json({ error: 'Failed to discover relationships' });
  }
}

/**
 * POST /api/ask/parse-property
 * Parse raw text into property details
 */
export async function parsePropertyDetails(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { text } = req.body;
    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    console.log(`[Ask Zena] Parsing property details from text length ${text.length}`);
    const result = await askZenaService.parsePropertyDetails(userId, text);
    res.status(200).json(result);

  } catch (error) {
    console.error('Error in parsePropertyDetails:', error);
    res.status(500).json({ error: 'Failed' });
  }
}

/**
 * POST /api/ask/schedule-suggestions
 * Generate AI-suggested open home times based on buyer activity
 */
export async function getScheduleSuggestions(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { propertyId, address, type, daysOnMarket, buyerInterest } = req.body;

    console.log(`[Ask Zena] Generating schedule suggestions for property ${propertyId}`);

    // Calculate upcoming dates for suggestions
    const now = new Date();
    const getNextDayOfWeek = (dayIndex: number): Date => {
      const result = new Date(now);
      const currentDay = now.getDay();
      let daysToAdd = dayIndex - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      result.setDate(now.getDate() + daysToAdd);
      return result;
    };

    const formatDate = (date: Date): string => {
      const day = date.getDate();
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `${dayNames[date.getDay()]} ${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const nextSaturday = formatDate(getNextDayOfWeek(6)); // Saturday
    const nextThursday = formatDate(getNextDayOfWeek(4)); // Thursday
    const nextSunday = formatDate(getNextDayOfWeek(0)); // Sunday

    // Use LLM to generate suggestions based on property context - NZ market focus
    const prompt = `You are Zena, an AI real estate assistant for the New Zealand market. Suggest 3 optimal open home times for this property with compelling marketing-style descriptions.

PROPERTY:
- Address: ${address}
- Type: ${type || 'residential'}
- Days on Market: ${daysOnMarket}
- Buyer Interest Level: ${buyerInterest}

AVAILABLE DATES:
- Next Saturday: ${nextSaturday}
- Next Thursday: ${nextThursday}
- Next Sunday: ${nextSunday}

NEW ZEALAND MARKET INSIGHTS:
- Saturday 10:00-11:00 AM is the 'Alpha Slot' - captures high-intent families at the start of their weekend property run
- Thursday 5:15-5:45 PM is the 'Professional Pivot' - targets 30-39 professional cohort commuting home from CBD
- Saturday 1:00-1:30 PM is the 'FOMO Accelerator' - creates a second Saturday slot for afternoon crowd and competitive atmosphere
- Sunday 11:00-11:30 AM catches the brunch crowd and relaxed browsers

IMPORTANT: Include the FULL DATE (day, date, month, year) in each suggestion.

Return a JSON array of 3 suggestions with full dates, e.g.:
["${nextSaturday} 10:00 AM - 10:30 AM (The 'Alpha' Slot: Captures high-intent families at the start of their weekend run.)", "${nextThursday} 5:15 PM - 5:45 PM (The 'Professional Pivot': Strategically timed for professionals commuting from the CBD.)", "${nextSaturday} 1:00 PM - 1:30 PM (The 'FOMO Accelerator': A second Saturday window to create competitive bidding.)"]`;

    try {
      const response = await askZenaService.askBrain(prompt, { jsonMode: true });
      const parsed = JSON.parse(response);
      res.status(200).json({ suggestions: Array.isArray(parsed) ? parsed : parsed.suggestions || [] });
    } catch {
      // NZ-relevant fallback suggestions with actual dates
      res.status(200).json({
        suggestions: [
          `${nextSaturday} 10:00 AM - 10:30 AM (The 'Alpha' Slot: Captures high-intent families and serious buyers at the start of their weekend run while they're still fresh and decisive.)`,
          `${nextThursday} 5:15 PM - 5:45 PM (The 'Professional Pivot': Strategically timed for the 30-39 professional cohort to stop in on their commute home from the CBD.)`,
          `${nextSaturday} 1:00 PM - 1:30 PM (The 'FOMO Accelerator': A second Saturday window to funnel the afternoon crowd and create a high-density 'crowd effect' that triggers competitive bidding.)`
        ]
      });
    }
  } catch (error) {
    console.error('Error in getScheduleSuggestions:', error);
    res.status(500).json({ error: 'Failed to generate schedule suggestions' });
  }
}

/**
 * POST /api/ask/milestone-suggestions
 * Generate AI-suggested milestones based on property status
 */
export async function getMilestoneSuggestions(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { propertyId, status, daysOnMarket, existingMilestones } = req.body;

    console.log(`[Ask Zena] Generating milestone suggestions for property ${propertyId}`);

    const prompt = `You are Zena, an AI real estate assistant. Suggest 3 appropriate next milestones for this property campaign.

PROPERTY STATUS: ${status || 'active'}
DAYS ON MARKET: ${daysOnMarket}
EXISTING MILESTONES: ${existingMilestones?.join(', ') || 'None yet'}

Based on the property's stage:
- Active listings: Open homes, marketing reviews, price discussions
- Under contract: Finance approval, building inspection, LIM report, settlement prep
- Sold: Settlement, key handover, referral request

Return a JSON array of 3 short milestone suggestions, e.g.:
["First Open Home", "Monthly Vendor Review", "Marketing Performance Check"]`;

    try {
      const response = await askZenaService.askBrain(prompt, { jsonMode: true });
      const parsed = JSON.parse(response);
      res.status(200).json({ suggestions: Array.isArray(parsed) ? parsed : parsed.suggestions || [] });
    } catch {
      // Fallback based on status
      const fallback = status === 'active'
        ? ['First Open Home', 'Marketing Review', 'Price Strategy Meeting']
        : status === 'under_contract'
          ? ['Finance Approval', 'LIM Report', 'Pre-Settlement Inspection']
          : ['Settlement Complete', 'Key Handover', 'Request Referral'];
      res.status(200).json({ suggestions: fallback });
    }
  } catch (error) {
    console.error('Error in getMilestoneSuggestions:', error);
    res.status(500).json({ error: 'Failed to generate milestone suggestions' });
  }
}

/**
 * POST /api/ask/timeline-summary
 * Generate AI summary of property timeline activity
 */
export async function getTimelineSummary(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { propertyId, events } = req.body;

    console.log(`[Ask Zena] Generating timeline summary for property ${propertyId}`);

    if (!events || events.length === 0) {
      res.status(200).json({ summary: 'No activity recorded yet for this property.' });
      return;
    }

    const eventList = events.slice(0, 10).map((e: any) => `[${e.type}] ${e.summary}`).join('\n');

    const prompt = `You are Zena, an AI real estate assistant. Summarize this property's recent activity in 1-2 sentences.

RECENT EVENTS:
${eventList}

Focus on:
- Key milestones or interactions
- Communication patterns
- Any concerns or highlights

Keep it concise, professional, and actionable.`;

    try {
      const summary = await askZenaService.askBrain(prompt);
      res.status(200).json({ summary: summary.trim() });
    } catch {
      const count = events.length;
      res.status(200).json({ summary: `${count} activities recorded. Most recent: ${events[0]?.summary || 'Unknown'}.` });
    }
  } catch (error) {
    console.error('Error in getTimelineSummary:', error);
    res.status(500).json({ error: 'Failed to generate timeline summary' });
  }
}
/**
 * POST /api/ask/generate-pdf
 * Generate PDF from report content
 */
export async function generateReportPdf(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { content, title = 'Market Report' } = req.body;

    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    console.log(`[Ask Zena] Generating PDF report for user ${userId}, title: "${title}"`);

    const pdfBuffer = await askZenaService.generatePdf(content, title);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error in generateReportPdf:', error);
    res.status(500).json({
      error: 'Failed to generate PDF',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
