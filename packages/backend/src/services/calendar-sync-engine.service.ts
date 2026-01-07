import { calendarAccountService } from './calendar-account.service.js';
import { calendarEventLinkingService } from './calendar-event-linking.service.js';
import prisma from '../config/database.js';

export interface CalendarSyncJob {
  accountId: string;
  userId: string;
  provider: string;
  lastSyncAt: Date | null;
}

export interface CalendarSyncResult {
  accountId: string;
  success: boolean;
  eventsProcessed: number;
  error?: string;
}

export interface CalendarEvent {
  externalId: string;
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: string[];
  eventType?: 'viewing' | 'appraisal' | 'meeting' | 'auction' | 'settlement' | 'other';
  propertyReference?: string;
}

/**
 * Calendar Sync Engine Service
 * Manages periodic calendar synchronization across all connected accounts
 */
export class CalendarSyncEngineService {
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
  private activeSyncs = new Set<string>();
  private retryAttempts = new Map<string, number>();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [60000, 300000, 900000]; // 1min, 5min, 15min

  /**
   * Start the calendar sync engine with periodic scheduling
   */
  start() {
    if (this.syncInterval) {
      console.log('Calendar sync engine already running');
      return;
    }

    console.log('Starting calendar sync engine...');

    // Run initial sync
    this.syncAllAccounts().catch(console.error);

    // Schedule periodic syncs
    this.syncInterval = setInterval(() => {
      this.syncAllAccounts().catch(console.error);
    }, this.SYNC_INTERVAL_MS);

    console.log(`Calendar sync engine started (interval: ${this.SYNC_INTERVAL_MS / 1000}s)`);
  }

