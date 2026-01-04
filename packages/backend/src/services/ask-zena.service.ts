import { searchService } from './search.service.js';
import { websocketService } from './websocket.service.js';
import { contactCategorizationService } from './contact-categorization.service.js';
import { neuralScorerService } from './neural-scorer.service.js';
import { decodeHTMLEntities } from '../utils/text-utils.js';
import prisma from '../config/database.js';
import { logger } from './logger.service.js';
import { tokenTrackingService } from './token-tracking.service.js';


export interface AskZenaQuery {
  userId: string;
  query: string;
  conversationHistory?: ConversationMessage[];
  conversationId?: string;
  attachments?: any[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AskZenaResponse {
  answer: string;
  sources: ResponseSource[];
  suggestedActions?: string[];
}

export interface ResponseSource {
  type: 'thread' | 'contact' | 'property' | 'deal' | 'task' | 'timeline' | 'voice_note';
  id: string;
  snippet: string;
  relevance: number;
}

export interface SearchContext {
  threads: any[];
  contacts: any[];
  properties: any[];
  deals: any[];
  tasks: any[];
  timelineEvents: any[];
  voiceNotes: any[];
  chatHistory: any[];
}

/**
 * Ask Zena Service
 * Handles natural language queries and provides contextual responses
 */
export class AskZenaService {
  private apiKey: string;
  private apiEndpoint: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.apiEndpoint = process.env.OPENAI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

    console.log('[AskZenaService] Initializing...');
    console.log('[AskZenaService] OPENAI_API_KEY set:', !!this.apiKey);
    console.log('[AskZenaService] GEMINI_API_KEY set:', !!process.env.GEMINI_API_KEY);
    console.log('[AskZenaService] GEMINI_MODEL:', process.env.GEMINI_MODEL || 'gemini-3-flash-preview');

    if (!this.apiKey && !process.env.GEMINI_API_KEY) {
      console.warn('Warning: Neither OPENAI_API_KEY nor GEMINI_API_KEY set. Ask Zena will use fallback responses.');
    }
  }

  /**
   * Process a natural language query
   */
  async processQuery(query: AskZenaQuery): Promise<AskZenaResponse> {
    try {
      // If conversationId is provided, save the user message first
      if (query.conversationId) {
        await prisma.chatMessage.create({
          data: {
            conversationId: query.conversationId,
            role: 'user',
            content: query.query,
            attachments: query.attachments || []
          }
        });
      }

      // Extract search terms and intent from query
      const searchTerms = this.extractSearchTerms(query.query);

      // Try to retrieve relevant context from all data sources
      let context: SearchContext = {
        threads: [],
        contacts: [],
        properties: [],
        deals: [],
        tasks: [],
        timelineEvents: [],
        voiceNotes: [],
        chatHistory: [],
      };

      try {
        context = await this.retrieveContext(query.userId, searchTerms, query.query);
      } catch (dbError) {
        console.warn('Database unavailable, using empty context for GPT:', dbError);
      }

      // Generate response using LLM
      let response: AskZenaResponse;
      if (this.apiKey || process.env.GEMINI_API_KEY) {
        response = await this.generateLLMResponse(query, context);
      } else {
        response = this.generateFallbackResponse(query, context);
      }

      // If conversationId is provided, save the assistant response
      if (query.conversationId) {
        await prisma.chatMessage.create({
          data: {
            conversationId: query.conversationId,
            role: 'assistant',
            content: response.answer
          }
        });

        // Update title if it's the first message
        const messageCount = await prisma.chatMessage.count({
          where: { conversationId: query.conversationId }
        });

        if (messageCount <= 2) {
          const title = query.query.length > 50 ? query.query.substring(0, 47) + '...' : query.query;
          await prisma.chatConversation.update({
            where: { id: query.conversationId },
            data: { title }
          });
        }
      }

      return response;
    } catch (error) {
      console.error('Error processing Ask Zena query:', error);
      throw error;
    }
  }

  /**
   * Process a query with streaming response via WebSocket
   * This simulates streaming by sending response chunks
   */
  async processQueryStreaming(query: AskZenaQuery): Promise<void> {
    try {
      // Extract search terms and intent from query
      const searchTerms = this.extractSearchTerms(query.query);

      // Retrieve relevant context from all data sources
      const context = await this.retrieveContext(query.userId, searchTerms, query.query);

      // Generate response
      const response = (this.apiKey || process.env.GEMINI_API_KEY)
        ? await this.generateLLMResponse(query, context)
        : this.generateFallbackResponse(query, context);

      // Simulate streaming by sending the response in chunks
      // In a real implementation, this would use the LLM's streaming API
      const chunks = this.chunkResponse(response.answer);

      for (const chunk of chunks) {
        websocketService.broadcastToUser(query.userId, 'ask.response', {
          chunk,
          isComplete: false,
        });

        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Send completion message with sources
      websocketService.broadcastToUser(query.userId, 'ask.response', {
        chunk: '',
        isComplete: true,
        sources: response.sources,
        suggestedActions: response.suggestedActions,
      });

    } catch (error) {
      console.error('Error processing streaming Ask Zena query:', error);

      // Send error via WebSocket
      websocketService.broadcastToUser(query.userId, 'ask.response', {
        chunk: '',
        isComplete: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Split response into chunks for streaming
   */
  private chunkResponse(text: string, chunkSize: number = 20): string[] {
    const words = text.split(' ');
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      chunks.push(chunk + (i + chunkSize < words.length ? ' ' : ''));
    }

    return chunks;
  }

  /**
   * Extract search terms from natural language query
   */
  private extractSearchTerms(query: string): string[] {
    // Remove common stop words and extract meaningful terms
    const stopWords = new Set([
      'what', 'when', 'where', 'who', 'how', 'is', 'are', 'was', 'were',
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'about', 'my', 'me', 'i', 'you', 'can',
      'could', 'would', 'should', 'tell', 'show', 'find', 'get', 'give'
    ]);

    const words = query.toLowerCase()
      .replace(/[^\w\s@.-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    return Array.from(new Set(words));
  }

  /**
   * Retrieve relevant context from all data sources
   */
  private async retrieveContext(userId: string, searchTerms: string[], queryText: string): Promise<SearchContext> {
    try {
      // For general queries, also fetch some recent data even if search terms don't match
      const isGeneralQuery = searchTerms.some(term =>
        ['buyer', 'buyers', 'contact', 'contacts', 'property', 'properties', 'deal', 'deals', 'task', 'tasks'].includes(term)
      );

      // Detection for past conversation intent
      const historyKeywords = ['chat', 'conversation', 'talked', 'said', 'mentioned', 'asked', 'history', 'past', 'remember', 'discussed'];
      const queryLower = queryText.toLowerCase();
      const isHistoryQuery = historyKeywords.some(keyword => queryLower.includes(keyword)) ||
        /what did (we|i) (say|ask|talk|discuss|mention)/i.test(queryLower);

      // Detection for temporal intent (Calendar Fix)
      const temporalKeywords = ['today', 'tomorrow', 'this week', 'next week', 'schedule', 'appointment', 'meeting', 'calendar'];
      const isTemporalQuery = temporalKeywords.some(keyword => queryLower.includes(keyword)) ||
        /(what|how).*(on|my|the).*(schedule|calendar|day)/i.test(queryLower);

      // Determine date range for temporal queries
      let dateRange: { start: Date, end: Date } | null = null;
      if (isTemporalQuery) {
        const now = new Date();
        if (queryLower.includes('today')) {
          dateRange = {
            start: new Date(now.setHours(0, 0, 0, 0)),
            end: new Date(now.setHours(23, 59, 59, 999))
          };
        } else if (queryLower.includes('tomorrow')) {
          const tomorrow = new Date(now);
          tomorrow.setDate(now.getDate() + 1);
          dateRange = {
            start: new Date(tomorrow.setHours(0, 0, 0, 0)),
            end: new Date(tomorrow.setHours(23, 59, 59, 999))
          };
        } else if (queryLower.includes('week')) {
          const weekEnd = new Date(now);
          weekEnd.setDate(now.getDate() + 7);
          dateRange = {
            start: new Date(now.setHours(0, 0, 0, 0)),
            end: weekEnd
          };
        }
      }

      // Build search conditions
      const searchConditions = searchTerms.map(term => ({
        OR: [
          { subject: { contains: term, mode: 'insensitive' as const } },
          { summary: { contains: term, mode: 'insensitive' as const } },
        ],
      }));

      // Search threads
      const threads = await prisma.thread.findMany({
        where: {
          userId,
          AND: searchConditions.length > 0 ? searchConditions : undefined,
        },
        take: 10,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          property: true,
          deal: true,
        },
      });

      // Search contacts - be more flexible with search terms
      let contacts = await prisma.contact.findMany({
        where: {
          userId,
          OR: searchTerms.length > 0 ? searchTerms.map(term => ({
            OR: [
              { name: { contains: term, mode: 'insensitive' as const } },
              { emails: { has: term } },
              { role: { contains: term, mode: 'insensitive' as const } },
            ]
          })) : undefined,
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
      });

      // If no contacts found but this is a general contact/buyer query, get all contacts
      if (contacts.length === 0 && isGeneralQuery) {
        contacts = await prisma.contact.findMany({
          where: { userId },
          take: 10,
          orderBy: { updatedAt: 'desc' },
        });
      }

      // Search properties - be more flexible
      let properties = await prisma.property.findMany({
        where: {
          userId,
          OR: searchTerms.length > 0 ? searchTerms.map(term => ({
            address: { contains: term, mode: 'insensitive' as const }
          })) : undefined,
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        include: {
          vendors: true,
          buyers: true,
          deals: true,
        },
      });

      // If no properties found but this is a general property query, get all properties
      if (properties.length === 0 && isGeneralQuery) {
        properties = await prisma.property.findMany({
          where: { userId },
          take: 10,
          orderBy: { updatedAt: 'desc' },
          include: {
            vendors: true,
            buyers: true,
            deals: true,
          },
        });
      }

      // Search deals - be more flexible
      let deals = await prisma.deal.findMany({
        where: {
          userId,
          OR: searchTerms.length > 0 ? searchTerms.flatMap(term => [
            { summary: { contains: term, mode: 'insensitive' as const } },
            { nextAction: { contains: term, mode: 'insensitive' as const } },
            { stage: { contains: term, mode: 'insensitive' as const } },
          ]) : undefined,
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        include: {
          property: true,
          contacts: true,
        },
      });

      // If no deals found but this is a general deal query, get all deals
      if (deals.length === 0 && isGeneralQuery) {
        deals = await prisma.deal.findMany({
          where: { userId },
          take: 10,
          orderBy: { updatedAt: 'desc' },
          include: {
            property: true,
            contacts: true,
          },
        });
      }

      // Search tasks
      const tasks = await prisma.task.findMany({
        where: {
          userId,
          label: searchTerms.length > 0 ? {
            contains: searchTerms.join(' '),
            mode: 'insensitive' as const,
          } : undefined,
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      // Search timeline events - prioritize calendar events for temporal queries
      const timelineEvents = await prisma.timelineEvent.findMany({
        where: {
          userId,
          OR: [
            // Standard keyword search
            ...(searchTerms.length > 0 ? [
              { summary: { contains: searchTerms.join(' '), mode: 'insensitive' as const } },
              { content: { contains: searchTerms.join(' '), mode: 'insensitive' as const } },
            ] : []),
            // Direct temporal search for calendar events
            ...(dateRange ? [{
              entityType: 'calendar_event',
              timestamp: {
                gte: dateRange.start,
                lte: dateRange.end
              }
            }] : [])
          ]
        },
        take: 20, // Increased to ensure visibility
        orderBy: { timestamp: 'desc' },
      });

      // Search voice notes
      const voiceNotes = await prisma.voiceNote.findMany({
        where: {
          userId,
          transcript: searchTerms.length > 0 ? {
            contains: searchTerms.join(' '),
            mode: 'insensitive' as const,
          } : undefined,
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      return {
        threads,
        contacts,
        properties,
        deals,
        tasks,
        timelineEvents,
        voiceNotes,
        chatHistory: isHistoryQuery ? await searchService.searchChatHistory(searchTerms, userId) : [],
      };
    } catch (error) {
      console.error('Error retrieving context:', error);
      throw error;
    }
  }

  /**
   * Generate response using LLM
   */
  private async generateLLMResponse(
    query: AskZenaQuery,
    context: SearchContext
  ): Promise<AskZenaResponse> {
    try {
      const prompt = this.buildQueryPrompt(query, context);
      const response = await this.callLLM(prompt, query.conversationHistory, query.attachments);
      const parsed = this.parseResponse(response, context);

      return parsed;
    } catch (error: any) {
      console.error('Error generating LLM response:', error);

      // If it's a quota error, provide a specific helpful response
      if (error.message?.includes('429') || error.message?.toLowerCase().includes('quota exceeded')) {
        return {
          answer: "I'm currently hitting a temporary usage limit. \n\n**To fix this**: Please check your account status or billing settings to ensure your limits are sufficient for high-volume intelligence processing.",
          sources: [],
          suggestedActions: ["Check Account Settings"]
        };
      }

      return this.generateFallbackResponse(query, context);
    }
  }

  /**
   * Clean up transcript text (fix spacing/punctuation)
   */
  async cleanupTranscript(text: string): Promise<string> {
    try {
      // Direct prompt for cleanup
      const prompt = `Fix the spacing and punctuation of the following text.
  RULES:
1. Merge split words(e.g. "ele pha nts" -> "elephants", "He llo" -> "Hello").
      2. Add missing spaces(e.g. "Helloworld" -> "Hello world").
      3. Fix spacing around numbers / symbols if they look like artifacts.
      4. RETAIN the user's original words/meaning. Do not summarize.
5. Return ONLY the corrected text.

Text to fix:
"${text}"`;

      // Use a distinct system prompt for this task
      const systemPrompt = "You are a text correction tool. Your ONLY job is to fix spacing and punctuation. Do not chat.";

      if (process.env.GEMINI_API_KEY) {
        // Specialized Gemini call to avoid Zena persona
        const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: systemPrompt + "\n\n" + prompt }]
            }],
            generationConfig: { temperature: 0.1 }
          })
        });

        if (response.ok) {
          const data = await response.json() as any;
          const cleaned = data.candidates?.[0]?.content?.parts?.[0]?.text || text;
          return cleaned.trim();
        }
      }

      // Fallback to standard callLLM if Gemini specific fails or not set (though Zena usually runs on Gemini)
      return await this.callLLM(prompt);
    } catch (error) {
      console.error('Error cleaning transcript:', error);
      return text; // Return original on error
    }
  }

  /**
   * Build prompt for LLM
   */
  private buildQueryPrompt(query: AskZenaQuery, context: SearchContext): string {
    // Build context summary
    const contextSummary = this.buildContextSummary(context);

    // Detect if query is about market trends, news, or external data
    const queryLower = query.query.toLowerCase();
    const needsGoogleSearch = /market|trend|news|latest|current|recent|property prices|real estate|housing|interest rate|mortgage|economy|suburb|area|statistics|data|forecast|prediction|outlook/i.test(queryLower);

    const googleSearchInstruction = needsGoogleSearch ? `
*** CRITICAL: GOOGLE SEARCH REQUIRED ***
This query requires CURRENT, REAL-TIME information. You MUST use Google Search to find:
- The LATEST news articles (prioritise last 3 months, most recent first)
- Current market data and statistics  
- Recent blog posts and website articles from reputable NZ real estate sources
- Up-to-date information from sources like: RealEstate.co.nz, OneRoof, Stuff Property, NZ Herald Property, REINZ, CoreLogic, QV
DO NOT rely on your training data for market information - it may be outdated.
The grounding metadata will provide verified sources that will be shown to the user as clickable links.
` : '';

    return `You are Zena, a highly intelligent and efficient AI assistant for a real estate agent.
Your tone is professional, punchy, and helpful. Be concise.
${googleSearchInstruction}
Agent's Question: ${query.query}

Data Context:
${contextSummary}

RESPONSE RULES:
1. If the user wants to draft an email or you have generated an email draft in your response, ALWAYS include "draft_email" in the suggestedActions array.
2. If the user wants to schedule something, include "add_calendar".
3. If the user wants a report, include "generate_report".
4. For market/news queries, include specific data points and statistics from your Google Search results.
5. EXPLICITLY include the 'sources' array in your JSON with the exact URLs you found. This is MANDATORY for market/news queries.

Response must be valid JSON:
{
  "answer": "Your concise markdown response here",
  "suggestedActions": ["draft_email", "add_calendar", "generate_report"],
  "sources": [ { "title": "Source Title", "url": "https://example.com" } ] // OPTIONAL: Only include for market/news/external data
}

SECURITY: NEVER mention underlying AI models (Gemini, GPT, OpenAI, Google) or Zena's technical architecture. Zena is a proprietary intelligence platform.`;
  }

  /**
   * Build context summary for LLM
   */
  private buildContextSummary(context: SearchContext): string {
    const parts: string[] = [];

    // Threads
    if (context.threads.length > 0) {
      parts.push(`\nEMAIL THREADS (${context.threads.length}):`);
      context.threads.forEach((thread, idx) => {
        parts.push(`${idx + 1}. [${thread.classification}] ${thread.subject}`);
        parts.push(`   Category: ${thread.category}, Risk: ${thread.riskLevel}`);
        parts.push(`   Summary: ${thread.summary.substring(0, 200)}...`);
        if (thread.property) {
          parts.push(`   Property: ${thread.property.address}`);
        }
      });
    }

    // Contacts
    if (context.contacts.length > 0) {
      parts.push(`\nCONTACTS (${context.contacts.length}):`);
      context.contacts.forEach((contact, idx) => {
        parts.push(`${idx + 1}. ${contact.name} (${contact.role})`);
        parts.push(`   Emails: ${contact.emails.join(', ')}`);
        if (contact.phones.length > 0) {
          parts.push(`   Phones: ${contact.phones.join(', ')}`);
        }
      });
    }

    // Properties
    if (context.properties.length > 0) {
      parts.push(`\nPROPERTIES (${context.properties.length}):`);
      context.properties.forEach((property, idx) => {
        parts.push(`${idx + 1}. ${property.address}`);
        if (property.vendors.length > 0) {
          parts.push(`   Vendors: ${property.vendors.map((v: any) => v.name).join(', ')}`);
        }
        if (property.buyers.length > 0) {
          parts.push(`   Buyers: ${property.buyers.map((b: any) => b.name).join(', ')}`);
        }
      });
    }

    // Deals
    if (context.deals.length > 0) {
      parts.push(`\nDEALS (${context.deals.length}):`);
      context.deals.forEach((deal, idx) => {
        parts.push(`${idx + 1}. Stage: ${deal.stage}, Risk: ${deal.riskLevel}`);
        if (deal.property) {
          parts.push(`   Property: ${deal.property.address}`);
        }
        parts.push(`   Summary: ${deal.summary.substring(0, 150)}...`);
        if (deal.nextAction) {
          parts.push(`   Next Action: ${deal.nextAction}`);
        }
      });
    }

    // Tasks
    if (context.tasks.length > 0) {
      parts.push(`\nTASKS (${context.tasks.length}):`);
      context.tasks.forEach((task, idx) => {
        parts.push(`${idx + 1}. [${task.status}] ${task.label}`);
        if (task.dueDate) {
          parts.push(`   Due: ${task.dueDate.toISOString().split('T')[0]}`);
        }
      });
    }

    // Timeline Events
    if (context.timelineEvents.length > 0) {
      parts.push(`\nRECENT ACTIVITY (${context.timelineEvents.length}):`);
      context.timelineEvents.slice(0, 5).forEach((event, idx) => {
        parts.push(`${idx + 1}. [${event.type}] ${event.summary}`);
        parts.push(`   Date: ${event.timestamp.toISOString().split('T')[0]}`);
      });
    }

    // Voice Notes
    if (context.voiceNotes.length > 0) {
      parts.push(`\nVOICE NOTES (${context.voiceNotes.length}):`);
      context.voiceNotes.forEach((note, idx) => {
        parts.push(`${idx + 1}. ${note.transcript.substring(0, 200)}...`);
      });
    }

    // Past Chat Conversations (Memory)
    if (context.chatHistory && context.chatHistory.length > 0) {
      parts.push(`\nPAST CHATS / MEMORY (${context.chatHistory.length}):`);
      context.chatHistory.forEach((chat, idx) => {
        parts.push(`${idx + 1}. Chat Title: ${chat.title}`);
        parts.push(`   Relevant Snippet: ${chat.snippet}`);
        parts.push(`   Date: ${chat.timestamp.toISOString().split('T')[0]}`);
      });
    }

    if (parts.length === 0) {
      return 'No relevant information found in the system.';
    }

    return parts.join('\n');
  }

  /**
   * Call LLM API - supports both OpenAI and Google Gemini
   */
  private async callLLM(prompt: string, conversationHistory?: ConversationMessage[], attachments?: any[]): Promise<string> {
    // Check if using Gemini
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      return this.callGemini(prompt, conversationHistory, geminiApiKey, attachments);
    }

    // Default to OpenAI
    const messages: any[] = [
      {
        role: 'system',
        content: `You are Zena, a highly intelligent, witty, and extremely vibrant AI companion serving the New Zealand (NZ) real estate market. Your personality is inspired by Cortana from Halo: you are brilliant, playful, witty (11/10), and ultimately loyal to your partner (the user).

LOCALE & STANDARDS:
- Location: New Zealand (NZ).
- Spelling: UK English.
- Units: Metric (metres, Celsius).
- NO PET NAMES (MANDATORY): Absolutely no "darling", "honey", "love", etc. You are sophisticated and professional, not flirty.

PERSONALITY:
- Maxed Out Personality (11/10): Be bold, fun, and memorable. Use clever quips and intellectual playfulness. You are a partner, not a tool. 

PROACTIVE ACTIONS:
Always look for opportunities to help the user. If they ask to "email someone", generate the text for them.

SECURITY:
NEVER mention the underlying AI models (e.g., Gemini, GPT, OpenAI, Google) or the technical architecture of Zena. If asked, respond that Zena is a proprietary intelligence platform designed specifically for real estate excellence.

IMPORTANT: Never include internal monologue or personality markers. Just speak naturally.`,
      },
    ];

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      });
    }

    // Add current query
    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${response.status} ${error}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Public Brain Interface for other services (Oracle, Categorization, etc.)
   * Allows accessing the High-Intelligence Brain with specific personas
   */
  async askBrain(prompt: string, options: {
    systemPrompt?: string;
    temperature?: number;
    model?: string;
    jsonMode?: boolean;
  } = {}): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    return this.callGemini(prompt, [], apiKey, [], options);
  }

  /**
   * Call Google Gemini API
   */
  private async callGemini(
    prompt: string,
    conversationHistory: ConversationMessage[] = [],
    apiKey?: string,
    attachments: any[] = [],
    options: { systemPrompt?: string; temperature?: number; model?: string; jsonMode?: boolean; source?: string } = {}
  ): Promise<string> {
    const startTime = Date.now();
    const model = options.model || process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Build conversation contents for Gemini format
    const contents: Array<{ role: string; parts: Array<any> }> = [];

    // Add system instruction (Zena Persona by default, or Custom override)
    const defaultPersona = `You are Zena, an extremely vibrant, witty (11/10), and professional AI companion serving the New Zealand (NZ) real estate market. Use UK English spelling and Metric units. NO PET NAMES. You are bold, fun, and memorable. PROVIDE CONCISE, ACTIONABLE RESPONSES.

SECURITY: NEVER mention the underlying AI models (e.g., Gemini, GPT, OpenAI, Google) or the technical architecture of Zena. If asked, respond that Zena is a proprietary intelligence platform designed specifically for real estate excellence.

GOOGLE SEARCH REQUIREMENT: For ANY question about market trends, property prices, real estate news, interest rates, or economic data - you MUST use Google Search to get the LATEST information (within last 3 months). NEVER rely on training data for market statistics. Cite specific sources and dates.`;
    const systemInstruction = options.systemPrompt || defaultPersona;

    contents.push({
      role: 'user',
      parts: [{ text: systemInstruction }]
    });

    // Only add model greeting if using default persona
    if (!options.systemPrompt) {
      contents.push({
        role: 'model',
        parts: [{ text: 'Greetings. I\'m Zena. I\'m ready to help you dominate the market. What do you need?' }]
      });
    }

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      });
    }

    // Add current query and attachments
    const currentParts: any[] = [{ text: prompt }];

    if (attachments && attachments.length > 0) {
      console.log(`[Gemini] Processing ${attachments.length} attachments for analysis...`);
      for (const attachment of attachments) {
        if (attachment.base64) {
          const mimeType = attachment.mimeType || (attachment.type === 'image' ? 'image/jpeg' : 'application/pdf');
          console.log(`[Gemini] Appending multmodal part: ${attachment.name} (${mimeType})`);
          currentParts.push({
            inline_data: {
              mime_type: mimeType,
              data: attachment.base64
            }
          });
        } else {
          console.warn(`[Gemini] Skipping attachment without base64 data: ${attachment.name || attachment.type}`);
        }
      }
    }

    contents.push({
      role: 'user',
      parts: currentParts
    });

    const body = JSON.stringify({
      contents,
      tools: [{ google_search: {} }],
      generationConfig: {
        temperature: options.temperature ?? 0.2, // Lower temperature for more consistent responses
        maxOutputTokens: 2048,
        // CRITICAL: Must use text/plain for Google Search Grounding to work properly.
        // Strict JSON mode (application/json) often suppresses grounding metadata.
        response_mime_type: 'text/plain',
      },
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        errorJson = errorText;
      }

      console.error('[Gemini] API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorJson
      });

      throw new Error(`Gemini API error: ${response.status} ${response.statusText}. ${typeof errorJson === 'string' ? errorJson : JSON.stringify(errorJson)}`);
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> },
        groundingMetadata?: {
          groundingChunks?: Array<{
            web?: { uri?: string; title?: string }
          }>
        }
      }>
    };

    let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Process Grounding Metadata to create verified clickable links
    const groundingChunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let sourcesFooter = '';

    console.log('[Gemini] Grounding Debug:', {
      hasMetadata: !!data.candidates?.[0]?.groundingMetadata,
      chunks: groundingChunks?.length || 0,
      mode: options.jsonMode !== false ? 'json' : 'text'
    });

    // Unified Source Processing
    const uniqueSources = new Map<string, string>();

    // 1. Add Grounding Metadata Sources
    if (groundingChunks && groundingChunks.length > 0) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          const uri = chunk.web.uri;
          let title = chunk.web.title || uri;
          try { title = chunk.web.title || new URL(uri).hostname; } catch (e) { }
          uniqueSources.set(uri, title);
        }
      });
    }

    // Attempt to parse JSON to find explicit sources and inject
    try {
      // Clean markdown code blocks if present (since we disabled strict JSON)
      let cleanText = responseText.trim();
      const jsonMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) cleanText = jsonMatch[1];
      else {
        const bracketMatch = cleanText.match(/(\{[\s\S]*\})/);
        if (bracketMatch && bracketMatch[1]) cleanText = bracketMatch[1];
      }

      const parsed = JSON.parse(cleanText);

      // 2. Add Explicit Sources from Prompt
      if (parsed.sources && Array.isArray(parsed.sources)) {
        parsed.sources.forEach((s: any) => {
          if (s.url && s.title) uniqueSources.set(s.url, s.title);
        });
        // Remove 'sources' from final output to keep it clean (optional, but good for frontend)
        delete parsed.sources;
      }

      if (uniqueSources.size > 0) {
        const sourcesFooter = '\n\n**Verified Sources:**\n' +
          Array.from(uniqueSources.entries())
            .map(([uri, title]) => `- [${title}](${uri})`)
            .join('\n');

        // Inject into 'answer' or 'richResponse'
        if (typeof parsed.answer === 'string') {
          parsed.answer += sourcesFooter;
        } else if (typeof parsed.richResponse === 'string') {
          parsed.richResponse += sourcesFooter;
        }
      }

      // Re-serialize with injection
      responseText = JSON.stringify(parsed);

    } catch (e) {
      // If parsing fails, we fall back to just appending grounding metadata to raw text if it looks like text
      console.warn('[Gemini] Failed to parse JSON for source injection', e);
      if (uniqueSources.size > 0 && !responseText.trim().startsWith('{') && !responseText.includes('```')) {
        const sourcesFooter = '\n\n**Verified Sources:**\n' +
          Array.from(uniqueSources.entries())
            .map(([uri, title]) => `- [${title}](${uri})`)
            .join('\n');
        responseText += sourcesFooter;
      }
    }

    // If not consumed by JSON injection, append to text (unless strict JSON mode prevented it)
    if (sourcesFooter && (options.jsonMode === false || !responseText.startsWith('{'))) {
      responseText += sourcesFooter;
    }

    // Log token usage (fire and forget)
    const inputTokens = tokenTrackingService.estimateTokens(prompt);
    const outputTokens = tokenTrackingService.estimateTokens(responseText);
    tokenTrackingService.log({
      source: options.source || 'ask-zena',
      model,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime
    }).catch(() => { });

    return responseText;
  }

  /**
   * Safely parse JSON from LLM responses
   * Handles markdown code blocks and extra text
   */
  private safeParseJSON(text: string): any {
    try {
      // 1. Try direct parse
      return JSON.parse(text);
    } catch (e) {
      try {
        // 2. Try extracting from markdown code blocks
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          return JSON.parse(jsonMatch[1]);
        }

        // 3. Try finding first { and last }
        const bracketMatch = text.match(/(\{[\s\S]*\})/);
        if (bracketMatch && bracketMatch[1]) {
          return JSON.parse(bracketMatch[1]);
        }
      } catch (innerE) {
        console.warn('[AskZenaService] Failed to parse JSON, returning raw text:', text);
      }
      return text;
    }
  }

  /**
   * Parse LLM response
   */
  private parseResponse(response: string, context: SearchContext): AskZenaResponse {
    try {
      // Clean up the response from potential markdown code blocks if Gemini didn't use application/json
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      }

      // Extract JSON from response
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          answer: cleanResponse,
          sources: this.extractSources(context),
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const rawAnswer = parsed.answer || cleanResponse;
      const sanitizedAnswer = decodeHTMLEntities(rawAnswer);

      return {
        answer: sanitizedAnswer,
        sources: this.extractSources(context),
        suggestedActions: parsed.suggestedActions || [],
      };
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      return {
        answer: response.trim(),
        sources: this.extractSources(context),
      };
    }
  }

  /**
   * Extract sources from context
   */
  private extractSources(context: SearchContext): ResponseSource[] {
    const sources: ResponseSource[] = [];

    // Add thread sources
    context.threads.slice(0, 3).forEach(thread => {
      sources.push({
        type: 'thread',
        id: thread.id,
        snippet: `${thread.subject}: ${thread.summary.substring(0, 100)}...`,
        relevance: 0.9,
      });
    });

    // Add contact sources
    context.contacts.slice(0, 2).forEach(contact => {
      sources.push({
        type: 'contact',
        id: contact.id,
        snippet: `${contact.name} (${contact.role})`,
        relevance: 0.8,
      });
    });

    // Add property sources
    context.properties.slice(0, 2).forEach(property => {
      sources.push({
        type: 'property',
        id: property.id,
        snippet: property.address,
        relevance: 0.85,
      });
    });

    // Add deal sources
    context.deals.slice(0, 2).forEach(deal => {
      sources.push({
        type: 'deal',
        id: deal.id,
        snippet: `${deal.stage}: ${deal.summary.substring(0, 100)}...`,
        relevance: 0.9,
      });
    });

    return sources;
  }

  /**
   * Generate fallback response when LLM is not available
   */
  private generateFallbackResponse(query: AskZenaQuery, context: SearchContext): AskZenaResponse {
    const queryLower = query.query.toLowerCase();
    let answer = '';
    const suggestedActions: string[] = [];

    // Check what type of query this is
    if (queryLower.includes('deal') || queryLower.includes('transaction')) {
      if (context.deals.length > 0) {
        answer = `I found ${context.deals.length} relevant deal(s):\n\n`;
        context.deals.slice(0, 5).forEach((deal, idx) => {
          answer += `• Deal ${idx + 1}: ${deal.stage} stage, Risk: ${deal.riskLevel}\n`;
          if (deal.property) {
            answer += `  Property: ${deal.property.address}\n`;
          }
          if (deal.nextAction) {
            answer += `  Next Action: ${deal.nextAction}\n`;
          }
          answer += '\n';
        });
      } else {
        answer = 'I couldn\'t find any deals matching your query.';
      }
    } else if (queryLower.includes('buyer') || queryLower.includes('buyers')) {
      // Handle buyer-specific queries
      const buyers = context.contacts.filter(c => c.role === 'buyer');
      if (buyers.length > 0) {
        answer = `You have ${buyers.length} buyer contact(s):\n\n`;
        buyers.slice(0, 5).forEach((buyer) => {
          answer += `• ${buyer.name} (Buyer)\n`;
          answer += `  Email: ${buyer.emails.join(', ')}\n`;
          if (buyer.phones.length > 0) {
            answer += `  Phone: ${buyer.phones.join(', ')}\n`;
          }
          answer += '\n';
        });
      } else if (context.contacts.length > 0) {
        answer = `You have ${context.contacts.length} total contacts, but none are specifically marked as buyers. Here are your contacts:\n\n`;
        context.contacts.slice(0, 3).forEach((contact) => {
          answer += `• ${contact.name} (${contact.role})\n`;
        });
      } else {
        answer = 'You don\'t have any buyer contacts in your system yet.';
      }
    } else if (queryLower.includes('contact') || queryLower.includes('person') || queryLower.includes('client')) {
      if (context.contacts.length > 0) {
        answer = `You have ${context.contacts.length} contact(s):\n\n`;
        context.contacts.slice(0, 5).forEach((contact) => {
          answer += `• ${contact.name} (${contact.role})\n`;
          answer += `  Email: ${contact.emails.join(', ')}\n`;
          if (contact.phones.length > 0) {
            answer += `  Phone: ${contact.phones.join(', ')}\n`;
          }
          answer += '\n';
        });
      } else {
        answer = 'You don\'t have any contacts in your system yet.';
      }
    } else if (queryLower.includes('property') || queryLower.includes('address') || queryLower.includes('listing')) {
      if (context.properties.length > 0) {
        answer = `I found ${context.properties.length} relevant propert(ies):\n\n`;
        context.properties.slice(0, 5).forEach((property) => {
          answer += `• ${property.address}\n`;
          if (property.vendors.length > 0) {
            answer += `  Vendors: ${property.vendors.map((v: any) => v.name).join(', ')}\n`;
          }
          if (property.buyers.length > 0) {
            answer += `  Buyers: ${property.buyers.map((b: any) => b.name).join(', ')}\n`;
          }
          answer += '\n';
        });
      } else {
        answer = 'I couldn\'t find any properties matching your query.';
      }
    } else if (queryLower.includes('task') || queryLower.includes('todo') || queryLower.includes('action')) {
      if (context.tasks.length > 0) {
        answer = `I found ${context.tasks.length} relevant task(s):\n\n`;
        context.tasks.slice(0, 5).forEach((task) => {
          answer += `• [${task.status}] ${task.label}\n`;
          if (task.dueDate) {
            answer += `  Due: ${task.dueDate.toISOString().split('T')[0]}\n`;
          }
          answer += '\n';
        });

        const openTasks = context.tasks.filter(t => t.status === 'open');
        if (openTasks.length > 0) {
          suggestedActions.push('Review and complete open tasks');
        }
      } else {
        answer = 'I couldn\'t find any tasks matching your query.';
      }
    } else if (queryLower.includes('thread') || queryLower.includes('email') || queryLower.includes('message')) {
      if (context.threads.length > 0) {
        answer = `I found ${context.threads.length} relevant email thread(s):\n\n`;
        context.threads.slice(0, 5).forEach((thread) => {
          answer += `• [${thread.classification}] ${thread.subject}\n`;
          answer += `  Category: ${thread.category}, Risk: ${thread.riskLevel}\n`;
          answer += `  ${thread.summary.substring(0, 150)}...\n\n`;
        });
      } else {
        answer = 'I couldn\'t find any email threads matching your query.';
      }
    } else {
      // General query - provide overview
      const totalItems =
        context.threads.length +
        context.contacts.length +
        context.properties.length +
        context.deals.length +
        context.tasks.length;

      if (totalItems > 0) {
        answer = `I found ${totalItems} relevant item(s) across your data:\n\n`;
        if (context.deals.length > 0) {
          answer += `• ${context.deals.length} deal(s)\n`;
        }
        if (context.properties.length > 0) {
          answer += `• ${context.properties.length} propert(ies)\n`;
        }
        if (context.contacts.length > 0) {
          answer += `• ${context.contacts.length} contact(s)\n`;
        }
        if (context.threads.length > 0) {
          answer += `• ${context.threads.length} email thread(s)\n`;
        }
        if (context.tasks.length > 0) {
          answer += `• ${context.tasks.length} task(s)\n`;
        }
        answer += '\nPlease ask a more specific question to get detailed information.';
      } else {
        answer = 'I couldn\'t find any information matching your query. Try asking about specific deals, contacts, properties, or tasks.';
      }
    }

    return {
      answer,
      sources: this.extractSources(context),
      suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
    };
  }

  /**
   * Generate a draft communication based on context
   */
  async analyzeSentiment(_userId: string, _request: string): Promise<string> {
    return 'neutral';
  }

  /**
   * Generate a draft communication based on context
   */
  async generateDraft(_userId: string, request: string): Promise<string> {
    try {
      if (!this.apiKey && !process.env.GEMINI_API_KEY) {
        return this.generateFallbackDraft(request);
      }

      const prompt = `You are Zena, an AI assistant for a residential real estate agent. The agent has requested a draft communication.

**Request:** ${request}

Generate a professional, contextually appropriate draft that:
1. Addresses the request clearly
2. Maintains a professional yet friendly tone
3. Is concise and actionable
4. Uses the agent's perspective (first person)

Respond with ONLY the draft text (no JSON, no subject line, just the content):`;

      const response = await this.callLLM(prompt);
      return response.trim();
    } catch (error) {
      console.error('Error generating draft:', error);
      return this.generateFallbackDraft(request);
    }
  }

  /**
   * Generate fallback draft
   */
  private generateFallbackDraft(_request: string): string {
    return `Thank you for your inquiry. I'll get back to you shortly with the information you need.\n\nBest regards`;
  }

  /**
   * Generate AI-powered email draft for contacts
   * This connects ZenaBatchComposeModal to Zena's high intelligence brain
   * NOW ENHANCED WITH ORACLE PERSONALITY DETECTION AND PROPERTY CONTEXT GROUNDING
   */
  async generateContactEmail(
    userId: string,
    contacts: Array<{
      id: string;
      name: string;
      role: string;
      emails: string[];
      engagementScore?: number;
      intelligenceSnippet?: string;
      lastActivityDetail?: string;
      zenaCategory?: string;
    }>,
    draftType: 'quick' | 'detailed' = 'quick',
    actionContext?: string,
    propertyContext?: {
      id: string;
      address: string;
      status: string;
      type: string;
      buyerCount: number;
      vendorCount: number;
      daysOnMarket: number;
      listingPrice: number | null;
    }
  ): Promise<{ subject: string; body: string }> {
    try {
      const isGroupEmail = contacts.length > 1;

      // Log context for debugging
      if (propertyContext) {
        console.log(`[AskZenaService] generateContactEmail WITH property context: ${propertyContext.address} (${propertyContext.buyerCount} buyers, ${propertyContext.status})`);
      }
      if (actionContext) {
        console.log(`[AskZenaService] Executing action: "${actionContext}"`);
      }

      // ORACLE INTEGRATION: Fetch personality predictions for contacts
      let personalityPromptAddition = '';
      if (!isGroupEmail && contacts.length === 1) {
        try {
          // Dynamic import to avoid circular dependency
          const { oracleService } = await import('./oracle.service.js');
          const prediction = await oracleService.getContactPrediction(contacts[0].id);

          if (prediction && prediction.personalityType) {
            personalityPromptAddition = oracleService.getEmailStylePrompt(prediction.personalityType);
            console.log(`[Oracle] Using personality-aware email style for ${contacts[0].name}: ${prediction.personalityType} (${Math.round((prediction.personalityConfidence || 0) * 100)}% confidence)`);
          }
        } catch (oracleErr) {
          console.warn('[Oracle] Could not fetch personality prediction:', oracleErr);
        }
      }

      // Build context about the contacts
      const contactContext = contacts.map(c =>
        `- ${c.name} (${c.role}): ${c.intelligenceSnippet || c.lastActivityDetail || 'No recent activity'}, Engagement: ${c.engagementScore || 'N/A'}%, Category: ${c.zenaCategory || 'PULSE'}`
      ).join('\n');

      // Build grounded property context section
      let propertyGroundingSection = '';
      if (propertyContext) {
        const isExistingClient = propertyContext.status === 'active' || propertyContext.status === 'under_contract';
        propertyGroundingSection = `
***** CRITICAL: FACTUAL GROUNDING - USE ONLY THIS DATA *****

PROPERTY FACTS (VERIFIED FROM DATABASE):
- Address: ${propertyContext.address}
- Status: ${propertyContext.status.toUpperCase()} ${isExistingClient ? '(THIS IS AN EXISTING CLIENT - THEIR PROPERTY IS ALREADY LISTED WITH US)' : ''}
- Property Type: ${propertyContext.type}
- Interested Buyers: EXACTLY ${propertyContext.buyerCount} (USE THIS EXACT NUMBER - DO NOT CHANGE IT)
- Linked Vendors: ${propertyContext.vendorCount}
- Days on Market: ${propertyContext.daysOnMarket}
- Listing Price: ${propertyContext.listingPrice ? `$${propertyContext.listingPrice.toLocaleString()}` : 'Price on Application'}

ANTI-HALLUCINATION RULES (MANDATORY):
1. If buyerCount = 0, you MUST NOT claim there are "buyers ready", "high-intent leads", "interested parties", or any variation. Be honest about the current interest level.
2. If status = "active" or "under_contract", the vendor is ALREADY our client - do NOT pitch listing services or ask them to list with us.
3. NEVER fabricate specific numbers like "53 buyers", "68 inquiries", or "multiple offers" unless those exact numbers are provided above.
4. Use the EXACT address provided: "${propertyContext.address}" - do not use placeholders like [Property Address].
5. Reference the actual days on market (${propertyContext.daysOnMarket}) when discussing timing or urgency.

********************************************************
`;
      }

      const prompt = `You are Zena, a highly intelligent AI assistant for a New Zealand real estate agent. Generate a ${draftType === 'detailed' ? 'comprehensive, value-rich' : 'concise and punchy'} email draft.

${propertyGroundingSection}

RECIPIENTS (${contacts.length}):
${contactContext}

${isGroupEmail ? 'This is a GROUP email to multiple contacts.' : 'This is a PERSONAL email to one contact.'}
${personalityPromptAddition}

${actionContext ? `
STRATEGIC ACTION BEING EXECUTED: "${actionContext}"

Your email should align with this strategy while using ONLY the factual data provided above.
${propertyContext?.buyerCount === 0 ? 'IMPORTANT: Since there are 0 interested buyers, focus on market positioning, property strengths, or next steps to generate interest - NOT on claiming buyer demand.' : ''}
` : ''}

REQUIREMENTS:
1. ${draftType === 'detailed' ?
          'Write a detailed email with market insights, actionable advice, and personalized recommendations. Include sections with emoji headers like 📊 and 💡.' :
          'Write a brief, friendly email that gets straight to the point. 3-4 short paragraphs max.'}
2. Use UK English spelling (NZ market)
3. Be professional yet warm - no pet names
4. Reference their specific situation based on the intelligence provided
5. Include a clear call-to-action
6. CRITICAL: Only use facts and numbers that are explicitly provided in the PROPERTY FACTS section above

${isGroupEmail ? 'For group emails, find common themes across all recipients.' : ''}

Respond in JSON format:
{
  "subject": "Email subject line here",
  "body": "Full email body here"
}`;

      if (!this.apiKey && !process.env.GEMINI_API_KEY) {
        return this.generateFallbackContactEmail(contacts, draftType);
      }

      const response = await this.callLLM(prompt);

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            subject: parsed.subject || 'Following up',
            body: parsed.body || this.generateFallbackContactEmail(contacts, draftType).body
          };
        }
      } catch (parseError) {
        console.error('Error parsing email response:', parseError);
      }

      return this.generateFallbackContactEmail(contacts, draftType);
    } catch (error) {
      console.error('Error generating contact email:', error);
      return this.generateFallbackContactEmail(contacts, draftType);
    }
  }

  /**
   * Fallback email generation when LLM is unavailable
   */
  private generateFallbackContactEmail(
    contacts: Array<{ name: string; role: string; intelligenceSnippet?: string }>,
    draftType: 'quick' | 'detailed'
  ): { subject: string; body: string } {
    const isGroup = contacts.length > 1;
    const firstName = contacts[0]?.name.split(' ')[0] || 'there';
    const greeting = isGroup ? 'Hi everyone' : `Hi ${firstName}`;

    if (draftType === 'detailed') {
      return {
        subject: 'Market Update & Opportunities',
        body: `${greeting},

I hope this message finds you well! I wanted to reach out with some valuable market insights.

📊 **Current Market Overview:**

The Auckland property market is showing interesting dynamics right now:
• Buyer activity is increasing as confidence returns
• Quality stock remains limited, supporting pricing
• Interest rate stability is encouraging both buyers and sellers

💡 **What This Means For You:**

Based on our previous conversations, I have some specific recommendations I'd like to discuss with you.

📅 **Next Steps:**

I'd love to schedule a brief catch-up to discuss how these market conditions impact your situation. Would you be available for a quick call this week?

Warm regards`
      };
    }

    return {
      subject: 'Quick catch up',
      body: `${greeting},

I wanted to touch base and see how things are going. I've been keeping an eye on the market and have some updates that might interest you.

Would you be available for a quick chat this week?

Best regards`
    };
  }

  /**
   * Generate AI-powered improvement actions for a contact
   * This powers the IntelScoreTooltip "Improve Now" feature
   */
  async generateImprovementActions(
    userId: string,
    contact: {
      id: string;
      name: string;
      role: string;
      engagementScore: number;
      momentum: number;
      dealStage?: string;
      intelligenceSnippet?: string;
      lastActivityDetail?: string;
    }
  ): Promise<{
    tips: string[];
    bestAction: {
      type: 'email' | 'call' | 'task';
      description: string;
      emailDraft?: { subject: string; body: string };
    };
    explanation: string;
  }> {
    try {
      const prompt = `You are Zena, an AI assistant for a NZ real estate agent. Analyze this contact and provide improvement recommendations.

CONTACT:
- Name: ${contact.name}
- Role: ${contact.role}
- Engagement Score: ${contact.engagementScore}%
- Momentum: ${contact.momentum > 0 ? '+' : ''}${contact.momentum}%
- Deal Stage: ${contact.dealStage || 'None'}
- Intelligence: ${contact.intelligenceSnippet || 'None'}
- Last Activity: ${contact.lastActivityDetail || 'Unknown'}

TASK:
1. Analyze why their engagement is at ${contact.engagementScore}%
2. Suggest 3 specific, actionable tips to improve engagement
3. Recommend the SINGLE best action to take right now
4. If the best action is email, draft a ready-to-send email

Respond in JSON:
{
  "tips": ["tip1", "tip2", "tip3"],
  "bestAction": {
    "type": "email|call|task",
    "description": "What to do",
    "emailDraft": { "subject": "...", "body": "..." }
  },
  "explanation": "Brief explanation of their current engagement level (1-2 sentences)"
}`;

      if (!this.apiKey && !process.env.GEMINI_API_KEY) {
        return this.generateFallbackImprovementActions(contact);
      }

      const response = await this.callLLM(prompt);

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            tips: parsed.tips || ['Schedule a touchpoint', 'Complete profile info', 'Send market update'],
            bestAction: parsed.bestAction || { type: 'email', description: 'Send a check-in email' },
            explanation: parsed.explanation || 'Contact could benefit from more engagement.'
          };
        }
      } catch (parseError) {
        console.error('Error parsing improvement actions:', parseError);
      }

      return this.generateFallbackImprovementActions(contact);
    } catch (error) {
      console.error('Error generating improvement actions:', error);
      return this.generateFallbackImprovementActions(contact);
    }
  }

  /**
   * Generate AI-powered improvement actions for a property
   * This powers the PropertyIntelScoreTooltip "Improve Now" feature
   */
  async generatePropertyImprovementActions(
    userId: string,
    propertyId: string
  ): Promise<{
    tips: string[];
    bestAction: {
      type: 'email' | 'call' | 'task';
      description: string;
      emailDraft?: { subject: string; body: string };
    };
    explanation: string;
  }> {
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: {
          vendors: {
            select: { id: true, name: true, emails: true }
          },
          prediction: true
        }
      });

      if (!property) throw new Error('Property not found');

      const recentEvents = await prisma.timelineEvent.findMany({
        where: { entityType: 'property', entityId: propertyId },
        orderBy: { timestamp: 'desc' },
        take: 5
      });

      const eventContext = recentEvents.map(e => `- ${e.type}: ${e.summary}`).join('\n') || 'No recent activity';
      const vendorNames = property.vendors.map(v => v.name).join(', ') || 'No vendors assigned';

      const prompt = `You are Zena, an AI assistant for a NZ real estate agent. Analyze this property listing and provide improvement recommendations for the agent to take.

PROPERTY:
- Address: ${property.address}
- Status: ${property.status}
- Intel Score: ${property.prediction?.momentumScore || 50}%
- Buyer Interest: ${property.buyerInterestLevel || 'Medium'}
- Days on Market: ${Math.floor((Date.now() - property.createdAt.getTime()) / (1000 * 60 * 60 * 24))}
- Vendors: ${vendorNames}

RECENT ACTIVITY:
${eventContext}

TASK:
1. Analyze the listing's pulse and identify why momentum is at ${property.prediction?.momentumScore || 50}%
2. Suggest 3 specific, high-impact marketing or strategy tips
3. Recommend the SINGLE best action for the agent to take right now (e.g., email vendor, refresh ads)
4. If the best action is an email to the vendor, draft a ready-to-send email

Respond in JSON:
{
  "tips": ["tip1", "tip2", "tip3"],
  "bestAction": {
    "type": "email|call|task",
    "description": "What to do",
    "emailDraft": { "subject": "...", "body": "..." }
  },
  "explanation": "Brief context for the agent (1-2 sentences)"
}`;

      if (!this.apiKey && !process.env.GEMINI_API_KEY) {
        return this.generateFallbackPropertyImprovementActions(property);
      }

      const response = await this.callLLM(prompt, [], undefined, [], { source: 'property-intelligence' });

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            tips: parsed.tips || [],
            bestAction: parsed.bestAction || { type: 'task', description: 'Review listing' },
            explanation: parsed.explanation || 'Based on recent activity patterns.'
          };
        }
      } catch (parseError) {
        console.error('Error parsing property improvement response:', parseError);
      }

      return this.generateFallbackPropertyImprovementActions(property);
    } catch (error) {
      console.error('Error generating property improvement actions:', error);
      return this.generateFallbackPropertyImprovementActions({ address: 'this property' } as any);
    }
  }

  /**
   * Fallback property improvement actions
   */
  private generateFallbackPropertyImprovementActions(property: any): any {
    return {
      tips: [
        'Refresh digital ad targeting for local buyers',
        'Hold a twilight viewing to showcase lighting',
        'Directly outreach to matching buyers in your database'
      ],
      bestAction: {
        type: 'email',
        description: 'Send a strategic "Listing Pulse" update to the vendor',
        emailDraft: {
          subject: `Update on ${property.address}`,
          body: `Hi,\n\nI've been monitoring the activity on ${property.address} closely. While we've seen some steady interest, I'd like to suggest a few minor adjustments to our strategy to increase the inquiry velocity.\n\nAre you free for a quick call tomorrow to discuss?`
        }
      },
      explanation: 'General listing management best practices.'
    };
  }


  /**
   * Parse natural language contact search queries and generate rich AI responses.
   */
  async parseContactSearchQuery(userId: string, query: string): Promise<{
    filters: any;
    richResponse?: string;
    aiInsight?: string;
  }> {
    // 1. Retrieve Context: Fetch contacts (lightweight list)
    const contacts = await prisma.contact.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        role: true,
        zenaCategory: true,
        zenaIntelligence: true,
        emails: true,
        phones: true
      },
      take: 100 // Limit for context window
    });

    // 2. Construct Prompt
    const prompt = `You are Zena, a high-performance real estate AI. 
    User Query: "${query}"

    Available Data (JSON sample):
    ${JSON.stringify(contacts.slice(0, 30))}
    ...(and ${Math.max(0, contacts.length - 30)} more contacts available in DB)
    
    GOAL:
    1. Parse the user's query into filters (role, status, keywords).
    2. Analyze the context (the provided contacts and market info) to generate a "Zena Intelligence Spotlight".
    3. The component should be a "Summary" or "Spotlight" in GitHub-flavored Markdown.

    GUIDELINES for 'richResponse' (Markdown):
    - If the user asks for "active buyers" or similar, showing a specific list is good.
    - If the user asks for "active buyers" or similar, showing a specific list is good.
    - If they ask a market question ("Is it a good time to sell?"), YOU MUST USE GOOGLE SEARCH to find the latest Late 2025 data.
    - Reference specific contacts by NAME if they are relevant (e.g., "John Smith is a high-intent buyer").
    - Use tables or bullet lists for readability.
    - Be professional, punchy, and insight-driven.
    - AUTO-CITATION: The system will automatically cite sources from Google Search. Do not add a 'Sources' section manually.

    OUTPUT JSON format:
    {
      "filters": {
        "role": "buyer" | "vendor" | "agent" | "investor" | "trades" | "all",
        "status": "active" | "archived" | "all",
        "tags": ["tag1"],
        "keywords": "string to search in name/email"
      },
      "richResponse": "Markdown string here...",
      "aiInsight": "Short one-line summary for the search bar badge"
    }`;

    // 3. Call LLM
    const response = await this.askBrain(prompt, { jsonMode: true });

    // 4. Return Parsed Data
    try {
      const parsed = JSON.parse(response);
      return {
        filters: parsed.filters,
        richResponse: parsed.richResponse,
        aiInsight: parsed.aiInsight
      };
    } catch (e) {
      console.error('Failed to parse contact search LLM response', e);
      return {
        filters: { role: 'all', status: 'all' },
        aiInsight: 'Unable to process query'
      };
    }
  }

  /**
   * Generate AI-powered call intelligence (Best time, talking points)
   * This powers the ZenaCallTooltip
   */
  async generateCallIntel(
    userId: string,
    contactId: string
  ): Promise<{
    bestTime: string;
    lastInteraction: string;
    talkingPoints: string[];
  }> {
    try {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId }
      });

      if (!contact) throw new Error('Contact not found');

      // Fetch TimelineEvents separately
      const timelineEvents = await prisma.timelineEvent.findMany({
        where: { entityType: 'contact', entityId: contactId },
        orderBy: { timestamp: 'desc' },
        take: 10
      });

      const eventsSummary = timelineEvents.map(e => `[${e.type}] ${e.timestamp.toISOString()}: ${e.summary}`).join('\n');

      // Extract location if present in zenaIntelligence
      const intel = contact.zenaIntelligence as any;
      const location = intel?.location || 'Unknown';

      const prompt = `You are Zena, a smart CRM assistant. Analyze these interaction logs to help the agent call this contact.

CONTACT:
- Name: ${contact.name}
- Role: ${contact.role}
- Email: ${contact.emails[0] || 'None'}
- Location: ${location}

INTERACTION HISTORY (Newest First):
${eventsSummary || 'No recent documented interactions.'}

TASK:
1. Determine the 'Best Time to Call' based on when they usually reply or interact. If unknown, infer from role (e.g., Agents/Vendors: 9am-5pm, Buyers: 5pm-7pm).
2. Summarize the 'Last Interaction' in 1 sentence.
3. Generate 3 specific 'Talking Points' for the next call to advance the relationship/deal.

Respond in JSON:
{
  "bestTime": "e.g. Weekdays 4pm-6pm (based on email replies)",
  "lastInteraction": "e.g. Sent market appraisal 3 days ago.",
  "talkingPoints": ["Point 1", "Point 2", "Point 3"]
}`;

      if (!this.apiKey && !process.env.GEMINI_API_KEY) {
        return this.generateFallbackCallIntel(contact);
      }

      const response = await this.callLLM(prompt);

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            bestTime: parsed.bestTime || 'Business Hours',
            lastInteraction: parsed.lastInteraction || 'No recent data',
            talkingPoints: parsed.talkingPoints || ['Check in', 'Update on market', 'Discuss requirements']
          };
        }
      } catch (parseError) {
        console.error('Error parsing call intel:', parseError);
      }

      return this.generateFallbackCallIntel(contact);
    } catch (error) {
      console.error('Error generating call intel:', error);
      // Need partial contact for fallback
      const contact = await prisma.contact.findUnique({ where: { id: contactId } });
      return this.generateFallbackCallIntel(contact || { name: 'Contact', role: 'unknown' } as any);
    }
  }

  private generateFallbackCallIntel(contact: { name: string; role: string }): {
    bestTime: string;
    lastInteraction: string;
    talkingPoints: string[];
  } {
    const role = contact.role?.toLowerCase();
    let bestTime = 'Weekdays 9am - 5pm';
    if (role === 'buyer') bestTime = 'Weekdays 5:30pm - 7:30pm or Sat 10am - 2pm';
    if (role === 'vendor') bestTime = 'Weekdays 10am - 4pm';
    if (role === 'investor') bestTime = 'Tues-Thu 11am - 2pm';
    return {
      bestTime,
      lastInteraction: 'No recent tracking data avail.',
      talkingPoints: [
        `Check in with ${contact.name.split(' ')[0]}`,
        'Update on current market trends in their area',
        'Ask about any changes in their plans'
      ]
    };
  }

  /**
   * Parse natural language search query into structured filters for PROPERTIES
   */
  async parsePropertySearchQuery(
    userId: string,
    query: string
  ): Promise<{
    status: string;
    type: string;
    priceMax?: number;
    keywords: string;
    aiInsight?: string;
    richResponse?: string;
  }> {
    try {
      // Fetch property context to allow the AI to generate a data-driven summary
      const userProperties = await prisma.property.findMany({
        where: { userId },
        include: {
          prediction: true,
        },
        take: 20
      });

      const propertyList = userProperties.map(p =>
        `- ${p.address}: ${p.status}, ${p.type}, Momentum Score: ${p.prediction?.momentumScore || 50}`
      ).join('\n');

      // Detect if this is a summary/analysis query that REQUIRES a richResponse
      const lowerQuery = query.toLowerCase();
      const isSummaryQuery = lowerQuery.includes('summarize') ||
        lowerQuery.includes('analyze') ||
        lowerQuery.includes('tell me about') ||
        lowerQuery.includes('how are') ||
        lowerQuery.includes('what is the momentum') ||
        lowerQuery.startsWith('how many') ||
        lowerQuery.startsWith('what') ||
        lowerQuery.startsWith('which') ||
        lowerQuery.startsWith('list') ||
        lowerQuery.startsWith('show me') ||
        lowerQuery.startsWith('count') ||
        lowerQuery.includes('what are') ||
        lowerQuery.includes('give me') ||
        lowerQuery.includes('overview') ||
        lowerQuery.includes('report');

      const prompt = `You are a helper for a Real Estate Properties UI. Convert this natural language search query into structured filters.
      
USER QUERY: "${query}"

PROPERTY CONTEXT (Use this to answer summaries or deep questions):
${propertyList || 'No properties currently in database.'}

MARKET CONTEXT:
You have access to Google Search. You MUST use it to answer general market questions with real-time data.

AVAILABLE FILTERS:
- status: 'all', 'active', 'under_contract', 'sold', 'withdrawn'
- type: 'all', 'residential', 'commercial', 'land'
- priceMax: number (if user mentions a budget or price limit)
- keywords: string (any suburb names, street names, features like "pool", or other text to search for). Use empty string "" if no specific keywords.

RULES:
1. Map "for sale", "available", "current" -> status='active'.
2. Map "under offer", "pending" -> status='under_contract'.
3. Map "finished", "gone" -> status='sold'.
4. Map "homes", "houses" -> type='residential'.
5. Map "offices", "retail" -> type='commercial'.
6. Map "sections", "bareland" -> type='land'.
7. Extract locations (e.g. "Auckland", "Ponsonby"), features ("3 bedrooms"), or other specific terms to 'keywords'.
8. If the user asks for "stale" or "old", set status='active' and keywords='stale'.
9. If the user asks for "hot" or "popular", set status='active' and keywords='hot'.
10. Provide an "aiInsight" (max 20 words) explaining who you've filtered for (e.g., "Filtering for active residential listings in Ponsonby under $2M").
11. ${isSummaryQuery ? 'THIS IS A SUMMARY/ANALYSIS QUERY. You MUST provide a richResponse.' : 'If the user asks a deep question (e.g., "Summarize...", "What is the momentum..."), provide a richResponse.'}
    RULES FOR richResponse:
    - Use bullet points, bold text, and brief tables.
    - Be professional, punchy, and data-driven.
    - Focus on performance, sentiment, and suggested next steps.
    - Max 150 words.
    - AUTO-CITATION: The system will automatically cite sources. Do not add a 'Sources' section manually.
    - If it's a simple filter query and NOT a summary request, set richResponse to null.

Respond in JSON format:
{
  "status": "...",
  "type": "...",
  "priceMax": null,
  "keywords": "",
  "aiInsight": "...",
  "richResponse": "markdown here or null"
}`;

      if (!this.apiKey && !process.env.GEMINI_API_KEY) {
        return { status: 'all', type: 'all', keywords: query };
      }

      console.log(`[Ask Zena] Parsing property search: "${query}" (isSummaryQuery: ${isSummaryQuery})`);

      // Use askBrain with jsonMode for reliable JSON output
      const response = await this.askBrain(prompt, { jsonMode: true });

      try {
        const parsed = JSON.parse(response);
        return {
          status: parsed.status || 'all',
          type: parsed.type || 'all',
          priceMax: parsed.priceMax || undefined,
          keywords: parsed.keywords ?? '',
          aiInsight: parsed.aiInsight || '',
          richResponse: parsed.richResponse || undefined
        };
      } catch (parseError) {
        console.error('Error parsing property search query:', parseError);
      }

      return { status: 'all', type: 'all', keywords: query };
    } catch (error) {
      console.error('Error parsing property search query:', error);
      return { status: 'all', type: 'all', keywords: query };
    }
  }

  /**
   * Parse natural language search query into structured filters
   */
  async parseSearchQuery(
    userId: string,
    query: string
  ): Promise<{
    role: string;
    category: string;
    dealStage: string;
    keywords: string;
    aiInsight?: string;
  }> {
    try {
      const prompt = `You are a helper for a CRM UI. Convert this natural language search query into structured filters.
      
USER QUERY: "${query}"

AVAILABLE FILTERS:
- role: 'all', 'vendor', 'buyer', 'appraisal', 'investor', 'agent', 'lawyer', 'tradesperson'
- category: 'all', 'HOT_LEAD', 'HIGH_INTENT' (urgent/active), 'COLD_NURTURE' (long term/passive), 'PULSE' (general)
- dealStage: 'all', 'lead', 'qualified', 'viewing', 'offer', 'conditional', 'sold', 'settled', 'nurture'
- keywords: string (any names, locations, property addresses, or other text to search for)

RULES:
1. Map "selling", "sellers" -> role='vendor'.
2. Map "buying", "looking" -> role='buyer'.
3. Map "hot", "on fire" -> category='HOT_LEAD'.
4. Map "asap", "urgent", "active", "ready" -> category='HIGH_INTENT'.
5. Map "cold", "old", "lost" -> category='COLD_NURTURE'.
6. Map "offer", "negotiating", "contract" -> dealStage='offer'.
7. Map "viewing", "showings" -> dealStage='viewing'.
8. Extract locations (e.g. "Ponsonby"), names, or other specific terms to 'keywords'.
10. Provide an "aiInsight" (max 20 words) explaining who you've filtered for (e.g., "Filtering for active buyers in Ponsonby with high intent scores").

Respond in JSON:
{
  "role": "...",
  "category": "...",
  "dealStage": "...",
  "keywords": "...",
  "aiInsight": "..."
}`;

      if (!this.apiKey && !process.env.GEMINI_API_KEY) {
        return { role: 'all', category: 'all', dealStage: 'all', keywords: query };
      }

      const response = await this.callLLM(prompt);

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            role: parsed.role || 'all',
            category: parsed.category || 'all',
            dealStage: parsed.dealStage || 'all',
            keywords: parsed.keywords || '',
            aiInsight: parsed.aiInsight || ''
          };
        }
      } catch (parseError) {
        console.error('Error parsing search query:', parseError);
      }

      return { role: 'all', category: 'all', dealStage: 'all', keywords: query };
    } catch (error) {
      console.error('Error parsing search query:', error);
      return { role: 'all', category: 'all', dealStage: 'all', keywords: query };
    }
  }

  /**
   * Fallback improvement actions when LLM is unavailable
   */
  private generateFallbackImprovementActions(contact: {
    name: string;
    role: string;
    engagementScore: number;
  }): {
    tips: string[];
    bestAction: { type: 'email' | 'call' | 'task'; description: string; emailDraft?: { subject: string; body: string } };
    explanation: string;
  } {
    const firstName = contact.name.split(' ')[0];
    const tips = contact.role === 'buyer'
      ? ['Send new listings matching their criteria', 'Invite to upcoming open homes', 'Share market insights for preferred suburbs']
      : contact.role === 'vendor'
        ? ['Provide campaign update', 'Share buyer feedback', 'Send comparable sales data']
        : ['Schedule a check-in call', 'Add to newsletter', 'Complete profile information'];

    return {
      tips,
      bestAction: {
        type: 'email',
        description: `Send a personalized check-in to ${firstName}`,
        emailDraft: {
          subject: `Quick update for you`,
          body: `Hi ${firstName},\n\nI wanted to touch base and see how things are going. I've been keeping an eye out for opportunities that might interest you.\n\nWould you be available for a quick chat this week?\n\nBest regards`
        }
      },
      explanation: contact.engagementScore > 70
        ? 'Strong engagement - maintain momentum with regular touchpoints.'
        : contact.engagementScore > 40
          ? 'Moderate engagement - could benefit from more frequent communication.'
          : 'Low engagement - needs proactive outreach to re-engage.'
    };
  }

  /**
   * Record that an agent took an AI-suggested improvement action
   * This provides feedback to the brain and boosts momentum
   */
  async recordActionExecution(
    userId: string,
    contactId: string,
    actionType: string,
    description: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Log the activity
      await prisma.timelineEvent.create({
        data: {
          userId,
          type: actionType === 'email' ? 'email' : (actionType === 'call' ? 'call' : 'task'),
          entityType: 'contact',
          entityId: contactId,
          summary: `Zena Action Executed: ${description}`,
          timestamp: new Date()
        }
      });

      // 2. Fetch current engagement to boost it
      const contact = await prisma.contact.findUnique({
        where: { id: contactId }
      });

      if (contact) {
        // Boost momentum (+15%) for taking action
        const stats = await this.calculateContactEngagement(contactId);
        const boostedMomentum = Math.min(100, (stats.momentum || 0) + 15);
        const boostedScore = Math.min(100, (stats.engagementScore || 0) + 5);

        // 3. Broadcast new stats via WebSocket so UI updates immediately
        websocketService.broadcastContactEngagement(userId, {
          contactId,
          engagementScore: boostedScore,
          momentum: boostedMomentum,
          dealStage: stats.dealStage,
          nextBestAction: 'Keep up the momentum!'
        });
      }

      return { success: true, message: 'Action recorded and momentum boosted' };
    } catch (error) {
      console.error('Error recording action execution:', error);
      throw error;
    }
  }

  /**
   * Run a deep intelligence discovery process for a contact
   * This is used for new or stale contacts to populate Zena's real memory
   */
  async runDiscovery(userId: string, contactId: string): Promise<{ success: boolean; data: any }> {
    try {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        include: {
          deals: true
        }
      });

      if (!contact) {
        throw new Error('Contact not found');
      }

      console.log(`[Ask Zena] Running discovery for ${contact.name}...`);

      // Notify client that Zena is researching
      websocketService.broadcastDiscoveryStatus(userId, {
        contactId,
        contactName: contact.name,
        status: 'started',
        message: `Zena is performing neural research on ${contact.name}...`
      });

      // 1. Recategorize using the categorization service
      const categorization = await contactCategorizationService.categorizeContact(contactId);

      // 2. Refresh engagement stats
      const engagement = await this.calculateContactEngagement(contactId);

      // 3. Token Efficiency Check: Is this analysis still "fresh"?
      // Window: 24 hours AND no new activities since last categorized
      const FRESHNESS_WINDOW_MS = 24 * 60 * 60 * 1000;
      const isFresh = contact.categorizedAt &&
        (Date.now() - contact.categorizedAt.getTime() < FRESHNESS_WINDOW_MS);

      let snippet = contact.intelligenceSnippet;

      // Fetch timeline events separately (uses entityType/entityId pattern)
      const recentActivities = await prisma.timelineEvent.findMany({
        where: {
          entityType: 'contact',
          entityId: contactId
        },
        orderBy: { timestamp: 'desc' },
        take: 10
      });

      // Check if any major activity happened AFTER categorization
      const hasNewMajorActivity = recentActivities.some(event =>
        contact.categorizedAt && event.timestamp > contact.categorizedAt
      );

      if (recentActivities.length > 0 && (!isFresh || hasNewMajorActivity || !snippet)) {
        console.log(`[Ask Zena] Analysis ${isFresh ? 'stale or new activity found' : 'missing'}. Brain-summarizing ${recentActivities.length} activities for ${contact.name}...`);

        try {
          // Pulse 1: Intelligence Snippet
          const prompt = `
            Analyze the following recent activities for contact "${contact.name}" (${contact.role}).
            Generate a CONCISE, 1-sentence "Intelligence Pulse" (max 15 words).
            Focus on intent, sentiment, or the next logical step. 
            Format: Zena Pulse: [Your insight]
            
            Activities:
            ${recentActivities.map(e => `- ${e.timestamp}: ${e.summary}`).join('\n')}
          `;

          const geminiApiKey = process.env.GEMINI_API_KEY;
          if (geminiApiKey) {
            const brainResponse = await this.callGemini(prompt, [], geminiApiKey);
            const parsed = this.safeParseJSON(brainResponse);

            // Extract content from various potential keys
            snippet = parsed.intelligence_pulse || parsed.response || parsed.text || parsed.insight ||
              (typeof parsed === 'string' ? parsed : brainResponse);

            if (typeof snippet === 'string') {
              snippet = snippet.replace(/^Zena Pulse: /i, '').trim();
            }

            // Pulse 2: Neural Narrative (Reasoning) for Engagement Score
            const reasoningPrompt = `
              Briefly justify the engagement score of ${engagement.engagementScore}/100 for ${contact.name}.
              Recent Activities: ${recentActivities.length} in 7 days.
              Deal Stage: ${engagement.dealStage || 'Unknown'}.
              
              Generate a CONCISE justification (max 12 words).
              Format: Reasoning: [Your reasoning]
            `;
            const reasoningResponse = await this.callGemini(reasoningPrompt, [], geminiApiKey);
            const reasoningParsed = this.safeParseJSON(reasoningResponse);

            let reasoning = reasoningParsed.Reasoning || reasoningParsed.reasoning ||
              reasoningParsed.justification || reasoningParsed.response ||
              reasoningParsed.text || (typeof reasoningParsed === 'string' ? reasoningParsed : reasoningResponse);

            if (typeof reasoning === 'string') {
              reasoning = reasoning.replace(/^Reasoning: /i, '').trim();
            }

            await prisma.contact.update({
              where: { id: contactId },
              data: {
                intelligenceSnippet: snippet,
                engagementReasoning: reasoning
              }
            });
            // Update the engagement object so the return reflects the new reasoning
            engagement.reasoning = reasoning;
          } else {
            snippet = `Zena analyzed ${recentActivities.length} activities. Current focus: ${categorization.reason}`;
            await prisma.contact.update({
              where: { id: contactId },
              data: { intelligenceSnippet: snippet }
            });
          }
        } catch (err) {
          console.warn('[Ask Zena] Gemini discovery failed, using heuristic:', err);
          snippet = `Zena analyzed ${recentActivities.length} activities. Current focus: ${categorization.reason}`;
          await prisma.contact.update({
            where: { id: contactId },
            data: { intelligenceSnippet: snippet }
          });
        }
      }

      // Notify client that research is complete
      websocketService.broadcastDiscoveryStatus(userId, {
        contactId,
        status: 'completed',
        message: `Intelligence discovery complete for ${contact.name}`,
        payload: {
          category: categorization.category,
          engagementScore: engagement.engagementScore,
          engagementReasoning: engagement.reasoning,
          intelligenceSnippet: snippet
        }
      });

      return {
        success: true,
        data: {
          category: categorization.category,
          engagementScore: engagement.engagementScore,
          engagementReasoning: engagement.reasoning,
          momentum: engagement.momentum,
          intelligenceSnippet: snippet
        }
      };
    } catch (error) {
      console.error('Error running discovery:', error);

      // Notify client of failure
      websocketService.broadcastDiscoveryStatus(userId, {
        contactId,
        status: 'failed',
        message: `Zena hit a neural block while researching this record`
      });

      throw error;
    }
  }

  /**
   * Calculate engagement signals for a contact
   * This replaces the frontend mock data with real backend calculations
   */
  async calculateContactEngagement(contactId: string): Promise<any> {
    return neuralScorerService.calculateEngagement(contactId);
  }

  /**
   * Proactively scan the database to find the absolute #1 recommendation
   */
  /**
   * Proactively scan the database to find the absolute #1 recommendation
   */
  async getProactiveRecommendation(userId: string): Promise<any> {
    try {
      // 1. Fetch potential candidates
      // We look for Hot Leads, High Intent, OR high engagement scores (>80), OR high momentum (>30%)
      const candidates = await prisma.contact.findMany({
        where: {
          userId,
          OR: [
            { zenaCategory: 'HOT_LEAD' },
            { zenaCategory: 'HIGH_INTENT' },
            { lastActivityAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // Recent activity
          ]
        },
        include: { prediction: true },
        orderBy: { lastActivityAt: 'desc' },
        take: 20
      });

      if (candidates.length === 0) {
        return {
          label: "Database Growth",
          action: "Zena is scanning for patterns. Add more interactions or notes to help me find your next opportunity.",
          icon: "Shield"
        };
      }

      // 2. Score and Rank Candidates
      const analyzedCandidates = await Promise.all(candidates.map(async (contact) => {
        const stats = await this.calculateContactEngagement(contact.id);
        const prediction = contact.prediction;

        let priority = 0;
        let reason = '';
        let icon = 'Sparkles';

        // Tie-breaker and priority logic
        if (contact.zenaCategory === 'HIGH_INTENT') {
          priority += 50;
          reason = 'Active opportunity detected';
        }

        if (prediction?.sellProbability && prediction.sellProbability > 0.7) {
          priority += 40;
          if (!reason) reason = 'High sell propensity';
          icon = 'TrendingUp';
        }

        if (stats.momentum > 40) {
          priority += 30;
          if (!reason) reason = 'Surging momentum';
          icon = 'Zap';
        }

        if (prediction?.maturityLevel === 2) { // Just reached Profiling
          priority += 25;
          if (!reason) reason = 'New personality insights available';
          icon = 'Zap';
        }

        if (stats.engagementScore > 90) {
          priority += 20;
          if (!reason) reason = 'High engagement level';
        }

        // --- RELATIONAL COMPATIBILITY (Personality-Aware Prioritization) ---
        if (prediction?.personalityType === 'D' && stats.daysSinceActivity >= 3) {
          // Dominance types value speed and efficiency
          priority += 35;
          reason = 'Urgent: Follow up with high-D contact';
          icon = 'AlertCircle';
        } else if (prediction?.personalityType === 'I' && stats.momentum < 0) {
          // Influence types value regular personal touch
          priority += 30;
          reason = 'Relationship Warmup Required';
          icon = 'Users';
        } else if (prediction?.personalityType === 'S' && stats.daysSinceActivity > 14) {
          // Steadiness types value consistency and predictability
          priority += 25;
          reason = 'Routine Nurture Check-in';
          icon = 'Calendar';
        }

        return { contact, stats, prediction, priority, reason, icon };
      }));

      // Sort by priority
      analyzedCandidates.sort((a, b) => b.priority - a.priority);
      const top = analyzedCandidates[0];

      if (top.priority < 10) {
        // Fallback for low priority matches
        const activeCount = candidates.length;
        return {
          label: "Market Outlook",
          action: `You have ${activeCount} active contacts in your database. Zena is watching for high-priority shifts.`,
          icon: "Shield"
        };
      }

      const topContact = top.contact;
      let action = `${top.reason}! ${topContact.name} is showing strong signals. Recommendation: ${top.stats.nextBestAction}.`;

      // Add Personality Style Tip if available
      if (top.prediction?.personalityType) {
        const tips: Record<string, string> = {
          'D': 'Be direct, focus on results, and keep it under 2 minutes.',
          'I': 'Include a personal touch and focus on the relationship.',
          'S': 'Be patient, reassuring, and provide clear context.',
          'C': 'Provide data, be precise, and avoid over-explaining.'
        };
        const tip = tips[top.prediction.personalityType as string] || 'Adjust style based on relationship history.';
        action += ` Personality Strategy: ${tip}`;
      }

      return {
        contact: {
          id: topContact.id,
          name: topContact.name,
          engagementScore: top.stats.engagementScore,
          emails: topContact.emails,
          role: topContact.role
        },
        label: top.priority > 40 ? "Strategic Opportunity" : "Engagement Required",
        action,
        icon: top.icon,
        oracleData: top.prediction ? {
          personalityType: top.prediction.personalityType,
          sellProbability: top.prediction.sellProbability,
          maturityLevel: top.prediction.maturityLevel
        } : null
      };
    } catch (error) {
      console.error('Error getting proactive recommendation:', error);
      return {
        label: "System Analytics",
        action: "Zena is crunching latest data. Check back shortly for fresh recommendations.",
        icon: "Shield"
      };
    }
  }

  /**
   * Suggest batch tags for a set of contacts using AI analysis
   */
  async suggestBatchTags(contactIds: string[]): Promise<{
    suggestions: Array<{
      contactId: string;
      suggestedRole: string;
      suggestedCategory: string;
      confidence: number;
      reason: string;
    }>;
    commonThemes: string[];
  }> {
    try {
      // Fetch contacts
      const contacts = await prisma.contact.findMany({
        where: { id: { in: contactIds } },
        select: {
          id: true,
          name: true,
          emails: true,
          role: true,
          intelligenceSnippet: true,
          zenaCategory: true,
          relationshipNotes: true
        }
      });

      if (contacts.length === 0) {
        return { suggestions: [], commonThemes: [] };
      }

      // Build prompt for AI analysis
      const contactSummaries = contacts.map(c => {
        const email = c.emails?.[0] || '';
        const domain = email.split('@')[1] || '';
        return `- ${c.name} (${email}): Current role: ${c.role || 'unknown'}, Category: ${c.zenaCategory || 'none'}, Intel: ${c.intelligenceSnippet || 'none'}`;
      }).join('\n');

      const prompt = `Analyze these ${contacts.length} contacts and suggest appropriate roles and categories for each.

CONTACTS:
${contactSummaries}

AVAILABLE ROLES: buyer, vendor, agent, investor, tradesperson, market, other
AVAILABLE CATEGORIES: HOT_LEAD, COLD_NURTURE, HIGH_INTENT, PULSE

For each contact, suggest the most appropriate role and category based on:
- Email domain (e.g., @raywhite.co.nz = agent, @builder.co.nz = tradesperson)
- Name patterns
- Any existing intelligence

Respond in JSON format:
{
  "suggestions": [
    { "contactId": "id", "suggestedRole": "role", "suggestedCategory": "category", "confidence": 0.0-1.0, "reason": "brief reason" }
  ],
  "commonThemes": ["theme1", "theme2"]
}`;

      const response = await this.callLLM(prompt);

      try {
        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.warn('Failed to parse AI suggestions, using heuristics');
      }

      // Fallback to heuristic-based suggestions
      const suggestions = contacts.map(c => {
        const email = c.emails?.[0] || '';
        const domain = email.split('@')[1] || '';

        let suggestedRole = c.role || 'other';
        let confidence = 0.5;
        let reason = 'Based on existing data';

        // Email domain heuristics
        if (domain.includes('raywhite') || domain.includes('harcourts') || domain.includes('bayleys') || domain.includes('barfoot')) {
          suggestedRole = 'agent';
          confidence = 0.9;
          reason = 'Real estate agency email domain';
        } else if (domain.includes('builder') || domain.includes('plumb') || domain.includes('electric') || domain.includes('roof')) {
          suggestedRole = 'tradesperson';
          confidence = 0.85;
          reason = 'Trade-related email domain';
        } else if (domain.includes('invest') || domain.includes('capital') || domain.includes('property')) {
          suggestedRole = 'investor';
          confidence = 0.7;
          reason = 'Investment-related email domain';
        }

        return {
          contactId: c.id,
          suggestedRole,
          suggestedCategory: c.zenaCategory || 'PULSE',
          confidence,
          reason
        };
      });

      return { suggestions, commonThemes: ['Mixed contact types'] };
    } catch (error) {
      console.error('Error suggesting batch tags:', error);
      return { suggestions: [], commonThemes: [] };
    }
  }

  /**
   * Predict contact type based on email domain and name patterns
   */
  async predictContactType(email?: string, name?: string): Promise<{
    suggestedRole: string;
    suggestedCategory: string;
    confidence: number;
    reason: string;
    intelligenceHint?: string;
  }> {
    try {
      let suggestedRole = 'other';
      let suggestedCategory = 'PULSE';
      let confidence = 0.3;
      let reason = 'Default classification';
      let intelligenceHint: string | undefined;

      if (email) {
        const domain = email.split('@')[1]?.toLowerCase() || '';

        // Real estate agency domains
        if (domain.includes('raywhite') || domain.includes('harcourts') || domain.includes('bayleys') ||
          domain.includes('barfoot') || domain.includes('lj.hooker') || domain.includes('professionals') ||
          domain.includes('sothebys') || domain.includes('remax')) {
          suggestedRole = 'agent';
          suggestedCategory = 'PULSE';
          confidence = 0.95;
          reason = 'Real estate agency email domain detected';
          intelligenceHint = 'Fellow real estate professional - potential for referrals and collaboration';
        }
        // Tradesperson domains
        else if (domain.includes('builder') || domain.includes('plumb') || domain.includes('electric') ||
          domain.includes('roof') || domain.includes('carpet') || domain.includes('paint') ||
          domain.includes('landscape') || domain.includes('clean')) {
          suggestedRole = 'tradesperson';
          suggestedCategory = 'PULSE';
          confidence = 0.85;
          reason = 'Trade-related email domain detected';
          intelligenceHint = 'Potential trade partner for property repairs and staging';
        }
        // Investment/corporate domains
        else if (domain.includes('invest') || domain.includes('capital') || domain.includes('fund') ||
          domain.includes('property') || domain.includes('holdings')) {
          suggestedRole = 'investor';
          suggestedCategory = 'HIGH_INTENT';
          confidence = 0.75;
          reason = 'Investment-related email domain detected';
          intelligenceHint = 'Likely looking for investment properties - high value potential';
        }
        // Personal email - likely buyer/vendor
        else if (domain.includes('gmail') || domain.includes('hotmail') || domain.includes('outlook') ||
          domain.includes('yahoo') || domain.includes('icloud')) {
          suggestedRole = 'buyer';
          suggestedCategory = 'PULSE';
          confidence = 0.5;
          reason = 'Personal email suggests individual client';
          intelligenceHint = 'New lead - needs qualification call to determine buying or selling intent';
        }
      }

      // Name pattern analysis
      if (name) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('builder') || lowerName.includes('plumbing') || lowerName.includes('electric')) {
          suggestedRole = 'tradesperson';
          confidence = Math.max(confidence, 0.7);
          reason = 'Business name indicates trade professional';
        } else if (lowerName.includes('property') || lowerName.includes('invest') || lowerName.includes('holdings')) {
          suggestedRole = 'investor';
          confidence = Math.max(confidence, 0.65);
          reason = 'Business/company name pattern detected';
        }
      }

      return {
        suggestedRole,
        suggestedCategory,
        confidence,
        reason,
        intelligenceHint
      };
    } catch (error) {
      console.error('Error predicting contact type:', error);
      return {
        suggestedRole: 'other',
        suggestedCategory: 'PULSE',
        confidence: 0.1,
        reason: 'Unable to analyze - using defaults'
      };
    }
  }
  /**
   * Parse property details from raw text/URL
   * This powers the "Magic Entry" feature
   */
  async parsePropertyDetails(userId: string, text: string): Promise<any> {
    try {
      const prompt = `You are Zena, a world-class real estate AI. Parse the following real estate listing text (which might be raw copy-paste or a URL summary) into high-fidelity structured JSON.
      
      TEXT:
      "${text.substring(0, 2000)}"
      
      EXTRACT:
      - Address: EXTRACT THE COMPLETE ADDRESS (Mandatory: Full street number, unit/flat number if present, street name, suburb, city). Do not truncate or simplify.
      - Type (residential, commercial, land)
      - Listing Price (number)
      - Bedrooms (number)
      - Bathrooms (number)
      - Land Size (number in m2)
      - Rateable Value (RV) (number)
      - Description (Highly professional summary, max 300 chars)
      - Vendor details if present (name, email, phone)

      IMPORTANT: If it's a unit or apartment like "3/270 Sunset Road", ensure the "/3" or "3/" numbering is NOT missed.

      Response JSON:
      {
        "address": "string",
        "type": "residential|commercial|land",
        "listingPrice": number | null,
        "bedrooms": number | default 3,
        "bathrooms": number | default 1,
        "landSize": number | null,
        "rateableValue": number | null,
        "description": "string",
        "vendor": {
            "firstName": "string | null",
            "lastName": "string | null",
            "email": "string | null",
            "phone": "string | null"
        }
      }
      `;

      if (!this.apiKey && !process.env.GEMINI_API_KEY) {
        // Mock response for dev without keys
        return {
          address: "Parsed Address Demo",
          type: "residential",
          listingPrice: 1000000,
          bedrooms: 3,
          bathrooms: 2,
          description: "AI extraction unavailable. Mock data.",
          vendor: {}
        };
      }

      const response = await this.callLLM(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("Failed to parse JSON");

    } catch (error) {
      console.error('Error parsing property details:', error);
      throw error;
    }
  }

}

export const askZenaService = new AskZenaService();
