import { PrismaClient } from '@prisma/client';
import { emailAccountService } from './email-account.service.js';
import { gmailConnectorService } from './gmail-connector.service.js';
import { microsoftConnectorService } from './microsoft-connector.service.js';
import { imapConnectorService } from './imap-connector.service.js';
import { yahooConnectorService } from './yahoo-connector.service.js';
import { aiProcessingService } from './ai-processing.service.js';
import { threadLinkingService } from './thread-linking.service.js';
import { timelineService } from './timeline.service.js';
import { websocketService } from './websocket.service.js';
import { contactAutoCreationService } from './contact-auto-creation.service.js';

const prisma = new PrismaClient();

export interface SyncJob {
  accountId: string;
  userId: string;
  provider: string;
  lastSyncAt: Date | null;
}

export interface SyncResult {
  accountId: string;
  success: boolean;
  threadsProcessed: number;
  error?: string;
}

/**
 * Sync Engine Service
 * Manages periodic email synchronization across all connected accounts
 */
export class SyncEngineService {
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 1 * 60 * 1000; // 1 minute
  private activeSyncs = new Set<string>();
  private retryAttempts = new Map<string, number>();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [60000, 300000, 900000]; // 1min, 5min, 15min

  /**
   * Start the sync engine with periodic scheduling
   */
  start() {
    if (this.syncInterval) {
      console.log('Sync engine already running');
      return;
    }

    console.log('Starting sync engine...');
    
    // Run initial sync
    this.syncAllAccounts().catch(console.error);

    // Schedule periodic syncs
    this.syncInterval = setInterval(() => {
      this.syncAllAccounts().catch(console.error);
    }, this.SYNC_INTERVAL_MS);

    console.log(`Sync engine started (interval: ${this.SYNC_INTERVAL_MS / 1000}s)`);
  }

