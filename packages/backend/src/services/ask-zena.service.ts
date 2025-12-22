import { PrismaClient } from '@prisma/client';
import { searchService } from './search.service.js';
import { websocketService } from './websocket.service.js';
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
}

export const askZenaService = new AskZenaService();
