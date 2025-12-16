/**
 * IMAP Connector Service
 * Handles IMAP integration for email providers without rich API support
 */

import Imap from 'imap';
import { simpleParser, ParsedMail, AddressObject } from 'mailparser';
import { inspect } from 'util';

export interface ParsedMessage {
  externalId: string;
  from: { name: string; email: string };
  to: Array<{ name: string; email: string }>;
  cc: Array<{ name: string; email: string }>;
  subject: string;
  body: string;
  bodyHtml?: string;
  sentAt: Date;
  receivedAt: Date;
  inReplyTo?: string;
  references?: string[];
}

export interface ParsedThread {
  externalId: string;
  subject: string;
  participants: Array<{ name: string; email: string }>;
  lastMessageAt: Date;
  summary: string;
  messages: ParsedMessage[];
}

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
  xoauth2?: string; // OAuth2 access token for XOAUTH2 authentication
}

export class ImapConnectorService {
  /**
   * Fetch threads via IMAP
   */
  async fetchThreads(
    config: ImapConfig,
    lastSyncAt: Date | null
  ): Promise<ParsedThread[]> {
    console.log('Fetching emails via IMAP from:', config.host);

    const messages = await this.fetchMessages(config, lastSyncAt);
    console.log(`Fetched ${messages.length} messages from IMAP`);

    // Group messages into threads
    const threads = this.groupMessagesIntoThreads(messages);
    console.log(`Grouped into ${threads.length} threads`);

    return threads;
  }

