
import prisma from '../config/database.js';

export class SearchService {
  /**
   * S99 & S100: Omni-Search
   */
  async omniSearch(userId: string, query: string): Promise<any> {
    console.log(`[SearchService] S100: Searching Everything for ${query}`);
    const [contacts, properties, deals] = await Promise.all([
      prisma.contact.findMany({ where: { userId, name: { contains: query, mode: 'insensitive' } }, take: 5 }),
      prisma.property.findMany({ where: { userId, address: { contains: query, mode: 'insensitive' } }, take: 5 }),
      prisma.deal.findMany({ where: { userId, stage: { contains: query, mode: 'insensitive' } }, take: 5 })
    ]);

    return {
      results: [
        ...contacts.map(c => ({ type: 'contact', data: c })),
        ...properties.map(p => ({ type: 'property', data: p })),
        ...deals.map(d => ({ type: 'deal', data: d }))
      ]
    };
  }

  /**
   * Search chat history
   */
  async searchChatHistory(userId: string, query: string): Promise<any[]> {
    const historicalMessages = await prisma.chatMessage.findMany({
      where: {
        conversation: { userId },
        content: { contains: query, mode: 'insensitive' }
      },
      include: { conversation: true },
      take: 5
    });
    return historicalMessages;
  }
}

export const searchService = new SearchService();