  /**
   * Stop the calendar sync engine
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Calendar sync engine stopped');
    }
  }

  /**
   * Sync all enabled calendar accounts
   */
  async syncAllAccounts(): Promise<CalendarSyncResult[]> {
    try {
      // Get all enabled calendar accounts
      const accounts = await prisma.calendarAccount.findMany({
        where: {
          syncEnabled: true,
        },
        select: {
          id: true,
          userId: true,
          provider: true,
          lastSyncAt: true,
        },
      });

      console.log(`Found ${accounts.length} calendar accounts to sync`);

      // Sync each account
      const results = await Promise.allSettled(
        accounts.map((account) => this.syncAccount(account))
      );

      // Process results
      return results.map((result, index) => {
        const account = accounts[index];
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Calendar sync failed for account ${account.id}:`, result.reason);
          return {
            accountId: account.id,
            success: false,
            eventsProcessed: 0,
            error: result.reason?.message || 'Unknown error',
          };
        }
      });
    } catch (error) {
      console.error('Error syncing all calendar accounts:', error);
      return [];
    }
  }

  /**
   * Sync a single calendar account with retry logic
   */
  async syncAccount(job: CalendarSyncJob): Promise<CalendarSyncResult> {
    const { accountId, userId, provider, lastSyncAt } = job;

    // Check if sync is already in progress
    if (this.activeSyncs.has(accountId)) {
      console.log(`Calendar sync already in progress for account ${accountId}`);
      return {
        accountId,
        success: false,
        eventsProcessed: 0,
        error: 'Sync already in progress',
      };
    }

    this.activeSyncs.add(accountId);

    try {
      console.log(`Starting calendar sync for account ${accountId} (${provider})`);

      // Get valid access token
      const tokens = await calendarAccountService.getDecryptedTokens(accountId);
      if (!tokens) {
        throw new Error('Failed to get calendar account tokens');
      }

      // Fetch events based on provider with retry logic
      const events = await this.fetchEventsWithRetry(
        provider,
        tokens.accessToken,
        accountId,
        lastSyncAt
      );

      // Store events in database
      const storedCount = await this.storeEvents(userId, accountId, events);

      // Link events to properties, contacts, and deals
      await this.linkStoredEvents(userId, events);

      // Update last sync timestamp
      await this.updateLastSync(accountId);

      // Reset retry counter on success
      this.retryAttempts.delete(accountId);

      console.log(`Calendar sync completed for account ${accountId}: ${storedCount} events processed`);

      return {
        accountId,
        success: true,
        eventsProcessed: storedCount,
      };
    } catch (error) {
      console.error(`Calendar sync error for account ${accountId}:`, error);

      // Handle retry logic
      await this.handleSyncError(accountId, error);

      return {
        accountId,
        success: false,
        eventsProcessed: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this.activeSyncs.delete(accountId);
    }
  }

  /**
   * Fetch events with retry logic
   */
  private async fetchEventsWithRetry(
    provider: string,
    accessToken: string,
    accountId: string,
    lastSyncAt: Date | null
  ): Promise<CalendarEvent[]> {
    const attempts = this.retryAttempts.get(accountId) || 0;

    try {
      let events: CalendarEvent[];
      switch (provider) {
        case 'google':
          events = await this.fetchGoogleCalendarEvents(accessToken, lastSyncAt);
          break;
        case 'microsoft':
          events = await this.fetchMicrosoftCalendarEvents(accessToken, lastSyncAt);
          break;
        default:
          throw new Error(`Unsupported calendar provider: ${provider}`);
      }
      return events;
    } catch (error) {
      // Check if error is retryable
      if (this.isRetryableError(error) && attempts < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAYS[attempts];
        console.log(
          `Retrying calendar sync for account ${accountId} in ${delay / 1000}s (attempt ${attempts + 1}/${this.MAX_RETRIES})`
        );

        // Schedule retry
        await new Promise((resolve) => setTimeout(resolve, delay));
        this.retryAttempts.set(accountId, attempts + 1);

        return this.fetchEventsWithRetry(provider, accessToken, accountId, lastSyncAt);
      }

      throw error;
    }
  }

  /**
   * Fetch events from Google Calendar API
   */
  private async fetchGoogleCalendarEvents(
    accessToken: string,
    lastSyncAt: Date | null
  ): Promise<CalendarEvent[]> {
    const baseUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    // Build query parameters
    const params = new URLSearchParams({
      maxResults: '250',
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    // Add time filter for incremental sync
    if (lastSyncAt) {
      params.append('updatedMin', lastSyncAt.toISOString());
    } else {
      // For initial sync, get events from 30 days ago to 90 days in future
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      params.append('timeMin', thirtyDaysAgo.toISOString());
    }

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Calendar API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const items = data.items || [];

    // Parse and transform events
    return items.map((item: any) => this.parseGoogleCalendarEvent(item));
  }

  /**
   * Parse Google Calendar event
   */
  private parseGoogleCalendarEvent(item: any): CalendarEvent {
    const startTime = item.start?.dateTime
      ? new Date(item.start.dateTime)
      : new Date(item.start?.date || new Date());

    const endTime = item.end?.dateTime
      ? new Date(item.end.dateTime)
      : new Date(item.end?.date || new Date());

    const attendees = (item.attendees || [])
      .map((a: any) => a.email)
      .filter(Boolean);

    const summary = item.summary || '';
    const description = item.description || '';
    const location = item.location || '';

    const eventType = this.detectEventType(summary, description, location);
    const propertyReference = this.extractPropertyReference(summary, description, location);

    return {
      externalId: item.id,
      summary: summary || 'Untitled Event',
      description: item.description,
      startTime,
      endTime,
      location: item.location,
      attendees,
      eventType,
      propertyReference,
    };
  }

  /**
   * Fetch events from Microsoft Calendar API
   */
  private async fetchMicrosoftCalendarEvents(
    accessToken: string,
    lastSyncAt: Date | null
  ): Promise<CalendarEvent[]> {
    const baseUrl = 'https://graph.microsoft.com/v1.0/me/calendar/events';

    // Build query parameters
    const params = new URLSearchParams({
      $top: '250',
      $orderby: 'start/dateTime',
    });

    // Add time filter for incremental sync
    if (lastSyncAt) {
      const filterDate = lastSyncAt.toISOString();
      params.append('$filter', `lastModifiedDateTime ge ${filterDate}`);
    } else {
      // For initial sync, get events from 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const filterDate = thirtyDaysAgo.toISOString();
      params.append('$filter', `start/dateTime ge '${filterDate}'`);
    }

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Microsoft Calendar API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const items = data.value || [];

    // Parse and transform events
    return items.map((item: any) => this.parseMicrosoftCalendarEvent(item));
  }

  /**
   * Parse Microsoft Calendar event
   */
  private parseMicrosoftCalendarEvent(item: any): CalendarEvent {
    const startTime = new Date(item.start?.dateTime || new Date());
    const endTime = new Date(item.end?.dateTime || new Date());

    const attendees = (item.attendees || [])
      .map((a: any) => a.emailAddress?.address)
      .filter(Boolean);

    const summary = item.subject || '';
    const description = item.bodyPreview || '';
    const location = item.location?.displayName || '';

    const eventType = this.detectEventType(summary, description, location);
    const propertyReference = this.extractPropertyReference(summary, description, location);

    return {
      externalId: item.id,
      summary: summary || 'Untitled Event',
      description: item.bodyPreview,
      startTime,
      endTime,
      location: item.location?.displayName,
      attendees,
      eventType,
      propertyReference,
    };
  }

  /**
   * Detect event type based on keywords
   */
  private detectEventType(
    summary: string,
    description: string,
    location: string
  ): 'viewing' | 'appraisal' | 'meeting' | 'auction' | 'settlement' | 'other' {
    const text = `${summary} ${description} ${location}`.toLowerCase();

    // Check for specific event types
    if (
      text.includes('viewing') ||
      text.includes('inspection') ||
      text.includes('open home') ||
      text.includes('open house') ||
      text.includes('property tour')
    ) {
      return 'viewing';
    }

    if (
      text.includes('appraisal') ||
      text.includes('valuation') ||
      text.includes('assessment')
    ) {
      return 'appraisal';
    }

    if (
      text.includes('auction') ||
      text.includes('bidding')
    ) {
      return 'auction';
    }

    if (
      text.includes('settlement') ||
      text.includes('closing') ||
      text.includes('handover') ||
      text.includes('final inspection')
    ) {
      return 'settlement';
    }

    if (
      text.includes('meeting') ||
      text.includes('vendor') ||
      text.includes('buyer') ||
      text.includes('client')
    ) {
      return 'meeting';
    }

    return 'other';
  }

  /**
   * Extract property reference (address) from event text
   * Looks for common address patterns in summary, description, and location
   */
  private extractPropertyReference(
    summary: string,
    description: string,
    location: string
  ): string | undefined {
    const text = `${summary} ${description} ${location}`;

    // Common address patterns:
    // - "123 Main St" or "123 Main Street"
    // - "456 Oak Ave" or "456 Oak Avenue"
    // - "789 Elm Rd" or "789 Elm Road"
    // - "Unit 5/123 Main St"
    // - "Apt 10, 456 Oak Ave"

    // Pattern: number + street name + street type
    const addressPattern = /\b(\d+[\w\s,/-]*(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl|Boulevard|Blvd|Way|Terrace|Tce|Crescent|Cres|Circuit|Cct)\b)/gi;

    const matches = text.match(addressPattern);

    if (matches && matches.length > 0) {
      // Return the first match, cleaned up
      return matches[0].trim();
    }

    // If location field looks like an address (contains numbers), use it
    if (location && /\d+/.test(location)) {
      return location.trim();
    }

    return undefined;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, and rate limits are retryable
    const retryableErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'rate_limit',
      '429',
      '503',
      '504',
    ];

    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code?.toLowerCase() || '';
    const statusCode = error?.status?.toString() || '';

    return retryableErrors.some(
      (retryable) =>
        errorMessage.includes(retryable) ||
        errorCode.includes(retryable) ||
        statusCode.includes(retryable)
    );
  }

  /**
   * Handle sync error with exponential backoff
   */
  private async handleSyncError(accountId: string, error: any): Promise<void> {
    const attempts = this.retryAttempts.get(accountId) || 0;

    if (attempts >= this.MAX_RETRIES) {
      console.error(
        `Max retries reached for calendar account ${accountId}. Giving up.`
      );
      this.retryAttempts.delete(accountId);
    } else if (this.isRetryableError(error)) {
      this.retryAttempts.set(accountId, attempts + 1);
    }
  }

  /**
   * Store events in database
   */
  private async storeEvents(
    userId: string,
    accountId: string,
    events: CalendarEvent[]
  ): Promise<number> {
    let storedCount = 0;

    for (const event of events) {
      try {
        // Store as timeline event
        await prisma.timelineEvent.upsert({
          where: {
            // Use a composite unique constraint if available, or find first
            userId_entityType_entityId: {
              userId,
              entityType: 'calendar_event',
              entityId: event.externalId,
            },
          },
          update: {
            summary: event.summary,
            content: event.description,
            timestamp: event.startTime,
            metadata: {
              endTime: event.endTime.toISOString(),
              location: event.location,
              attendees: event.attendees,
              eventType: event.eventType,
              propertyReference: event.propertyReference,
              calendarAccountId: accountId,
            },
          },
          create: {
            userId,
            type: 'meeting',
            entityType: 'calendar_event',
            entityId: event.externalId,
            summary: event.summary,
            content: event.description,
            timestamp: event.startTime,
            metadata: {
              endTime: event.endTime.toISOString(),
              location: event.location,
              attendees: event.attendees,
              eventType: event.eventType,
              propertyReference: event.propertyReference,
              calendarAccountId: accountId,
            },
          },
        });

        storedCount++;
      } catch (error) {
        // If upsert fails due to missing unique constraint, try find and update/create
        try {
          const existing = await prisma.timelineEvent.findFirst({
            where: {
              userId,
              entityType: 'calendar_event',
              entityId: event.externalId,
            },
          });

          if (existing) {
            await prisma.timelineEvent.update({
              where: { id: existing.id },
              data: {
                summary: event.summary,
                content: event.description,
                timestamp: event.startTime,
                metadata: {
                  endTime: event.endTime.toISOString(),
                  location: event.location,
                  attendees: event.attendees,
                  eventType: event.eventType,
                  propertyReference: event.propertyReference,
                  calendarAccountId: accountId,
                },
              },
            });
          } else {
            await prisma.timelineEvent.create({
              data: {
                userId,
                type: 'meeting',
                entityType: 'calendar_event',
                entityId: event.externalId,
                summary: event.summary,
                content: event.description,
                timestamp: event.startTime,
                metadata: {
                  endTime: event.endTime.toISOString(),
                  location: event.location,
                  attendees: event.attendees,
                  eventType: event.eventType,
                  propertyReference: event.propertyReference,
                  calendarAccountId: accountId,
                },
              },
            });
          }
          storedCount++;
        } catch (innerError) {
          console.error(`Error storing calendar event ${event.externalId}:`, innerError);
        }
      }
    }

    return storedCount;
  }

  /**
   * Link stored events to properties, contacts, and deals
   */
  private async linkStoredEvents(
    userId: string,
    events: CalendarEvent[]
  ): Promise<void> {
    for (const event of events) {
      try {
        await calendarEventLinkingService.linkEvent(userId, event.externalId);
      } catch (error) {
        console.error(`Error linking calendar event ${event.externalId}:`, error);
        // Continue with other events even if one fails
      }
    }
  }

  /**
   * Update last sync timestamp for calendar account
   */
  private async updateLastSync(accountId: string): Promise<void> {
    await prisma.calendarAccount.update({
      where: { id: accountId },
      data: { lastSyncAt: new Date() },
    });
  }

  /**
   * Trigger manual sync for a specific calendar account
   */
  async triggerManualSync(accountId: string): Promise<CalendarSyncResult> {
    const account = await prisma.calendarAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        userId: true,
        provider: true,
        lastSyncAt: true,
      },
    });

    if (!account) {
      throw new Error('Calendar account not found');
    }

    return this.syncAccount(account);
  }
}

export const calendarSyncEngineService = new CalendarSyncEngineService();
