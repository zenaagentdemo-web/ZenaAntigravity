import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CalendarEventLinkingResult {
  eventId: string;
  linkedProperties: string[];
  linkedContacts: string[];
  linkedDeals: string[];
}

/**
 * Calendar Event Linking Service
 * Links calendar events to properties, contacts, and deals based on event details
 */
export class CalendarEventLinkingService {
  /**
   * Link a calendar event to relevant entities (properties, contacts, deals)
   */
  async linkEvent(
    userId: string,
    eventId: string
  ): Promise<CalendarEventLinkingResult> {
    // Get the timeline event
    const event = await prisma.timelineEvent.findFirst({
      where: {
        userId,
        entityType: 'calendar_event',
        entityId: eventId,
      },
    });

    if (!event) {
      throw new Error('Calendar event not found');
    }

    const metadata = event.metadata as any;
    const propertyReference = metadata?.propertyReference;
    const attendees = metadata?.attendees || [];
    const eventType = metadata?.eventType;

    const linkedProperties: string[] = [];
    const linkedContacts: string[] = [];
    const linkedDeals: string[] = [];

    // Link to properties based on property reference
    if (propertyReference) {
      const properties = await this.findPropertiesByAddress(userId, propertyReference);
      linkedProperties.push(...properties.map((p) => p.id));
    }

    // Link to contacts based on attendees
    if (attendees.length > 0) {
      const contacts = await this.findContactsByEmails(userId, attendees);
      linkedContacts.push(...contacts.map((c) => c.id));
    }

    // Link to deals based on linked properties and contacts
    if (linkedProperties.length > 0 || linkedContacts.length > 0) {
      const deals = await this.findDealsByPropertiesAndContacts(
        userId,
        linkedProperties,
        linkedContacts
      );
      linkedDeals.push(...deals.map((d) => d.id));
    }

    // Update event metadata with links
    await this.updateEventLinks(event.id, {
      linkedProperties,
      linkedContacts,
      linkedDeals,
      eventType,
    });

    // Create timeline events for linked entities
    await this.createLinkedTimelineEvents(
      userId,
      event,
      linkedProperties,
      linkedContacts,
      linkedDeals
    );

    return {
      eventId,
      linkedProperties,
      linkedContacts,
      linkedDeals,
    };
  }

  /**
   * Find properties by address (fuzzy matching)
   */
  private async findPropertiesByAddress(
    userId: string,
    address: string
  ): Promise<Array<{ id: string; address: string }>> {
    // Normalize address for comparison
    const normalizedAddress = this.normalizeAddress(address);

    // Get all properties for user
    const properties = await prisma.property.findMany({
      where: { userId },
      select: { id: true, address: true },
    });

    // Filter properties with fuzzy matching
    return properties.filter((property: { id: string; address: string }) => {
      const normalizedPropertyAddress = this.normalizeAddress(property.address);
      return this.addressesMatch(normalizedAddress, normalizedPropertyAddress);
    });
  }

