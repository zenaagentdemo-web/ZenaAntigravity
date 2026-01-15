import prisma from '../config/database.js';
import type { Participant } from '../models/types.js';

/**
 * Thread Linking Service
 * 
 * Handles automatic linking of threads to properties and contacts
 * based on address mentions and participant emails.
 */
class ThreadLinkingService {
  /**
   * Link a thread to a property by searching for address mentions
   * in the thread subject and summary
   */
  async linkThreadToProperty(
    threadId: string,
    userId: string,
    subject: string,
    summary: string
  ): Promise<string | null> {
    try {
      // Get all properties for this user
      const properties = await prisma.property.findMany({
        where: { userId },
        select: { id: true, address: true },
      });

      if (properties.length === 0) {
        return null;
      }

      // Search for property address mentions in subject or summary
      const searchText = `${subject} ${summary}`.toLowerCase();

      for (const property of properties) {
        const address = property.address.toLowerCase();

        // Check if the address or significant parts of it appear in the text
        if (this.addressMatchesText(address, searchText)) {
          // Link thread to this property
          await prisma.thread.update({
            where: { id: threadId },
            data: { propertyId: property.id },
          });

          return property.id;
        }
      }

      return null;
    } catch (error) {
      console.error('Error linking thread to property:', error);
      throw error;
    }
  }

  /**
   * Check if an address matches text content
   * Uses fuzzy matching to handle variations in address formatting
   */
  private addressMatchesText(address: string, text: string): boolean {
    // Normalize address and text
    const normalizedAddress = address.toLowerCase().trim();
    const normalizedText = text.toLowerCase();

    // Direct match
    if (normalizedText.includes(normalizedAddress)) {
      return true;
    }

    // Extract street number and street name (basic parsing)
    const addressParts = normalizedAddress.split(/[\s,]+/);

    // Check if at least the street number and first part of street name appear
    if (addressParts.length >= 2) {
      const streetNumber = addressParts[0];
      const streetName = addressParts[1];

      // Both street number and street name should appear
      if (normalizedText.includes(streetNumber) && normalizedText.includes(streetName)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find contacts that match thread participants by email
   */
  async findContactsForThread(
    userId: string,
    participants: Participant[]
  ): Promise<string[]> {
    try {
      const participantEmails = participants.map(p => p.email.toLowerCase());

      // Find all contacts that have any of these emails
      const contacts = await prisma.contact.findMany({
        where: {
          userId,
          emails: {
            hasSome: participantEmails,
          },
        },
        select: { id: true },
      });

      return contacts.map((c: { id: string }) => c.id);
    } catch (error) {
      console.error('Error finding contacts for thread:', error);
      throw error;
    }
  }

  /**
   * Suggest contacts for a thread based on participant names/emails (Scenario S52)
   */
  async findSuggestedContacts(userId: string, participants: Participant[]): Promise<any[]> {
    try {
      const participantNames = participants.map(p => p.name.toLowerCase());
      const participantEmails = participants.map(p => p.email.toLowerCase());

      // Search for contacts with matching names or similar emails
      const suggested = await prisma.contact.findMany({
        where: {
          userId,
          OR: [
            { name: { in: participantNames, mode: 'insensitive' } },
            { emails: { hasSome: participantEmails } }
          ]
        },
        take: 5
      });

      return suggested;
    } catch (error) {
      console.error('Error finding suggested contacts:', error);
      return [];
    }
  }

  /**
   * Automatically link a thread when it's created or updated
   * This is the main entry point for automatic linking
   */
  async autoLinkThread(threadId: string): Promise<{
    propertyId: string | null;
    contactIds: string[];
  }> {
    try {
      // Get the thread with its details
      const thread = await prisma.thread.findUnique({
        where: { id: threadId },
        select: {
          id: true,
          userId: true,
          subject: true,
          summary: true,
          participants: true,
          propertyId: true,
        },
      });

      if (!thread) {
        throw new Error(`Thread ${threadId} not found`);
      }

      const result = {
        propertyId: thread.propertyId,
        contactIds: [] as string[],
      };

      // Link to property if not already linked
      if (!thread.propertyId) {
        const propertyId = await this.linkThreadToProperty(
          thread.id,
          thread.userId,
          thread.subject,
          thread.summary
        );
        result.propertyId = propertyId;
      }

      // Find matching contacts
      const participants = thread.participants as unknown as Participant[];
      if (participants && participants.length > 0) {
        result.contactIds = await this.findContactsForThread(
          thread.userId,
          participants
        );
      }

      return result;
    } catch (error) {
      console.error('Error auto-linking thread:', error);
      throw error;
    }
  }

  /**
   * Batch link multiple threads
   * Useful for initial sync or re-linking after property/contact changes
   */
  async batchLinkThreads(threadIds: string[]): Promise<void> {
    try {
      for (const threadId of threadIds) {
        await this.autoLinkThread(threadId);
      }
    } catch (error) {
      console.error('Error batch linking threads:', error);
      throw error;
    }
  }

  /**
   * Re-link all threads for a specific property
   * Called when a property is created or its address is updated
   */
  async relinkThreadsForProperty(propertyId: string): Promise<number> {
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { id: true, userId: true, address: true },
      });

      if (!property) {
        throw new Error(`Property ${propertyId} not found`);
      }

      // Find all threads for this user that aren't linked to any property
      const threads = await prisma.thread.findMany({
        where: {
          userId: property.userId,
          propertyId: null,
        },
        select: {
          id: true,
          subject: true,
          summary: true,
        },
      });

      let linkedCount = 0;
      const searchText = property.address.toLowerCase();

      for (const thread of threads) {
        const threadText = `${thread.subject} ${thread.summary}`.toLowerCase();

        if (this.addressMatchesText(searchText, threadText)) {
          await prisma.thread.update({
            where: { id: thread.id },
            data: { propertyId: property.id },
          });
          linkedCount++;
        }
      }

      return linkedCount;
    } catch (error) {
      console.error('Error relinking threads for property:', error);
      throw error;
    }
  }

