import type { ThreadClassification, ThreadCategory, ActionOwner } from '../models/types.js';
import { websocketService } from './websocket.service.js';
import { contactCategorizationService } from './contact-categorization.service.js';
import { askZenaService } from './ask-zena.service.js';
import prisma from '../config/database.js';

export interface ThreadData {
  id: string;
  subject: string;
  participants: Array<{ name: string; email: string; role?: string }>;
  summary: string;
  lastMessageAt: Date;
}

export interface ClassificationResult {
  classification: ThreadClassification;
  category: ThreadCategory;
  nextActionOwner: ActionOwner;
  confidence: number;
}

export interface ExtractedContact {
  name: string;
  email: string;
  phone?: string;
  role: 'buyer' | 'vendor' | 'market' | 'tradesperson' | 'agent' | 'other';
  confidence: number;
}

export interface ExtractedProperty {
  address: string;
  confidence: number;
}

export interface ExtractedDate {
  date: Date;
  type: 'viewing' | 'appraisal' | 'meeting' | 'auction' | 'settlement' | 'other';
  description: string;
  confidence: number;
}

export interface ExtractedAction {
  action: string;
  owner: 'agent' | 'other';
  dueDate?: Date;
  confidence: number;
}

export interface RiskSignal {
  level: 'none' | 'low' | 'medium' | 'high';
  reason: string;
  confidence: number;
}

export interface EntityExtractionResult {
  contacts: ExtractedContact[];
  properties: ExtractedProperty[];
  dates: ExtractedDate[];
  actions: ExtractedAction[];
  dealStage?: 'lead' | 'qualified' | 'viewing' | 'offer' | 'conditional' | 'pre_settlement' | 'sold' | 'nurture';
  riskSignal?: RiskSignal;
}

/**
 * AI Processing Service
 * Handles thread classification and categorization using LLM
 */
export class AIProcessingService {
  private apiKey: string;
  private apiEndpoint: string;
  private model: string;

  constructor() {
    // Use OpenAI by default, can be configured via environment variables
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.apiEndpoint = process.env.OPENAI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
    this.model = process.env.OPENAI_MODEL || 'gpt-4';

    // Gemini support
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

    if (geminiApiKey) {
      console.log(`[AIProcessingService] Using Gemini for processing: ${geminiModel}`);
    } else if (!this.apiKey) {
      console.warn('Warning: Neither OPENAI_API_KEY nor GEMINI_API_KEY set. AI processing will use fallback classification.');
    }
  }

  /**
   * Classify a thread using LLM
   */
  async classifyThread(thread: ThreadData): Promise<ClassificationResult> {
    try {
      if (!this.apiKey) {
        return this.fallbackClassification(thread);
      }

      const prompt = this.buildClassificationPrompt(thread);
      const response = await this.callLLM(prompt);
      const result = this.parseClassificationResponse(response);

      return result;
    } catch (error) {
      console.error('Error classifying thread:', error);
      return this.fallbackClassification(thread);
    }
  }