  /**
   * Fetch messages from IMAP server
   */
  private async fetchMessages(
    config: ImapConfig,
    lastSyncAt: Date | null
  ): Promise<ParsedMessage[]> {
    return new Promise((resolve, reject) => {
      // Build IMAP configuration
      const imapConfig: any = {
        user: config.user,
        host: config.host,
        port: config.port,
        tls: config.tls,
        tlsOptions: { rejectUnauthorized: false },
      };

      // Use XOAUTH2 if provided, otherwise use password
      if (config.xoauth2) {
        // Generate XOAUTH2 token for Yahoo/Gmail OAuth
        const xoauth2Token = this.generateXOAuth2Token(config.user, config.xoauth2);
        imapConfig.xoauth2 = xoauth2Token;
      } else {
        imapConfig.password = config.password;
      }

      const imap = new Imap(imapConfig);

      const messages: ParsedMessage[] = [];

      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          // Build search criteria
          const searchCriteria: any[] = ['ALL'];
          if (lastSyncAt) {
            searchCriteria.push(['SINCE', lastSyncAt]);
          }

          imap.search(searchCriteria, (err, results) => {
            if (err) {
              imap.end();
              return reject(err);
            }

            if (!results || results.length === 0) {
              console.log('No new messages found');
              imap.end();
              return resolve([]);
            }

            console.log(`Found ${results.length} messages to fetch`);

            const fetch = imap.fetch(results, {
              bodies: '',
              struct: true,
            });

            fetch.on('message', (msg, seqno) => {
              msg.on('body', (stream, info) => {
                simpleParser(stream, async (err, parsed) => {
                  if (err) {
                    console.error('Error parsing message:', err);
                    return;
                  }

                  try {
                    const message = this.parseMessage(parsed, seqno);
                    messages.push(message);
                  } catch (parseErr) {
                    console.error('Error converting parsed message:', parseErr);
                  }
                });
              });
            });

            fetch.once('error', (err) => {
              console.error('Fetch error:', err);
              imap.end();
              reject(err);
            });

            fetch.once('end', () => {
              console.log('Done fetching messages');
              imap.end();
            });
          });
        });
      });

      imap.once('error', (err) => {
        console.error('IMAP connection error:', err);
        reject(err);
      });

      imap.once('end', () => {
        console.log('IMAP connection ended');
        resolve(messages);
      });

      imap.connect();
    });
  }

  /**
   * Parse a mailparser message into our format
   */
  private parseMessage(parsed: ParsedMail, seqno: number): ParsedMessage {
    const from = this.extractAddress(parsed.from);
    const to = this.extractAddresses(parsed.to);
    const cc = this.extractAddresses(parsed.cc);

    return {
      externalId: parsed.messageId || `imap-${seqno}`,
      from,
      to,
      cc,
      subject: parsed.subject || '(No Subject)',
      body: parsed.text || '',
      bodyHtml: parsed.html || undefined,
      sentAt: parsed.date || new Date(),
      receivedAt: new Date(),
      inReplyTo: parsed.inReplyTo,
      references: parsed.references,
    };
  }

  /**
   * Extract single address from AddressObject
   */
  private extractAddress(
    addressObj: AddressObject | AddressObject[] | undefined
  ): { name: string; email: string } {
    if (!addressObj) {
      return { name: 'Unknown', email: 'unknown@example.com' };
    }

    const addresses = Array.isArray(addressObj) ? addressObj : [addressObj];
    const first = addresses[0]?.value?.[0];

    if (!first) {
      return { name: 'Unknown', email: 'unknown@example.com' };
    }

    return {
      name: first.name || first.address?.split('@')[0] || 'Unknown',
      email: first.address || 'unknown@example.com',
    };
  }

  /**
   * Extract multiple addresses from AddressObject
   */
  private extractAddresses(
    addressObj: AddressObject | AddressObject[] | undefined
  ): Array<{ name: string; email: string }> {
    if (!addressObj) {
      return [];
    }

    const addresses = Array.isArray(addressObj) ? addressObj : [addressObj];
    const result: Array<{ name: string; email: string }> = [];

    for (const addr of addresses) {
      if (addr.value) {
        for (const item of addr.value) {
          result.push({
            name: item.name || item.address?.split('@')[0] || 'Unknown',
            email: item.address || 'unknown@example.com',
          });
        }
      }
    }

    return result;
  }

  /**
   * Group messages into threads based on subject and references
   */
  private groupMessagesIntoThreads(messages: ParsedMessage[]): ParsedThread[] {
    const threadMap = new Map<string, ParsedMessage[]>();

    // Group by subject (simple threading)
    for (const message of messages) {
      const threadKey = this.normalizeSubject(message.subject);
      const existing = threadMap.get(threadKey) || [];
      existing.push(message);
      threadMap.set(threadKey, existing);
    }

    // Convert to thread objects
    const threads: ParsedThread[] = [];
    for (const [subject, threadMessages] of threadMap.entries()) {
      // Sort messages by date
      threadMessages.sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());

      // Get all unique participants
      const participantMap = new Map<string, { name: string; email: string }>();
      for (const msg of threadMessages) {
        participantMap.set(msg.from.email, msg.from);
        for (const recipient of [...msg.to, ...msg.cc]) {
          participantMap.set(recipient.email, recipient);
        }
      }

      const lastMessage = threadMessages[threadMessages.length - 1];

      threads.push({
        externalId: threadMessages[0].externalId,
        subject: threadMessages[0].subject,
        participants: Array.from(participantMap.values()),
        lastMessageAt: lastMessage.sentAt,
        summary: this.generateSummary(threadMessages),
        messages: threadMessages,
      });
    }

    return threads;
  }

  /**
   * Normalize subject for threading (remove Re:, Fwd:, etc.)
   */
  private normalizeSubject(subject: string): string {
    return subject
      .replace(/^(Re|Fwd|Fw):\s*/gi, '')
      .trim()
      .toLowerCase();
  }

  /**
   * Generate a simple summary from messages
   */
  private generateSummary(messages: ParsedMessage[]): string {
    if (messages.length === 0) return '';
    
    const firstMessage = messages[0];
    const preview = firstMessage.body.substring(0, 200).trim();
    
    if (messages.length === 1) {
      return preview;
    }
    
    return `${messages.length} messages. Latest: ${preview}`;
  }

  /**
   * Strip HTML tags from string
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate XOAUTH2 token for IMAP authentication
   * Format: base64("user=" + user + "\x01auth=Bearer " + accessToken + "\x01\x01")
   */
  private generateXOAuth2Token(user: string, accessToken: string): string {
    const authString = `user=${user}\x01auth=Bearer ${accessToken}\x01\x01`;
    return Buffer.from(authString).toString('base64');
  }
}

export const imapConnectorService = new ImapConnectorService();