  /**
   * Stop the sync engine
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Sync engine stopped');
    }
  }

  /**
   * Sync all enabled email accounts
   */
  async syncAllAccounts(): Promise<SyncResult[]> {
    try {
      // Get all enabled email accounts
      const accounts = await prisma.emailAccount.findMany({
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

      console.log(`Found ${accounts.length} accounts to sync`);

      // Filter out any accounts with missing data and log what's missing
      const validAccounts = accounts.filter(account => {
        if (!account.id) {
          console.error('Account missing ID:', account);
          return false;
        }
        if (!account.userId) {
          console.error(`Account ${account.id} missing userId`);
          return false;
        }
        if (!account.provider) {
          console.error(`Account ${account.id} missing provider`);
          return false;
        }
        return true;
      });
      
      if (validAccounts.length < accounts.length) {
        console.warn(`Filtered out ${accounts.length - validAccounts.length} accounts with missing data`);
      }
      
      if (validAccounts.length === 0) {
        console.log('No valid accounts to sync');
        return [];
      }

      // Sync each account
      const results = await Promise.allSettled(
        validAccounts.map((account) => this.syncAccount({
          accountId: account.id,
          userId: account.userId,
          provider: account.provider,
          lastSyncAt: account.lastSyncAt,
        }))
      );

      // Process results
      return results.map((result, index) => {
        const account = validAccounts[index];
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Sync failed for account ${account.id}:`, result.reason);
          return {
            accountId: account.id,
            success: false,
            threadsProcessed: 0,
            error: result.reason?.message || 'Unknown error',
          };
        }
      });
    } catch (error) {
      console.error('Error syncing all accounts:', error);
      return [];
    }
  }

  /**
   * Sync a single email account with retry logic
   */
  async syncAccount(job: SyncJob): Promise<SyncResult> {
    const { accountId, userId, provider, lastSyncAt } = job;

    // Check if sync is already in progress
    if (this.activeSyncs.has(accountId)) {
      console.log(`Sync already in progress for account ${accountId}`);
      return {
        accountId,
        success: false,
        threadsProcessed: 0,
        error: 'Sync already in progress',
      };
    }

    this.activeSyncs.add(accountId);

    try {
      console.log(`Starting sync for account ${accountId} (${provider})`);

      // Emit sync started event
      websocketService.broadcastToUser(userId, 'sync.started', {
        accountId,
        provider,
      });

      // Get valid access token
      const accessToken = await emailAccountService.getValidAccessToken(accountId);

      // Fetch threads based on provider with retry logic
      const threads = await this.fetchThreadsWithRetry(
        provider,
        accessToken,
        accountId,
        lastSyncAt
      );

      // Emit sync progress event
      websocketService.broadcastToUser(userId, 'sync.progress', {
        accountId,
        totalThreads: threads.length,
        processedThreads: 0,
      });

      // Store threads in database
      const storedThreadIds = await this.storeThreads(userId, accountId, threads);

      // Emit thread.new events for new threads
      for (const threadId of storedThreadIds) {
        websocketService.broadcastToUser(userId, 'thread.new', {
          threadId,
          accountId,
        });
      }

      // Classify newly synced threads using AI
      if (storedThreadIds.length > 0) {
        console.log(`Classifying ${storedThreadIds.length} threads for account ${accountId}...`);
        await aiProcessingService.batchProcessThreads(storedThreadIds).catch((error) => {
          console.error(`AI classification failed for account ${accountId}:`, error);
          // Don't fail the sync if classification fails
        });
      }

      // Update last sync timestamp
      await emailAccountService.updateLastSync(accountId);

      // Reset retry counter on success
      this.retryAttempts.delete(accountId);

      console.log(`Sync completed for account ${accountId}: ${storedThreadIds.length} threads processed`);

      // Emit sync completed event
      websocketService.broadcastToUser(userId, 'sync.completed', {
        accountId,
        threadsProcessed: storedThreadIds.length,
        success: true,
      });

      return {
        accountId,
        success: true,
        threadsProcessed: storedThreadIds.length,
      };
    } catch (error) {
      console.error(`Sync error for account ${accountId}:`, error);
      
      // Emit sync completed event with error
      websocketService.broadcastToUser(userId, 'sync.completed', {
        accountId,
        threadsProcessed: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Handle retry logic
      await this.handleSyncError(accountId, error);

      return {
        accountId,
        success: false,
        threadsProcessed: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this.activeSyncs.delete(accountId);
    }
  }

  /**
   * Fetch threads with retry logic
   */
  private async fetchThreadsWithRetry(
    provider: string,
    accessToken: string,
    accountId: string,
    lastSyncAt: Date | null
  ): Promise<any[]> {
    const attempts = this.retryAttempts.get(accountId) || 0;

    try {
      let threads;
      switch (provider) {
        case 'gmail':
          threads = await this.fetchGmailThreads(accessToken, lastSyncAt);
          break;
        case 'outlook':
        case 'microsoft':
          threads = await this.fetchMicrosoftThreads(accessToken, lastSyncAt);
          break;
        case 'yahoo':
          threads = await this.fetchYahooThreads(accessToken, lastSyncAt, accountId);
          break;
        default:
          threads = await this.fetchImapThreads(accountId, lastSyncAt);
      }
      return threads;
    } catch (error) {
      // Check if error is retryable
      if (this.isRetryableError(error) && attempts < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAYS[attempts];
        console.log(
          `Retrying sync for account ${accountId} in ${delay / 1000}s (attempt ${attempts + 1}/${this.MAX_RETRIES})`
        );
        
        // Schedule retry
        await new Promise((resolve) => setTimeout(resolve, delay));
        this.retryAttempts.set(accountId, attempts + 1);
        
        return this.fetchThreadsWithRetry(provider, accessToken, accountId, lastSyncAt);
      }
      
      throw error;
    }
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
        `Max retries reached for account ${accountId}. Giving up.`
      );
      this.retryAttempts.delete(accountId);
    } else if (this.isRetryableError(error)) {
      this.retryAttempts.set(accountId, attempts + 1);
    }
  }

  /**
   * Fetch threads from Gmail API
   */
  private async fetchGmailThreads(
    accessToken: string,
    lastSyncAt: Date | null
  ): Promise<any[]> {
    return gmailConnectorService.fetchThreads(accessToken, lastSyncAt);
  }

  /**
   * Fetch threads from Microsoft Graph API
   */
  private async fetchMicrosoftThreads(
    accessToken: string,
    lastSyncAt: Date | null
  ): Promise<any[]> {
    return microsoftConnectorService.fetchThreads(accessToken, lastSyncAt);
  }

  /**
   * Fetch threads from Yahoo Mail via OAuth
   */
  private async fetchYahooThreads(
    accessToken: string,
    lastSyncAt: Date | null,
    accountId: string
  ): Promise<any[]> {
    try {
      console.log('Attempting Yahoo Mail sync with OAuth token');
      
      const account = await prisma.emailAccount.findUnique({
        where: { id: accountId },
        select: { email: true },
      });

      if (!account) {
        throw new Error('Email account not found');
      }

      // Use Yahoo Mail REST API approach (with mock data for testing)
      console.log('Using Yahoo Mail REST API...');
      const threads = await yahooConnectorService.fetchThreads(accessToken, lastSyncAt);
      console.log(`Yahoo Mail API returned ${threads.length} threads`);
      return threads;
      
    } catch (error) {
      console.error('Yahoo fetch threads error:', error);
      
      // If OAuth fails, provide helpful error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage?.includes('authentication') || errorMessage?.includes('timeout')) {
        throw new Error('Yahoo Mail OAuth authentication failed. This may be because:\n' +
          '1. The Yahoo app needs "Email - Read" permissions enabled\n' +
          '2. The OAuth token may have expired\n' +
          '3. Yahoo IMAP OAuth2 may not be properly configured\n\n' +
          'Please check your Yahoo Developer Console and ensure "Email - Read" is enabled.');
      }
      
      throw error;
    }
  }

  /**
   * Fetch threads via IMAP
   */
  private async fetchImapThreads(
    accountId: string,
    lastSyncAt: Date | null
  ): Promise<any[]> {
    // Get IMAP configuration from environment or account settings
    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
      select: { email: true, provider: true },
    });

    if (!account) {
      throw new Error('Email account not found');
    }

    // For Yahoo, use environment variables
    if (account.provider === 'yahoo') {
      const config = {
        host: process.env.YAHOO_IMAP_HOST || 'imap.mail.yahoo.com',
        port: parseInt(process.env.YAHOO_IMAP_PORT || '993'),
        user: process.env.YAHOO_EMAIL || account.email,
        password: process.env.YAHOO_APP_PASSWORD || '',
        tls: true,
      };

      if (!config.password) {
        console.log('Yahoo app password not configured in environment');
        return [];
      }

      return imapConnectorService.fetchThreads(config, lastSyncAt);
    }

    // For other IMAP providers, configuration would need to be stored in database
    console.log(`IMAP sync not configured for provider: ${account.provider}`);
    return [];
  }

  /**
   * Store threads in database
   * Returns array of thread IDs that were created or updated
   */
  private async storeThreads(
    userId: string,
    accountId: string,
    threads: any[]
  ): Promise<string[]> {
    const storedThreadIds: string[] = [];

    // Get user's email to determine isFromUser
    const emailAccount = await prisma.emailAccount.findUnique({
      where: { id: accountId },
      select: { email: true },
    });
    const userEmail = emailAccount?.email.toLowerCase();

    for (const thread of threads) {
      try {
        // Check if thread already exists
        const existing = await prisma.thread.findFirst({
          where: {
            emailAccountId: accountId,
            externalId: thread.externalId,
          },
        });

        let threadId: string;

        if (existing) {
          // Update existing thread
          await prisma.thread.update({
            where: { id: existing.id },
            data: {
              subject: thread.subject,
              participants: thread.participants,
              lastMessageAt: thread.lastMessageAt,
              summary: thread.summary,
              updatedAt: new Date(),
            },
          });
          threadId = existing.id;
        } else {
          // Create new thread
          const newThread = await prisma.thread.create({
            data: {
              userId,
              emailAccountId: accountId,
              externalId: thread.externalId,
              subject: thread.subject,
              participants: thread.participants,
              classification: 'noise', // Default, will be updated by AI
              category: 'waiting', // Default
              nextActionOwner: 'other', // Default
              lastMessageAt: thread.lastMessageAt,
              summary: thread.summary,
            },
          });
          threadId = newThread.id;

          // Auto-create contacts from email participants
          try {
            if (userEmail) {
              await contactAutoCreationService.createContactsFromParticipants(
                userId,
                thread.participants,
                userEmail
              );
            }

            // Also try to update contact roles based on email content
            if (userEmail) {
              for (const participant of thread.participants) {
                let email: string;
                
                // Handle different participant formats
                if (typeof participant === 'string') {
                  const emailMatch = participant.match(/<(.+?)>/) || [null, participant];
                  email = emailMatch[1] || participant;
                } else if (typeof participant === 'object' && participant.email) {
                  email = participant.email;
                } else {
                  continue;
                }

                if (email.toLowerCase() !== userEmail.toLowerCase()) {
                  await contactAutoCreationService.updateContactRoleFromContext(
                    userId,
                    email,
                    thread.subject,
                    thread.summary
                  );
                }
              }
            }
          } catch (contactError) {
            console.error(`Error creating contacts for thread ${threadId}:`, contactError);
            // Don't fail the sync if contact creation fails
          }

          // Create timeline event for new email thread
          try {
            await timelineService.createEmailEvent(
              userId,
              threadId,
              `New email: ${thread.subject}`,
              thread.summary
            );
          } catch (timelineError) {
            console.error(`Error creating timeline event for thread ${threadId}:`, timelineError);
            // Don't fail the sync if timeline creation fails
          }
        }

        // Store individual messages if available
        if (thread.messages && Array.isArray(thread.messages)) {
          for (const message of thread.messages) {
            try {
              // Check if message already exists
              const existingMessage = await prisma.message.findUnique({
                where: {
                  threadId_externalId: {
                    threadId,
                    externalId: message.externalId,
                  },
                },
              });

              if (!existingMessage) {
                // Determine if message is from user
                const isFromUser = userEmail ? message.from?.email?.toLowerCase() === userEmail : false;

                await prisma.message.create({
                  data: {
                    threadId,
                    externalId: message.externalId,
                    from: message.from,
                    to: message.to || [],
                    cc: message.cc || [],
                    subject: message.subject,
                    body: message.body,
                    bodyHtml: message.bodyHtml,
                    sentAt: message.sentAt,
                    receivedAt: message.receivedAt,
                    isFromUser,
                  },
                });
              }
            } catch (messageError) {
              console.error(`Error storing message ${message.externalId}:`, messageError);
              // Don't fail the thread sync if a message fails
            }
          }
        }

        storedThreadIds.push(threadId);

        // Automatically link thread to properties and contacts
        try {
          await threadLinkingService.autoLinkThread(threadId);
        } catch (linkError) {
          console.error(`Error linking thread ${threadId}:`, linkError);
          // Don't fail the sync if linking fails
        }
      } catch (error) {
        console.error(`Error storing thread ${thread.externalId}:`, error);
      }
    }

    return storedThreadIds;
  }

  /**
   * Trigger manual sync for a specific account
   */
  async triggerManualSync(accountId: string): Promise<SyncResult> {
    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        userId: true,
        provider: true,
        lastSyncAt: true,
      },
    });

    if (!account) {
      throw new Error('Email account not found');
    }

    // Convert account to SyncJob format
    const syncJob: SyncJob = {
      accountId: account.id,
      userId: account.userId,
      provider: account.provider,
      lastSyncAt: account.lastSyncAt,
    };

    return this.syncAccount(syncJob);
  }
}

export const syncEngineService = new SyncEngineService();