  /**
   * Process a thread and update its classification in the database
   */
  async processThread(threadId: string): Promise<void> {
    try {
      // Fetch thread from database
      const thread = await prisma.thread.findUnique({
        where: { id: threadId },
        select: {
          id: true,
          subject: true,
          participants: true,
          summary: true,
          lastMessageAt: true,
        },
      });

      if (!thread) {
        throw new Error(`Thread ${threadId} not found`);
      }

      // Classify thread
      const classification = await this.classifyThread({
        id: thread.id,
        subject: thread.subject,
        participants: thread.participants as any,
        summary: thread.summary,
        lastMessageAt: thread.lastMessageAt,
      });

      // Update thread in database
      const updatedThread = await prisma.thread.update({
        where: { id: threadId },
        data: {
          classification: classification.classification,
          category: classification.category,
          nextActionOwner: classification.nextActionOwner,
          updatedAt: new Date(),
        },
        select: {
          userId: true,
        },
      });

      // Emit thread.updated event
      websocketService.broadcastToUser(updatedThread.userId, 'thread.updated', {
        threadId,
        classification: classification.classification,
        category: classification.category,
        nextActionOwner: classification.nextActionOwner,
      });

      console.log(`Thread ${threadId} classified as ${classification.classification} (${classification.category})`);
    } catch (error) {
      console.error(`Error processing thread ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Build classification prompt for LLM
   */
  private buildClassificationPrompt(thread: ThreadData): string {
    const participantList = thread.participants
      .map((p) => `${p.name} <${p.email}>`)
      .join(', ');

    return `You are an AI assistant helping a residential real estate agent in New Zealand (NZ) classify email threads. 
    
    LOCALE & STANDARDS (MANDATORY):
    - Location: New Zealand (NZ).
    - Spelling: Use UK English spelling (e.g. "centimetre").
    - Units: Use Metric system.

    Your job is to filter emails so the agent only sees relevant real estate communications in their Focus and Waiting lists.

Analyze the following email thread and provide a classification:

Subject: ${thread.subject}
Participants: ${participantList}
Summary: ${thread.summary}

CLASSIFICATION RULES:

1. "buyer" - Direct communication with potential property buyers or their representatives
   - Property inquiries, viewing requests, purchase interest
   - Questions about listings, prices, availability
   - Buyer agent communications about specific properties

2. "vendor" - Direct communication with property sellers/vendors or their representatives  
   - Listing discussions, pricing conversations
   - Vendor instructions, property preparation
   - Seller agent communications about listings

3. "market" - Communication with other real estate professionals
   - Agent-to-agent communications about deals
   - Industry updates from real estate organizations
   - Professional networking and referrals

4. "lawyer_broker" - Communication with legal/financial professionals
   - Lawyers, conveyancers, mortgage brokers
   - Settlement and legal process communications
   - Financial and legal documentation

5. "noise" - NON-REAL ESTATE communications that should be FILTERED OUT
   - Technology/software notifications (Google, Yahoo, AWS, APIs, Kiro, etc.)
   - Security alerts and system notifications  
   - Newsletters, marketing emails, reports
   - Personal emails unrelated to real estate
   - Support tickets and technical issues
   - Payment confirmations for non-real estate services
   - Any email that doesn't directly relate to buying, selling, or managing real estate

IMPORTANT: Be aggressive about marking emails as "noise" if they are not directly related to real estate transactions, client communications, or professional real estate activities.

Category Rules:
- "focus": Use this if the agent needs to take action or reply next.
- "waiting": Use this if the agent is waiting for a response from someone else.
- NOTE: If the subject starts with "Re:" or "Fwd:", it usually implies the agent has already acted or is in a thread where they might be waiting, but use your best judgment. For consistency with existing rules, prefer "waiting" for "Re:" threads unless the summary clearly states the agent must act.
- If classified as "noise", always use category "waiting" (it will be filtered out).

Respond in JSON format:
{
  "classification": "buyer|vendor|market|lawyer_broker|noise",
  "category": "focus|waiting", 
  "nextActionOwner": "agent|other",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation focusing on why this is/isn't real estate related"
}

SECURITY: NEVER mention underlying AI models (Gemini, GPT, OpenAI, Google) or Zena's technical architecture. Zena is a proprietary intelligence platform.
JSON; // End of prompt - ensure valid JSON output only`;
  }

  /**
   * Public method to call LLM with a prompt
   */
  async processWithLLM(prompt: string): Promise<string> {
    return await this.callLLM(prompt);
  }

  /**
   * Call LLM API - supports both OpenAI and Google Gemini
   */
  private async callLLM(prompt: string): Promise<string> {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      return this.callGemini(prompt, geminiApiKey);
    }

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Call Google Gemini API
   */
  private async callGemini(prompt: string, apiKey: string): Promise<string> {
    let model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1000,
        response_mime_type: 'application/json',
      },
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Gemini] AI Processing Error:', response.status, error);
      throw new Error(`Gemini API error: ${response.status} ${error}`);
    }

