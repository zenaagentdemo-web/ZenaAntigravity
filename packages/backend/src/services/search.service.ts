import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SearchResult {
  type: 'deal' | 'contact' | 'property' | 'thread';
  id: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SearchOptions {
  query: string;
  userId: string;
  types?: ('deal' | 'contact' | 'property' | 'thread')[];
  limit?: number;
}

/**
 * Search service that queries across deals, contacts, properties, and threads
 * with relevance and recency ranking
 */
export class SearchService {
  /**
   * Perform a comprehensive search across all entity types
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { query, userId, types, limit = 50 } = options;
    
    // Default to searching all types if none specified
    const searchTypes = types || ['deal', 'contact', 'property', 'thread'];
    
    const results: SearchResult[] = [];
    
    // Search each entity type in parallel
    const searchPromises = [];
    
    if (searchTypes.includes('deal')) {
      searchPromises.push(this.searchDeals(query, userId));
    }
    
    if (searchTypes.includes('contact')) {
      searchPromises.push(this.searchContacts(query, userId));
    }
    
    if (searchTypes.includes('property')) {
      searchPromises.push(this.searchProperties(query, userId));
    }
    
    if (searchTypes.includes('thread')) {
      searchPromises.push(this.searchThreads(query, userId));
    }
    
    const allResults = await Promise.all(searchPromises);
    
    // Flatten and combine all results
    allResults.forEach(typeResults => {
      results.push(...typeResults);
    });
    
    // Sort by relevance and recency
    const rankedResults = this.rankResults(results, query);
    
    // Return top results up to limit
    return rankedResults.slice(0, limit);
  }
  
  /**
   * Search deals by summary, next action, and property address
   */
  private async searchDeals(query: string, userId: string): Promise<SearchResult[]> {
    const queryLower = query.toLowerCase();
    
    const deals = await prisma.deal.findMany({
      where: {
        userId,
        OR: [
          { summary: { contains: query, mode: 'insensitive' } },
          { nextAction: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        property: true,
        contacts: true,
      },
      take: 100,
    });
    
    return deals.map(deal => {
      const snippet = this.generateSnippet(deal.summary, query, 150);
      const relevanceScore = this.calculateRelevance(
        [deal.summary, deal.nextAction || '', deal.property?.address || ''],
        query
      );
      
      return {
        type: 'deal' as const,
        id: deal.id,
        title: `Deal: ${deal.property?.address || 'Unknown Property'} - ${deal.stage}`,
        snippet,
        relevanceScore,
        timestamp: deal.updatedAt,
        metadata: {
          stage: deal.stage,
          riskLevel: deal.riskLevel,
          propertyAddress: deal.property?.address,
          contactNames: deal.contacts.map(c => c.name),
        },
      };
    });
  }
  
  /**
   * Search contacts by name, email, and relationship notes
   */
  private async searchContacts(query: string, userId: string): Promise<SearchResult[]> {
    const queryLower = query.toLowerCase();
    
    const contacts = await prisma.contact.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { emails: { hasSome: [query] } },
        ],
      },
      include: {
        deals: {
          include: {
            property: true,
          },
        },
      },
      take: 100,
    });
    
    return contacts.map(contact => {
      const emailsText = contact.emails.join(', ');
      const notesText = contact.relationshipNotes
        .map((note: any) => note.content)
        .join(' ');
      
      const searchableText = [contact.name, emailsText, notesText].join(' ');
      const snippet = this.generateSnippet(searchableText, query, 150);
      const relevanceScore = this.calculateRelevance(
        [contact.name, emailsText, notesText],
        query
      );
      
      return {
        type: 'contact' as const,
        id: contact.id,
        title: `${contact.name} (${contact.role})`,
        snippet,
        relevanceScore,
        timestamp: contact.updatedAt,
        metadata: {
          role: contact.role,
          emails: contact.emails,
          dealCount: contact.deals.length,
          properties: contact.deals
            .map(d => d.property?.address)
            .filter(Boolean),
        },
      };
    });
  }
  
  /**
   * Search properties by address
   */
  private async searchProperties(query: string, userId: string): Promise<SearchResult[]> {
    const properties = await prisma.property.findMany({
      where: {
        userId,
        address: { contains: query, mode: 'insensitive' },
      },
      include: {
        vendors: true,
        buyers: true,
        threads: {
          orderBy: { lastMessageAt: 'desc' },
          take: 5,
        },
        deals: true,
      },
      take: 100,
    });
    
    return properties.map(property => {
      const vendorNames = property.vendors.map(v => v.name).join(', ');
      const buyerNames = property.buyers.map(b => b.name).join(', ');
      const searchableText = [
        property.address,
        vendorNames,
        buyerNames,
        property.riskOverview || '',
      ].join(' ');
      
      const snippet = this.generateSnippet(searchableText, query, 150);
      const relevanceScore = this.calculateRelevance(
        [property.address, vendorNames, buyerNames],
        query
      );
      
      return {
        type: 'property' as const,
        id: property.id,
        title: property.address,
        snippet,
        relevanceScore,
        timestamp: property.updatedAt,
        metadata: {
          vendorCount: property.vendors.length,
          buyerCount: property.buyers.length,
          threadCount: property.threads.length,
          dealCount: property.deals.length,
        },
      };
    });
  }
  
  /**
   * Search threads by subject, summary, and participants
   */
  private async searchThreads(query: string, userId: string): Promise<SearchResult[]> {
    const threads = await prisma.thread.findMany({
      where: {
        userId,
        OR: [
          { subject: { contains: query, mode: 'insensitive' } },
          { summary: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        property: true,
        deal: true,
      },
      take: 100,
    });
    
    return threads.map(thread => {
      const participants = (thread.participants as any[])
        .map(p => p.name || p.email)
        .join(', ');
      
      const searchableText = [
        thread.subject,
        thread.summary,
        participants,
      ].join(' ');
      
      const snippet = this.generateSnippet(searchableText, query, 150);
      const relevanceScore = this.calculateRelevance(
        [thread.subject, thread.summary, participants],
        query
      );
      
      return {
        type: 'thread' as const,
        id: thread.id,
        title: thread.subject,
        snippet,
        relevanceScore,
        timestamp: thread.lastMessageAt,
        metadata: {
          classification: thread.classification,
          category: thread.category,
          riskLevel: thread.riskLevel,
          propertyAddress: thread.property?.address,
          participantCount: (thread.participants as any[]).length,
        },
      };
    });
  }
  
  /**
   * Calculate relevance score based on query match quality
   * Higher score = more relevant
   */
  private calculateRelevance(fields: string[], query: string): number {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
    
    let score = 0;
    
    fields.forEach((field, fieldIndex) => {
      if (!field) return;
      
      const fieldLower = field.toLowerCase();
      
      // Exact match in field (highest score)
      if (fieldLower === queryLower) {
        score += 100 * (fields.length - fieldIndex);
        return;
      }
      
      // Field starts with query
      if (fieldLower.startsWith(queryLower)) {
        score += 50 * (fields.length - fieldIndex);
      }
      
      // Field contains query as whole phrase
      if (fieldLower.includes(queryLower)) {
        score += 30 * (fields.length - fieldIndex);
      }
      
      // Count matching words
      queryWords.forEach(word => {
        if (fieldLower.includes(word)) {
          score += 5 * (fields.length - fieldIndex);
        }
      });
    });
    
    return score;
  }
  
  /**
   * Rank results by relevance and recency
   */
  private rankResults(results: SearchResult[], query: string): SearchResult[] {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    return results.sort((a, b) => {
      // Calculate recency score (0-1, where 1 is most recent)
      const aRecency = Math.max(0, 1 - (now - a.timestamp.getTime()) / (90 * dayInMs));
      const bRecency = Math.max(0, 1 - (now - b.timestamp.getTime()) / (90 * dayInMs));
      
      // Combine relevance (70%) and recency (30%)
      const aScore = a.relevanceScore * 0.7 + aRecency * 100 * 0.3;
      const bScore = b.relevanceScore * 0.7 + bRecency * 100 * 0.3;
      
      return bScore - aScore;
    });
  }
  
  /**
   * Generate a context snippet showing why the result matched
   */
  private generateSnippet(text: string, query: string, maxLength: number): string {
    if (!text) return '';
    
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    
    // Find the position of the query in the text
    const queryIndex = textLower.indexOf(queryLower);
    
    if (queryIndex === -1) {
      // Query not found as exact phrase, just return beginning
      return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
    }
    
    // Calculate snippet boundaries
    const contextBefore = 50;
    const contextAfter = maxLength - query.length - contextBefore;
    
    let start = Math.max(0, queryIndex - contextBefore);
    let end = Math.min(text.length, queryIndex + query.length + contextAfter);
    
    // Adjust to word boundaries
    if (start > 0) {
      const spaceIndex = text.indexOf(' ', start);
      if (spaceIndex !== -1 && spaceIndex < queryIndex) {
        start = spaceIndex + 1;
      }
    }
    
    if (end < text.length) {
      const spaceIndex = text.lastIndexOf(' ', end);
      if (spaceIndex !== -1 && spaceIndex > queryIndex + query.length) {
        end = spaceIndex;
      }
    }
    
    let snippet = text.substring(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    
    return snippet;
  }
}

export const searchService = new SearchService();