  /**
   * Normalize address for comparison
   */
  private normalizeAddress(address: string): string {
    return address
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\bstreet\b/g, 'st')
      .replace(/\bavenue\b/g, 'ave')
      .replace(/\broad\b/g, 'rd')
      .replace(/\bdrive\b/g, 'dr')
      .replace(/\blane\b/g, 'ln')
      .replace(/\bcourt\b/g, 'ct')
      .replace(/\bplace\b/g, 'pl')
      .replace(/\bboulevard\b/g, 'blvd')
      .replace(/\bterrace\b/g, 'tce')
      .replace(/\bcrescent\b/g, 'cres')
      .replace(/\bcircuit\b/g, 'cct')
      .replace(/[,.-]/g, '')
      .trim();
  }

  /**
   * Check if two addresses match (fuzzy)
   */
  private addressesMatch(address1: string, address2: string): boolean {
    // Exact match
    if (address1 === address2) {
      return true;
    }

    // Check if one contains the other
    if (address1.includes(address2) || address2.includes(address1)) {
      return true;
    }

    // Extract street number and name for comparison
    const extractStreetInfo = (addr: string) => {
      const match = addr.match(/^(\d+[\w/-]*)\s+(.+)/);
      if (match) {
        return { number: match[1], street: match[2] };
      }
      return null;
    };

    const info1 = extractStreetInfo(address1);
    const info2 = extractStreetInfo(address2);

    if (info1 && info2) {
      // Match if street number and street name are similar
      return (
        info1.number === info2.number &&
        (info1.street.includes(info2.street) || info2.street.includes(info1.street))
      );
    }

    return false;
  }

  /**
   * Find contacts by email addresses
   */
  private async findContactsByEmails(
    userId: string,
    emails: string[]
  ): Promise<Array<{ id: string; emails: string[] }>> {
    if (emails.length === 0) {
      return [];
    }

    // Normalize emails
    const normalizedEmails = emails.map((e) => e.toLowerCase().trim());

    // Find contacts with matching emails
    const contacts = await prisma.contact.findMany({
      where: {
        userId,
        emails: {
          hasSome: normalizedEmails,
        },
      },
      select: { id: true, emails: true },
    });

    return contacts;
  }

  /**
   * Find deals by properties and contacts
   */
  private async findDealsByPropertiesAndContacts(
    userId: string,
    propertyIds: string[],
    contactIds: string[]
  ): Promise<Array<{ id: string }>> {
    const deals: Array<{ id: string }> = [];

    // Find deals by property
    if (propertyIds.length > 0) {
      const propertyDeals = await prisma.deal.findMany({
        where: {
          userId,
          propertyId: { in: propertyIds },
        },
        select: { id: true },
      });
      deals.push(...propertyDeals);
    }

    // Find deals by contacts
    if (contactIds.length > 0) {
      const contactDeals = await prisma.deal.findMany({
        where: {
          userId,
          contacts: {
            some: {
              id: { in: contactIds },
            },
          },
        },
        select: { id: true },
      });
      deals.push(...contactDeals);
    }

    // Deduplicate deals
    const uniqueDeals = Array.from(
      new Map(deals.map((d) => [d.id, d])).values()
    );

    return uniqueDeals;
  }

  /**
   * Update event metadata with links
   */
  private async updateEventLinks(
    eventId: string,
    links: {
      linkedProperties: string[];
      linkedContacts: string[];
      linkedDeals: string[];
      eventType?: string;
    }
  ): Promise<void> {
    const event = await prisma.timelineEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return;
    }

    const metadata = (event.metadata as any) || {};

    await prisma.timelineEvent.update({
      where: { id: eventId },
      data: {
        metadata: {
          ...metadata,
          linkedProperties: links.linkedProperties,
          linkedContacts: links.linkedContacts,
          linkedDeals: links.linkedDeals,
          eventType: links.eventType,
        },
      },
    });
  }

  /**
   * Create timeline events for linked entities
   */
  private async createLinkedTimelineEvents(
    userId: string,
    originalEvent: any,
    propertyIds: string[],
    contactIds: string[],
    dealIds: string[]
  ): Promise<void> {
    const metadata = originalEvent.metadata as any;
    const eventType = metadata?.eventType || 'other';
    const summary = `${this.formatEventType(eventType)}: ${originalEvent.summary}`;

    // Create timeline events for properties
    for (const propertyId of propertyIds) {
      await prisma.timelineEvent.upsert({
        where: {
          userId_entityType_entityId: {
            userId,
            entityType: 'property',
            entityId: propertyId,
          },
        },
        update: {
          summary,
          content: originalEvent.content,
          timestamp: originalEvent.timestamp,
          metadata: {
            ...metadata,
            calendarEventId: originalEvent.entityId,
          },
        },
        create: {
          userId,
          type: 'meeting',
          entityType: 'property',
          entityId: propertyId,
          summary,
          content: originalEvent.content,
          timestamp: originalEvent.timestamp,
          metadata: {
            ...metadata,
            calendarEventId: originalEvent.entityId,
          },
        },
      });
    }

    // Create timeline events for contacts
    for (const contactId of contactIds) {
      await prisma.timelineEvent.upsert({
        where: {
          userId_entityType_entityId: {
            userId,
            entityType: 'contact',
            entityId: contactId,
          },
        },
        update: {
          summary,
          content: originalEvent.content,
          timestamp: originalEvent.timestamp,
          metadata: {
            ...metadata,
            calendarEventId: originalEvent.entityId,
          },
        },
        create: {
          userId,
          type: 'meeting',
          entityType: 'contact',
          entityId: contactId,
          summary,
          content: originalEvent.content,
          timestamp: originalEvent.timestamp,
          metadata: {
            ...metadata,
            calendarEventId: originalEvent.entityId,
          },
        },
      });
    }

    // Create timeline events for deals
    for (const dealId of dealIds) {
      await prisma.timelineEvent.upsert({
        where: {
          userId_entityType_entityId: {
            userId,
            entityType: 'deal',
            entityId: dealId,
          },
        },
        update: {
          summary,
          content: originalEvent.content,
          timestamp: originalEvent.timestamp,
          metadata: {
            ...metadata,
            calendarEventId: originalEvent.entityId,
          },
        },
        create: {
          userId,
          type: 'meeting',
          entityType: 'deal',
          entityId: dealId,
          summary,
          content: originalEvent.content,
          timestamp: originalEvent.timestamp,
          metadata: {
            ...metadata,
            calendarEventId: originalEvent.entityId,
          },
        },
      });
    }
  }

  /**
   * Format event type for display
   */
  private formatEventType(eventType: string): string {
    const typeMap: Record<string, string> = {
      viewing: 'Property Viewing',
      appraisal: 'Property Appraisal',
      meeting: 'Meeting',
      auction: 'Auction',
      settlement: 'Settlement',
      other: 'Event',
    };

    return typeMap[eventType] || 'Event';
  }

  /**
   * Link all unlinked calendar events for a user
   */
  async linkAllEvents(userId: string): Promise<CalendarEventLinkingResult[]> {
    // Get all calendar events for user
    const events = await prisma.timelineEvent.findMany({
      where: {
        userId,
        entityType: 'calendar_event',
      },
      select: {
        entityId: true,
      },
    });

    const results: CalendarEventLinkingResult[] = [];

    for (const event of events) {
      try {
        const result = await this.linkEvent(userId, event.entityId);
        results.push(result);
      } catch (error) {
        console.error(`Error linking event ${event.entityId}:`, error);
      }
    }

    return results;
  }

  /**
   * Re-link a calendar event (useful after property/contact updates)
   */
  async relinkEvent(
    userId: string,
    eventId: string
  ): Promise<CalendarEventLinkingResult> {
    return this.linkEvent(userId, eventId);
  }
}

export const calendarEventLinkingService = new CalendarEventLinkingService();