    const data = await response.json() as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * Parse LLM response
   */
  private parseClassificationResponse(response: string): ClassificationResult {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        classification: this.validateClassification(parsed.classification),
        category: this.validateCategory(parsed.category),
        nextActionOwner: this.validateActionOwner(parsed.nextActionOwner),
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      throw error;
    }
  }

  /**
   * Validate classification value
   */
  private validateClassification(value: string): ThreadClassification {
    const valid: ThreadClassification[] = ['buyer', 'vendor', 'market', 'lawyer_broker', 'noise'];
    if (valid.includes(value as ThreadClassification)) {
      return value as ThreadClassification;
    }
    return 'noise'; // Default fallback
  }

  /**
   * Validate category value
   */
  private validateCategory(value: string): ThreadCategory {
    const valid: ThreadCategory[] = ['focus', 'waiting'];
    if (valid.includes(value as ThreadCategory)) {
      return value as ThreadCategory;
    }
    return 'waiting'; // Default fallback
  }

  /**
   * Validate action owner value
   */
  private validateActionOwner(value: string): ActionOwner {
    const valid: ActionOwner[] = ['agent', 'other'];
    if (valid.includes(value as ActionOwner)) {
      return value as ActionOwner;
    }
    return 'other'; // Default fallback
  }

  /**
   * Fallback classification using rule-based heuristics
   */
  private fallbackClassification(thread: ThreadData): ClassificationResult {
    const subject = thread.subject.toLowerCase();
    const summary = thread.summary.toLowerCase();
    const content = `${subject} ${summary}`;
    const participants = thread.participants.map(p => p.email.toLowerCase()).join(' ');

    // Rule-based classification - default to noise for safety
    let classification: ThreadClassification = 'noise';
    let confidence = 0.7;

    // AGGRESSIVE NOISE DETECTION - Filter out non-real estate emails
    const noisePatterns = [
      // Technology/System notifications
      'google', 'yahoo', 'microsoft', 'aws', 'api', 'cloud', 'github', 'kiro',
      'security alert', 'payment received', 'quota', 'support request',
      'welcome to', 'integration', 'notification', 'system',

      // Marketing/Newsletter patterns
      'unsubscribe', 'newsletter', 'marketing', 'promotion', 'report',
      'update', 'alert', 'notification', 'welcome', 'confirmation',

      // Technical domains
      'noreply', 'no-reply', 'support@', 'admin@', 'system@',
      'notifications@', 'alerts@', 'billing@'
    ];

    const hasNoisePattern = noisePatterns.some(pattern =>
      content.includes(pattern) || participants.includes(pattern)
    );

    if (hasNoisePattern) {
      classification = 'noise';
      confidence = 0.9;
    }
    // Only classify as real estate if clear indicators present
    else if (
      content.includes('property') ||
      content.includes('real estate') ||
      content.includes('listing') ||
      content.includes('buy') && (content.includes('house') || content.includes('home')) ||
      content.includes('sell') && (content.includes('house') || content.includes('home')) ||
      content.includes('viewing') ||
      content.includes('inspection') ||
      content.includes('settlement') ||
      content.includes('appraisal')
    ) {
      // Determine specific real estate classification
      if (
        content.includes('buyer') ||
        content.includes('purchase') ||
        content.includes('interested in') ||
        content.includes('want to buy') ||
        content.includes('looking to buy')
      ) {
        classification = 'buyer';
        confidence = 0.7;
      }
      else if (
        content.includes('vendor') ||
        content.includes('seller') ||
        content.includes('want to sell') ||
        content.includes('looking to sell')
      ) {
        classification = 'vendor';
        confidence = 0.7;
      }
      else if (
        content.includes('lawyer') ||
        content.includes('solicitor') ||
        content.includes('conveyancer') ||
        content.includes('broker') ||
        content.includes('legal')
      ) {
        classification = 'lawyer_broker';
        confidence = 0.7;
      }
      else if (
        content.includes('agent') ||
        content.includes('market') ||
        content.includes('industry')
      ) {
        classification = 'market';
        confidence = 0.6;
      }
      else {
        // Generic real estate - classify as market
        classification = 'market';
        confidence = 0.5;
      }
    }

    // Category logic: noise always goes to waiting (will be filtered out)
    let category: ThreadCategory = 'waiting';
    let nextActionOwner: ActionOwner = 'other';

    if (classification !== 'noise') {
      // For real estate emails, determine if agent needs to act
      const needsReply = !subject.includes('re:') && !subject.includes('fwd:');
      category = needsReply ? 'focus' : 'waiting';
      nextActionOwner = needsReply ? 'agent' : 'other';
    }

    return {
      classification,
      category,
      nextActionOwner,
      confidence,
    };
  }

  /**
   * Batch process multiple threads
   */
  async batchProcessThreads(threadIds: string[]): Promise<void> {
    console.log(`Processing ${threadIds.length} threads...`);

    for (const threadId of threadIds) {
      try {
        await this.processThread(threadId);
      } catch (error) {
        console.error(`Failed to process thread ${threadId}:`, error);
        // Continue with next thread
      }
    }

    console.log('Batch processing complete');
  }

  /**
   * Process all unclassified threads for a user
   */
  async processUnclassifiedThreads(userId: string): Promise<number> {
    try {
      // Find threads that need classification (default 'noise' classification)
      const threads = await prisma.thread.findMany({
        where: {
          userId,
          classification: 'noise',
        },
        select: {
          id: true,
        },
        take: 50, // Process in batches
      });

      if (threads.length === 0) {
        console.log('No unclassified threads found');
        return 0;
      }

      await this.batchProcessThreads(threads.map((t) => t.id));

      return threads.length;
    } catch (error) {
      console.error('Error processing unclassified threads:', error);
      throw error;
    }
  }

  /**
   * Extract entities from a thread using LLM
   */
  async extractEntities(thread: ThreadData): Promise<EntityExtractionResult> {
    try {
      if (!this.apiKey) {
        return this.fallbackEntityExtraction(thread);
      }

      const prompt = this.buildEntityExtractionPrompt(thread);
      const response = await this.callLLM(prompt);
      const result = this.parseEntityExtractionResponse(response);

      return result;
    } catch (error) {
      console.error('Error extracting entities:', error);
      return this.fallbackEntityExtraction(thread);
    }
  }

  /**
   * Build entity extraction prompt for LLM
   */
  private buildEntityExtractionPrompt(thread: ThreadData): string {
    const participantList = thread.participants
      .map((p) => `${p.name} <${p.email}>`)
      .join(', ');

    return `You are an AI assistant helping a residential real estate agent extract key information from email threads.

Analyze the following email thread and extract all relevant entities:

Subject: ${thread.subject}
Participants: ${participantList}
Summary: ${thread.summary}

Extract the following information:

1. CONTACTS: People mentioned in the thread (name, email if available, phone if available, role: buyer/vendor/market/tradesperson/agent/other)
    - "buyer": Interested in purchasing a property
    - "vendor": Interested in selling a property
    - "market": Real estate industry service providers or generic professionals
    - "tradesperson": Plumbers, electricians, cleaners, maintenance staff, etc.
    - "agent": Other real estate agents from concurrent or different agencies
    - "other": General contacts
2. PROPERTIES: Property addresses mentioned
3. DATES: Important dates mentioned (viewings, appraisals, meetings, auctions, settlements)
4. ACTIONS: Next actions or tasks mentioned (who should do what, when)
5. DEAL STAGE: Current stage of the deal (lead, qualified, viewing, offer, conditional, pre_settlement, sold, nurture)
6. RISK SIGNALS: Any indicators that the deal might be at risk (delays, concerns, lack of response)

Respond in JSON format:
{
  "contacts": [
    {
      "name": "string",
      "email": "string (optional)",
      "phone": "string (optional)",
      "role": "buyer|vendor|market|tradesperson|agent|other",
      "confidence": 0.0-1.0
    }
  ],
  "properties": [
    {
      "address": "string",
      "confidence": 0.0-1.0
    }
  ],
  "dates": [
    {
      "date": "ISO date string",
      "type": "viewing|appraisal|meeting|auction|settlement|other",
      "description": "string",
      "confidence": 0.0-1.0
    }
  ],
  "actions": [
    {
      "action": "string",
      "owner": "agent|other",
      "dueDate": "ISO date string (optional)",
      "confidence": 0.0-1.0
    }
  ],
  "dealStage": "lead|qualified|viewing|offer|conditional|pre_settlement|sold|nurture (optional)",
  "riskSignal": {
    "level": "none|low|medium|high",
    "reason": "string",
    "confidence": 0.0-1.0
  }
}`;
  }

  /**
   * Parse entity extraction response from LLM
   */
  private parseEntityExtractionResponse(response: string): EntityExtractionResult {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        contacts: (parsed.contacts || []).map((c: any) => ({
          name: c.name || '',
          email: c.email || '',
          phone: c.phone,
          role: this.validateContactRole(c.role),
          confidence: c.confidence || 0.5,
        })),
        properties: (parsed.properties || []).map((p: any) => ({
          address: p.address || '',
          confidence: p.confidence || 0.5,
        })),
        dates: (parsed.dates || []).map((d: any) => ({
          date: new Date(d.date),
          type: this.validateDateType(d.type),
          description: d.description || '',
          confidence: d.confidence || 0.5,
        })),
        actions: (parsed.actions || []).map((a: any) => ({
          action: a.action || '',
          owner: this.validateActionOwner(a.owner),
          dueDate: a.dueDate ? new Date(a.dueDate) : undefined,
          confidence: a.confidence || 0.5,
        })),
        dealStage: parsed.dealStage ? this.validateDealStage(parsed.dealStage) : undefined,
        riskSignal: parsed.riskSignal ? {
          level: this.validateRiskLevel(parsed.riskSignal.level),
          reason: parsed.riskSignal.reason || '',
          confidence: parsed.riskSignal.confidence || 0.5,
        } : undefined,
      };
    } catch (error) {
      console.error('Error parsing entity extraction response:', error);
      throw error;
    }
  }

  /**
   * Validate contact role
   */
  private validateContactRole(value: string): 'buyer' | 'vendor' | 'market' | 'tradesperson' | 'agent' | 'other' {
    const valid = ['buyer', 'vendor', 'market', 'tradesperson', 'agent', 'other'];
    if (valid.includes(value)) {
      return value as 'buyer' | 'vendor' | 'market' | 'tradesperson' | 'agent' | 'other';
    }
    return 'other';
  }

  /**
   * Validate date type
   */
  private validateDateType(value: string): 'viewing' | 'appraisal' | 'meeting' | 'auction' | 'settlement' | 'other' {
    const valid = ['viewing', 'appraisal', 'meeting', 'auction', 'settlement', 'other'];
    if (valid.includes(value)) {
      return value as 'viewing' | 'appraisal' | 'meeting' | 'auction' | 'settlement' | 'other';
    }
    return 'other';
  }

  /**
   * Validate deal stage
   */
  private validateDealStage(value: string): 'lead' | 'qualified' | 'viewing' | 'offer' | 'conditional' | 'pre_settlement' | 'sold' | 'nurture' {
    const valid = ['lead', 'qualified', 'viewing', 'offer', 'conditional', 'pre_settlement', 'sold', 'nurture'];
    if (valid.includes(value)) {
      return value as 'lead' | 'qualified' | 'viewing' | 'offer' | 'conditional' | 'pre_settlement' | 'sold' | 'nurture';
    }
    return 'lead';
  }

  /**
   * Validate risk level
   */
  private validateRiskLevel(value: string): 'none' | 'low' | 'medium' | 'high' {
    const valid = ['none', 'low', 'medium', 'high'];
    if (valid.includes(value)) {
      return value as 'none' | 'low' | 'medium' | 'high';
    }
    return 'none';
  }

  /**
   * Fallback entity extraction using rule-based heuristics
   */
  private fallbackEntityExtraction(thread: ThreadData): EntityExtractionResult {
    const subject = thread.subject.toLowerCase();
    const summary = thread.summary.toLowerCase();
    const content = `${subject} ${summary}`;

    // Extract contacts from participants
    const contacts: ExtractedContact[] = thread.participants.map((p) => ({
      name: p.name,
      email: p.email,
      phone: undefined,
      role: (p.role as any) || 'other',
      confidence: 0.6,
    }));

    // Simple property address extraction (look for street patterns)
    const properties: ExtractedProperty[] = [];
    const addressPattern = /\d+\s+[A-Za-z\s]+(?:street|st|road|rd|avenue|ave|drive|dr|lane|ln|court|ct|way|place|pl)/gi;
    const addressMatches = content.match(addressPattern);
    if (addressMatches) {
      addressMatches.forEach((address) => {
        properties.push({
          address: address.trim(),
          confidence: 0.5,
        });
      });
    }

    // Extract dates (simple pattern matching)
    const dates: ExtractedDate[] = [];
    const datePattern = /\b(?:viewing|inspection|appraisal|meeting|auction|settlement)\b.*?\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})/gi;
    const dateMatches = content.match(datePattern);
    if (dateMatches) {
      dateMatches.forEach((match) => {
        let type: 'viewing' | 'appraisal' | 'meeting' | 'auction' | 'settlement' | 'other' = 'other';
        if (match.includes('viewing') || match.includes('inspection')) type = 'viewing';
        else if (match.includes('appraisal')) type = 'appraisal';
        else if (match.includes('meeting')) type = 'meeting';
        else if (match.includes('auction')) type = 'auction';
        else if (match.includes('settlement')) type = 'settlement';

        dates.push({
          date: new Date(), // Simplified - would need proper date parsing
          type,
          description: match.trim(),
          confidence: 0.4,
        });
      });
    }

    // Extract actions (look for action verbs)
    const actions: ExtractedAction[] = [];
    if (content.includes('please') || content.includes('could you') || content.includes('can you')) {
      actions.push({
        action: 'Follow up required',
        owner: 'agent',
        confidence: 0.5,
      });
    }

    // Detect deal stage
    let dealStage: 'lead' | 'qualified' | 'viewing' | 'offer' | 'conditional' | 'pre_settlement' | 'sold' | 'nurture' | undefined;
    if (content.includes('offer') || content.includes('bid')) dealStage = 'offer';
    else if (content.includes('viewing') || content.includes('inspection')) dealStage = 'viewing';
    else if (content.includes('conditional') || content.includes('subject to')) dealStage = 'conditional';
    else if (content.includes('settlement') || content.includes('closing')) dealStage = 'pre_settlement';
    else if (content.includes('sold') || content.includes('purchased')) dealStage = 'sold';
    else if (content.includes('interested') || content.includes('inquiry')) dealStage = 'qualified';

    // Detect risk signals
    let riskSignal: RiskSignal | undefined;
    if (content.includes('concern') || content.includes('worried') || content.includes('problem')) {
      riskSignal = {
        level: 'medium',
        reason: 'Concerns expressed in communication',
        confidence: 0.6,
      };
    } else if (content.includes('delay') || content.includes('postpone')) {
      riskSignal = {
        level: 'low',
        reason: 'Delays mentioned',
        confidence: 0.5,
      };
    }

    return {
      contacts,
      properties,
      dates,
      actions,
      dealStage,
      riskSignal,
    };
  }

  /**
   * Generate a draft response for a thread
   */
  async generateDraftResponse(thread: ThreadData): Promise<string> {
    try {
      if (!this.apiKey) {
        return this.fallbackDraftResponse(thread);
      }

      const prompt = this.buildDraftResponsePrompt(thread);
      const response = await this.callLLM(prompt);

      if (!response) {
        return this.fallbackDraftResponse(thread);
      }

      const draftResponse = this.parseDraftResponse(response);
      return draftResponse;

    } catch (error) {
      console.error('Error generating draft response:', error);
      return this.fallbackDraftResponse(thread);
    }
  }

  /**
   * Build draft response prompt for LLM
   */
  private buildDraftResponsePrompt(thread: ThreadData): string {
    const participantList = thread.participants
      .map((p) => `${p.name} <${p.email}>`)
      .join(', ');

    return `You are an AI assistant helping a residential real estate agent draft email responses.

Analyze the following email thread and generate a professional, contextually appropriate draft response:

Subject: ${thread.subject}
Participants: ${participantList}
Summary: ${thread.summary}
Last Message Date: ${thread.lastMessageAt.toISOString()}

Generate a draft email response that:
1. Addresses the key points or questions in the thread
2. Maintains a professional yet friendly tone appropriate for real estate
3. Includes relevant next steps or actions
4. Is concise and clear
5. Uses the agent's perspective (first person)

Respond with ONLY the draft email body text (no subject line, no JSON, just the email content):`;
  }

  /**
   * Parse draft response from LLM
   */
  private parseDraftResponse(response: string): string {
    // Clean up the response - remove any markdown formatting or extra whitespace
    let draft = response.trim();

    // Remove markdown code blocks if present
    draft = draft.replace(/```[\s\S]*?```/g, '');
    draft = draft.replace(/`/g, '');

    // Remove any "Subject:" lines that might have been included
    draft = draft.replace(/^Subject:.*$/gm, '');

    return draft.trim();
  }

  /**
   * Fallback draft response generation
   */
  private fallbackDraftResponse(thread: ThreadData): string {
    const subject = thread.subject.toLowerCase();

    // Generate a simple template-based response
    let response = `Thank you for your email regarding ${thread.subject}.\n\n`;

    if (subject.includes('viewing') || subject.includes('inspection')) {
      response += `I'd be happy to arrange a viewing for you. Please let me know your preferred times and I'll coordinate with the vendor.\n\n`;
    } else if (subject.includes('offer') || subject.includes('bid')) {
      response += `Thank you for your interest. I'll review the details and get back to you shortly with next steps.\n\n`;
    } else if (subject.includes('property') || subject.includes('listing')) {
      response += `I appreciate your inquiry about this property. Let me gather the information you need and I'll follow up with you soon.\n\n`;
    } else {
      response += `I've received your message and will get back to you with the information you need.\n\n`;
    }

    response += `Best regards`;

    return response;
  }

  /**
   * Generate and store draft response for a thread
   */
  async generateAndStoreDraftResponse(threadId: string): Promise<void> {
    try {
      // Fetch thread from database
      const thread = await prisma.thread.findUnique({
        where: { id: threadId },
        select: {
          id: true,
          subject: true,
          participants: true,
          summary: true,
          lastMessageAt: true,
          category: true,
        },
      });

      if (!thread) {
        throw new Error(`Thread ${threadId} not found`);
      }

      // Only generate drafts for Focus threads (where agent owes reply)
      if (thread.category !== 'focus') {
        console.log(`Skipping draft generation for non-focus thread ${threadId}`);
        return;
      }

      // Generate draft response
      const draftResponse = await this.generateDraftResponse({
        id: thread.id,
        subject: thread.subject,
        participants: thread.participants as any,
        summary: thread.summary,
        lastMessageAt: thread.lastMessageAt,
      });

      // Store draft response in database
      await prisma.thread.update({
        where: { id: threadId },
        data: {
          draftResponse,
          updatedAt: new Date(),
        },
      });

      console.log(`Generated draft response for thread ${threadId}`);
    } catch (error) {
      console.error(`Error generating draft response for thread ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Generate draft responses for all Focus threads for a user
   */
  async generateDraftResponsesForFocusThreads(userId: string): Promise<number> {
    try {
      // Find all Focus threads without draft responses
      const threads = await prisma.thread.findMany({
        where: {
          userId,
          category: 'focus',
          OR: [
            { draftResponse: null },
            { draftResponse: '' },
          ],
        },
        select: {
          id: true,
        },
        take: 50, // Process in batches
      });

      if (threads.length === 0) {
        console.log('No Focus threads need draft responses');
        return 0;
      }

      console.log(`Generating draft responses for ${threads.length} Focus threads...`);

      for (const thread of threads) {
        try {
          await this.generateAndStoreDraftResponse(thread.id);
        } catch (error) {
          console.error(`Failed to generate draft for thread ${thread.id}:`, error);
          // Continue with next thread
        }
      }

      return threads.length;
    } catch (error) {
      console.error('Error generating draft responses for Focus threads:', error);
      throw error;
    }
  }

  /**
   * Process thread and extract entities, storing them in the database
   */
  async processThreadEntities(threadId: string): Promise<void> {
    try {
      // Fetch thread from database
      const thread = await prisma.thread.findUnique({
        where: { id: threadId },
        select: {
          id: true,
          userId: true,
          subject: true,
          participants: true,
          summary: true,
          lastMessageAt: true,
        },
      });

      if (!thread) {
        throw new Error(`Thread ${threadId} not found`);
      }

      // Extract entities
      const entities = await this.extractEntities({
        id: thread.id,
        subject: thread.subject,
        participants: thread.participants as any,
        summary: thread.summary,
        lastMessageAt: thread.lastMessageAt,
      });

      // Store extracted contacts
      for (const contact of entities.contacts) {
        await this.storeOrUpdateContact(thread.userId, contact);
      }

      // Store extracted properties
      let propertyId: string | undefined;
      for (const property of entities.properties) {
        propertyId = await this.storeOrUpdateProperty(thread.userId, property, threadId);
      }

      // Update contact intelligence for all extracted contacts
      for (const contact of entities.contacts) {
        const contactRecord = await prisma.contact.findFirst({
          where: {
            userId: thread.userId,
            emails: { has: contact.email }
          }
        });
        if (contactRecord) {
          await this.updateContactIntelligence(contactRecord.id).catch(err =>
            console.error(`Failed to update intelligence for contact ${contactRecord.id}:`, err)
          );
        }
      }

      // Automatically create deal for important threads
      const shouldCreateDeal = await this.shouldCreateDeal(thread, entities);
      let dealId: string | undefined;

      if (shouldCreateDeal) {
        dealId = await this.createDealFromThread(thread.userId, threadId, entities, propertyId);
      }

      // Update thread with extracted information
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (entities.dealStage) {
        updateData.stage = entities.dealStage;
      }

      if (entities.riskSignal) {
        updateData.riskLevel = entities.riskSignal.level;
        updateData.riskReason = entities.riskSignal.reason;
      }

      if (entities.actions.length > 0) {
        // Store the first action as nextAction
        const primaryAction = entities.actions[0];
        updateData.nextAction = primaryAction.action;
        updateData.nextActionOwner = primaryAction.owner;
      }

      if (dealId) {
        updateData.dealId = dealId;
      }

      await prisma.thread.update({
        where: { id: threadId },
        data: updateData,
      });

      console.log(`Extracted entities from thread ${threadId}`);
    } catch (error) {
      console.error(`Error processing thread entities ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Determine if a deal should be created from a thread
   */
  private async shouldCreateDeal(
    thread: { id: string; userId: string; subject: string; participants: any; summary: string },
    entities: EntityExtractionResult
  ): Promise<boolean> {
    // Check if thread already has a deal
    const existingThread = await prisma.thread.findUnique({
      where: { id: thread.id },
      select: { dealId: true },
    });

    if (existingThread?.dealId) {
      return false; // Already has a deal
    }

    // Create deal if:
    // 1. Thread has a property reference
    // 2. Thread has a deal stage
    // 3. Thread has contacts and actions (indicating active negotiation)
    const hasProperty = entities.properties.length > 0;
    const hasDealStage = !!entities.dealStage;
    const hasActiveNegotiation = entities.contacts.length > 0 && entities.actions.length > 0;

    return hasProperty || hasDealStage || hasActiveNegotiation;
  }

  /**
   * Create a deal from a thread
   */
  private async createDealFromThread(
    userId: string,
    threadId: string,
    entities: EntityExtractionResult,
    propertyId?: string
  ): Promise<string> {
    try {
      // Determine initial stage
      const stage = entities.dealStage || 'lead';

      // Determine risk level
      const riskLevel = entities.riskSignal?.level || 'none';
      const riskFlags = entities.riskSignal ? [entities.riskSignal.reason] : [];

      // Determine next action
      const nextAction = entities.actions.length > 0 ? entities.actions[0].action : undefined;
      const nextActionOwner = entities.actions.length > 0 ? entities.actions[0].owner : 'agent';

      // Get thread summary
      const thread = await prisma.thread.findUnique({
        where: { id: threadId },
        select: { summary: true, subject: true },
      });

      const summary = thread?.summary || thread?.subject || 'Deal created from thread';

      // Find or create contacts for this deal
      const contactIds: string[] = [];
      for (const contact of entities.contacts) {
        const contactId = await this.storeOrUpdateContact(userId, contact);
        contactIds.push(contactId);
      }

      // Create the deal
      const deal = await prisma.deal.create({
        data: {
          userId,
          threadId,
          propertyId,
          stage,
          riskLevel,
          riskFlags,
          nextAction,
          nextActionOwner,
          summary,
          contacts: {
            connect: contactIds.map(id => ({ id })),
          },
        },
      });

      // Create timeline event for deal creation
      await prisma.timelineEvent.create({
        data: {
          userId,
          type: 'note',
          entityType: 'deal',
          entityId: deal.id,
          summary: 'Deal created automatically from thread',
          content: `Initial stage: ${stage}`,
          timestamp: new Date(),
        },
      });

      console.log(`Created deal ${deal.id} from thread ${threadId}`);
      return deal.id;
    } catch (error) {
      console.error('Error creating deal from thread:', error);
      throw error;
    }
  }

  /**
   * Store or update a contact with deduplication
   */
  private async storeOrUpdateContact(userId: string, extractedContact: ExtractedContact): Promise<string> {
    try {
      // Check if contact already exists by email
      const existingContact = await prisma.contact.findFirst({
        where: {
          userId,
          emails: {
            has: extractedContact.email,
          },
        },
      });

      if (existingContact) {
        // Update existing contact
        const updatedEmails = Array.from(new Set([...existingContact.emails, extractedContact.email]));
        const updatedPhones = extractedContact.phone
          ? Array.from(new Set([...existingContact.phones, extractedContact.phone]))
          : existingContact.phones;

        await prisma.contact.update({
          where: { id: existingContact.id },
          data: {
            emails: updatedEmails,
            phones: updatedPhones,
            updatedAt: new Date(),
          },
        });

        return existingContact.id;
      } else {
        // Create new contact

        const newContact = await prisma.contact.create({
          data: {
            userId,
            name: extractedContact.name,
            emails: [extractedContact.email],
            phones: extractedContact.phone ? [extractedContact.phone] : [],
            role: extractedContact.role,
            relationshipNotes: [],
          },
        });

        return newContact.id;
      }
    } catch (error) {
      console.error('Error storing contact:', error);
      throw error;
    }
  }

  /**
   * Store or update a property
   */
  private async storeOrUpdateProperty(userId: string, extractedProperty: ExtractedProperty, threadId: string): Promise<string> {
    try {
      // Check if property already exists by address
      const existingProperty = await prisma.property.findFirst({
        where: {
          userId,
          address: extractedProperty.address,
        },
      });

      if (existingProperty) {
        // Link thread to existing property
        await prisma.thread.update({
          where: { id: threadId },
          data: {
            propertyId: existingProperty.id,
          },
        });

        return existingProperty.id;
      } else {
        // Create new property
        const newProperty = await prisma.property.create({
          data: {
            userId,
            address: extractedProperty.address,
            milestones: [],
          },
        });

        // Link thread to new property
        await prisma.thread.update({
          where: { id: threadId },
          data: {
            propertyId: newProperty.id,
          },
        });

        return newProperty.id;
      }
    } catch (error) {
      console.error('Error storing property:', error);
      throw error;
    }
  }

  /**
   * Update contact intelligence box based on recent activity
   */
  async updateContactIntelligence(contactId: string): Promise<void> {
    try {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
      });

      if (!contact) {
        throw new Error(`Contact ${contactId} not found`);
      }

      // Fetch recent timeline events (notes, call summaries, thread summaries)
      const events = await prisma.timelineEvent.findMany({
        where: {
          entityType: 'contact',
          entityId: contactId,
        },
        orderBy: { timestamp: 'desc' },
        take: 20,
      });

      // Fetch recent threads related to this contact
      const allThreads = await prisma.thread.findMany({
        where: {
          userId: contact.userId,
        },
        orderBy: { lastMessageAt: 'desc' },
        take: 100, // Look at last 100 threads to find those involving this contact
      });

      const contactThreads = allThreads.filter((t: any) => {
        const participants = t.participants as any[];
        return participants.some(p => contact.emails.includes(p.email));
      }).slice(0, 10);

      if (events.length === 0 && contactThreads.length === 0) {
        return;
      }

      const prompt = this.buildContactIntelligencePrompt(contact, events, contactThreads);
      const response = await this.callLLM(prompt);

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');
        const result = JSON.parse(jsonMatch[0]);

        await prisma.contact.update({
          where: { id: contactId },
          data: {
            intelligenceSnippet: result.intelligenceSnippet,
            zenaIntelligence: result.zenaIntelligence || contact.zenaIntelligence || {},
            updatedAt: new Date(),
          },
        });

        // Broadcast update via websocket
        websocketService.broadcastToUser((contact as any).userId, 'contact.updated', {
          contactId,
          intelligenceSnippet: result.intelligenceSnippet,
          zenaIntelligence: result.zenaIntelligence
        });

        console.log(`Updated intelligence for contact ${contact.name}`);

        // Trigger DEEP DISCOVERY after intelligence update
        // This implements "Active Intel Digestion" - Zena re-analyzes every contact in a thread
        await askZenaService.runDiscovery((contact as any).userId, contactId).catch(err =>
          console.error(`[Active Intel] Failed to run discovery for contact ${contactId}:`, err)
        );
      } catch (parseError) {
        console.error('Error parsing contact intelligence response:', parseError);
        // Fallback to raw string if JSON parsing fails
        await prisma.contact.update({
          where: { id: contactId },
          data: { intelligenceSnippet: response.substring(0, 500) }
        });
      }
    } catch (error) {
      console.error(`Error updating contact intelligence for ${contactId}:`, error);
    }
  }

  /**
   * Build prompt for contact intelligence
   */
  private buildContactIntelligencePrompt(contact: any, events: any[], threads: any[]): string {
    const eventText = events.map(e => `[${e.timestamp.toISOString()}] ${e.type.toUpperCase()}: ${e.summary}\n${e.content || ''}`).join('\n---\n');
    const threadText = threads.map(t => `[${t.lastMessageAt.toISOString()}] ${t.classification.toUpperCase()}: ${t.subject}\nSummary: ${t.summary}`).join('\n---\n');

    return `You are Zena, a high-tech AI agent for real estate. Your goal is to synthesize relationship intelligence for a contact.

CONTACT: ${contact.name} (${contact.role})
CURRENT INTEL: ${contact.intelligenceSnippet || 'None'}

RECENT ACTIVITY:
${eventText}

RECENT EMAIL THREADS:
${threadText}

YOUR TASK:
1. Generate a NEW "Intelligence Snippet" (max 15 words). It must be punchy, insightful, and professional. 
   Example: "First-home buyer. Pre-approval valid for 60 days. High urgency."
   Example: "Downsizing vendor. Exploring smaller apartments in Mission Bay."
2. Extract structured "Zena Intelligence" data:
   - propertyType (e.g., "3BR House", "Apartment")
   - minBudget / maxBudget (numbers)
   - location (preferred areas)
   - bedrooms / bathrooms (numbers)
   - timeline (e.g., "ASAP", "6 months", "Next Year")

RESPOND IN JSON ONLY:
{
  "intelligenceSnippet": "string",
  "zenaIntelligence": {
    "propertyType": "string",
    "minBudget": number,
    "maxBudget": number,
    "location": "string",
    "bedrooms": number,
    "bathrooms": number,
    "timeline": "string"
  }
}`;
  }
}

export const aiProcessingService = new AIProcessingService();
