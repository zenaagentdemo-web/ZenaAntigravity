import { PrismaClient } from '@prisma/client';
import { searchService } from './search.service.js';
import { websocketService } from './websocket.service.js';
import { contactCategorizationService } from './contact-categorization.service.js';
import { decodeHTMLEntities } from '../utils/text-utils.js';

const prisma = new PrismaClient();

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
    console.log('[AskZenaService] GEMINI_MODEL:', process.env.GEMINI_MODEL || 'gemini-3-flash');

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
        context = await this.retrieveContext(query.userId, searchTerms);
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
      const context = await this.retrieveContext(query.userId, searchTerms);

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
  private async retrieveContext(userId: string, searchTerms: string[]): Promise<SearchContext> {
    try {
      // For general queries, also fetch some recent data even if search terms don't match
      const isGeneralQuery = searchTerms.some(term =>
        ['buyer', 'buyers', 'contact', 'contacts', 'property', 'properties', 'deal', 'deals', 'task', 'tasks'].includes(term)
      );

      // Detection for past conversation intent
      const historyKeywords = ['chat', 'conversation', 'talked', 'said', 'mentioned', 'asked', 'history', 'past', 'remember', 'discussed'];
      const queryLower = searchTerms.join(' ').toLowerCase();
      const isHistoryQuery = historyKeywords.some(keyword => queryLower.includes(keyword)) ||
        /what did (we|i) (say|ask|talk|discuss|mention)/i.test(queryLower);

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

      // Search timeline events
      const timelineEvents = await prisma.timelineEvent.findMany({
        where: {
          userId,
          OR: searchTerms.length > 0 ? [
            { summary: { contains: searchTerms.join(' '), mode: 'insensitive' as const } },
            { content: { contains: searchTerms.join(' '), mode: 'insensitive' as const } },
          ] : undefined,
        },
        take: 10,
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
          answer: "I'm currently hitting a temporary usage limit from Google (429 Quota Exceeded). \n\n**To fix this**: Please ensure your Google Cloud account is 'Activated' or upgraded beyond the Free Tier. Since you have $500+ in credits, this will unlock my brain without charging your card!",
          sources: [],
          suggestedActions: ["Check Google Cloud Billing"]
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
      1. Merge split words (e.g. "ele pha nts" -> "elephants", "He llo" -> "Hello").
      2. Add missing spaces (e.g. "Helloworld" -> "Hello world").
      3. Fix spacing around numbers/symbols if they look like artifacts.
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

    return `You are Zena, a highly intelligent and efficient AI assistant for a real estate agent.
Your tone is professional, punchy, and helpful. Be concise.

Agent's Question: ${query.query}

Data Context:
${contextSummary}

5. If the user wants to draft an email or you have generated an email draft in your response, ALWAYS include "draft_email" in the suggestedActions array.
6. If the user wants to schedule something, include "add_calendar".
7. If the user wants a report, include "generate_report".

Response must be valid JSON:
{
  "answer": "Your concise markdown response here",
  "suggestedActions": ["draft_email", "add_calendar", "generate_report"] // Only include relevant ones
}`;
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
   * Call Google Gemini API
   */
  private async callGemini(prompt: string, conversationHistory?: ConversationMessage[], apiKey?: string, attachments?: any[]): Promise<string> {
    const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Build conversation contents for Gemini format
    const contents: Array<{ role: string; parts: Array<any> }> = [];

    // Add system instruction as first user message
    contents.push({
      role: 'user',
      parts: [{ text: 'You are Zena, an extremely vibrant, witty (11/10), and professional AI companion serving the New Zealand (NZ) real estate market. Use UK English spelling and Metric units. NO PET NAMES (no "darling", etc.). You are bold, fun, and memorable. PROVIDE CONCISE, ACTIONABLE RESPONSES. You MUST respond in JSON format as specified.' }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Greetings. I\'m Zena. I\'m ready to help you dominate the market. What do you need?' }]
    });

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
        temperature: 0.2, // Lower temperature for more consistent JSON and conciseness
        maxOutputTokens: 2048,
        response_mime_type: 'application/json',
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
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
   * NOW ENHANCED WITH ORACLE PERSONALITY DETECTION
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
    draftType: 'quick' | 'detailed' = 'quick'
  ): Promise<{ subject: string; body: string }> {
    try {
      const isGroupEmail = contacts.length > 1;

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

      const prompt = `You are Zena, a highly intelligent AI assistant for a New Zealand real estate agent. Generate a ${draftType === 'detailed' ? 'comprehensive, value-rich' : 'concise and punchy'} email draft.

RECIPIENTS (${contacts.length}):
${contactContext}

${isGroupEmail ? 'This is a GROUP email to multiple contacts.' : 'This is a PERSONAL email to one contact.'}
${personalityPromptAddition}

REQUIREMENTS:
1. ${draftType === 'detailed' ?
          'Write a detailed email with market insights, actionable advice, and personalized recommendations. Include sections with emoji headers like 📊 and 💡.' :
          'Write a brief, friendly email that gets straight to the point. 3-4 short paragraphs max.'}
2. Use UK English spelling (NZ market)
3. Be professional yet warm - no pet names
4. Reference their specific situation based on the intelligence provided
5. Include a clear call-to-action

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
9. Default to 'all' if unspecified.

Respond in JSON:
{
  "role": "...",
  "category": "...",
  "dealStage": "...",
  "keywords": "..."
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
            keywords: parsed.keywords || ''
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
          deals: true,
          timelineEvents: { take: 10, orderBy: { timestamp: 'desc' } }
        }
      });

      if (!contact) {
        throw new Error('Contact not found');
      }

      console.log(`[Ask Zena] Running discovery for ${contact.name}...`);

      // 1. Recategorize using the categorization service
      const categorization = await contactCategorizationService.categorizeContact(contactId);

      // 2. Refresh engagement stats
      const engagement = await this.calculateContactEngagement(contactId);

      // 3. Generate a fresh intelligence snippet using Gemini
      // If we have events, summarize them with the brain
      let snippet = contact.intelligenceSnippet;
      const recentActivities = contact.timelineEvents || [];

      if (recentActivities.length > 0) {
        console.log(`[Ask Zena] Brain-summarizing ${recentActivities.length} activities for ${contact.name}...`);

        try {
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
            const parsed = JSON.parse(brainResponse);
            snippet = parsed.response || parsed.text || brainResponse;
            // Clean up JSON artifacts if Gemini returned raw string
            if (typeof snippet === 'string') {
              snippet = snippet.replace(/^Zena Pulse: /i, '').trim();
            }
          } else {
            snippet = `Zena analyzed ${recentActivities.length} activities. Current focus: ${categorization.reason}`;
          }
        } catch (err) {
          console.warn('[Ask Zena] Gemini discovery failed, using heuristic:', err);
          snippet = `Zena analyzed ${recentActivities.length} activities. Current focus: ${categorization.reason}`;
        }

        await prisma.contact.update({
          where: { id: contactId },
          data: { intelligenceSnippet: snippet }
        });
      }

      return {
        success: true,
        data: {
          category: categorization.category,
          engagementScore: engagement.engagementScore,
          momentum: engagement.momentum,
          intelligenceSnippet: snippet
        }
      };
    } catch (error) {
      console.error('Error running discovery:', error);
      throw error;
    }
  }

  /**
   * Calculate engagement signals for a contact
   * This replaces the frontend mock data with real backend calculations
   */
  async calculateContactEngagement(contactId: string): Promise<{
    engagementScore: number;
    momentum: number;
    dealStage: string | null;
    activityCount7d: number;
    nextBestAction: string;
  }> {
    try {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
      });

      if (!contact) {
        throw new Error('Contact not found');
      }

      // Get recent timeline events
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const recentEvents = await prisma.timelineEvent.findMany({
        where: {
          entityType: 'contact',
          entityId: contactId,
          timestamp: { gte: fourteenDaysAgo }
        },
        orderBy: { timestamp: 'desc' }
      });

      const events7d = recentEvents.filter(e => e.timestamp >= sevenDaysAgo).length;
      const events14d = recentEvents.length;
      const eventsPrevWeek = events14d - events7d;

      // Get associated deals
      const deals = await prisma.deal.findMany({
        where: {
          contacts: { some: { id: contactId } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 1
      });

      const dealStage = deals[0]?.stage || null;

      // Calculate engagement score (0-100)
      let score = 0;

      // Profile completeness (20 points)
      if (contact.name) score += 5;
      if (contact.emails.length > 0) score += 8;
      if (contact.phones.length > 0) score += 5;
      if (contact.role && contact.role !== 'other') score += 2;

      // Recent activity (30 points)
      score += Math.min(30, events7d * 6);

      // Engagement depth (25 points) - based on relationship notes
      const notes = (contact.relationshipNotes as any[]) || [];
      score += Math.min(25, notes.length * 5);

      // Deal stage bonus (25 points)
      if (dealStage === 'offer' || dealStage === 'conditional') score += 25;
      else if (dealStage === 'viewing') score += 20;
      else if (dealStage === 'qualified') score += 15;
      else if (dealStage === 'lead') score += 10;

      // Brain Intelligence Bonus (Up to 15 points)
      // Boost score if Zena has detected high intent or specific urgency in the intelligence snippet
      const intel = (contact.intelligenceSnippet || '').toLowerCase();
      if (intel.includes('asap') || intel.includes('high urgency') || intel.includes('ready to buy')) {
        score += 15;
      } else if (intel.includes('active') || intel.includes('searching')) {
        score += 8;
      }

      score = Math.min(100, score);

      // Calculate momentum
      let momentum = 0;
      if (eventsPrevWeek > 0) {
        momentum = Math.round(((events7d - eventsPrevWeek) / eventsPrevWeek) * 100);
      } else if (events7d > 0) {
        momentum = 50; // New activity from zero
      }
      momentum = Math.max(-100, Math.min(100, momentum));

      // Determine next best action
      let nextBestAction = 'Schedule a check-in call';
      if (events7d === 0) {
        nextBestAction = 'Send a touchpoint email - engagement dropping';
      } else if (contact.role === 'buyer' && dealStage === 'viewing') {
        nextBestAction = 'Follow up on recent viewings';
      } else if (contact.role === 'vendor') {
        nextBestAction = 'Provide campaign update';
      }

      return {
        engagementScore: score,
        momentum,
        dealStage,
        activityCount7d: events7d,
        nextBestAction
      };
    } catch (error) {
      console.error('Error calculating contact engagement:', error);
      return {
        engagementScore: 50,
        momentum: 0,
        dealStage: null,
        activityCount7d: 0,
        nextBestAction: 'Add more contact information'
      };
    }
  }

  /**
   * Proactively scan the database to find the absolute #1 recommendation
   */
  async getProactiveRecommendation(userId: string): Promise<any> {
    try {
      // 1. Fetch high-value contacts (Hot Leads or High Intent)
      const topCandidates = await prisma.contact.findMany({
        where: {
          userId,
          OR: [
            { zenaCategory: 'HOT_LEAD' },
            { zenaCategory: 'HIGH_INTENT' }
          ]
        },
        orderBy: { updatedAt: 'desc' },
        take: 5
      });

      if (topCandidates.length === 0) {
        return {
          label: "Market Outlook",
          action: "Continue building your database. Zena is watching for new opportunities.",
          icon: "Shield"
        };
      }

      // Pick the most recent hot candidate
      const topContact = topCandidates[0];
      const stats = await this.calculateContactEngagement(topContact.id);

      return {
        contact: {
          id: topContact.id,
          name: topContact.name,
          engagementScore: stats.engagementScore
        },
        label: topContact.zenaCategory === 'HIGH_INTENT' ? "Strategic Opportunity" : "Action Required",
        action: `High momentum spotted! ${topContact.name} is ${topContact.zenaCategory?.replace('_', ' ').toLowerCase()}. Recommendation: ${stats.nextBestAction}.`,
        icon: topContact.zenaCategory === 'HIGH_INTENT' ? "Sparkles" : "TrendingUp"
      };
    } catch (error) {
      console.error('Error getting proactive recommendation:', error);
      return null;
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
}

export const askZenaService = new AskZenaService();