  /**
   * Link all relevant threads to a newly created property
   * This is called when a property is first created
   */
  async linkThreadsToProperty(propertyId: string, address: string): Promise<number> {
    return await this.relinkThreadsForProperty(propertyId);
  }

  /**
   * Get all threads linked to a specific property
   */
  async getThreadsForProperty(propertyId: string): Promise<any[]> {
    try {
      // Get the property with its vendors and buyers
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: {
          vendors: { select: { emails: true } },
          buyers: { select: { emails: true } },
        },
      });

      if (!property) {
        throw new Error(`Property ${propertyId} not found`);
      }

      // Collect all emails of associated contacts
      const contactEmails = new Set<string>();
      property.vendors.forEach(v => v.emails.forEach(e => contactEmails.add(e.toLowerCase())));
      property.buyers.forEach(b => b.emails.forEach(e => contactEmails.add(e.toLowerCase())));

      // Get all threads for this user
      // We process them to find matches either by propertyId or by participant email
      const threads = await prisma.thread.findMany({
        where: { userId: property.userId },
        select: {
          id: true,
          subject: true,
          summary: true,
          classification: true,
          category: true,
          riskLevel: true,
          lastMessageAt: true,
          propertyId: true,
          participants: true,
        },
      });

      // Filter threads
      const matchingThreads = threads.filter((thread: any) => {
        // Match by explicit property linking
        if (thread.propertyId === propertyId) return true;

        // Match by associated contact email
        const participants = thread.participants as unknown as Participant[];
        return participants && participants.some((p: Participant) =>
          contactEmails.has(p.email.toLowerCase())
        );
      });

      return matchingThreads
        .sort((a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
        .map(t => {
          // Remove participants and propertyId from final output to match expected schema
          const { participants, propertyId, ...threadData } = t;
          return threadData;
        });
    } catch (error) {
      console.error('Error getting threads for property:', error);
      throw error;
    }
  }

  /**
   * Get all threads that involve a specific contact
   * Searches through thread participants
   */
  async getThreadsForContact(contactId: string): Promise<any[]> {
    try {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        select: { userId: true, emails: true },
      });

      if (!contact) {
        throw new Error(`Contact ${contactId} not found`);
      }

      // Get all threads for this user
      const threads = await prisma.thread.findMany({
        where: { userId: contact.userId },
        select: {
          id: true,
          subject: true,
          summary: true,
          participants: true,
          classification: true,
          category: true,
          riskLevel: true,
          lastMessageAt: true,
        },
      });

      // Filter threads where any participant email matches contact emails
      const matchingThreads = threads.filter((thread: any) => {
        const participants = thread.participants as Participant[];
        return participants.some((p: Participant) =>
          contact.emails.some((email: string) =>
            email.toLowerCase() === p.email.toLowerCase()
          )
        );
      });

      return matchingThreads.sort((a: any, b: any) =>
        b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
      );
    } catch (error) {
      console.error('Error getting threads for contact:', error);
      throw error;
    }
  }
  /**
   * Archive a thread
   */
  async archiveThread(threadId: string): Promise<void> {
    try {
      await prisma.thread.update({
        where: { id: threadId },
        data: { classification: 'archived' },
      });
    } catch (error) {
      console.error('Error archiving thread:', error);
      throw error;
    }
  }
}

export const threadLinkingService = new ThreadLinkingService();
