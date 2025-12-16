/**
 * Gmail Connector Service
 * Handles Gmail API integration for thread fetching
 */

export interface GmailThread {
  id: string;
  messages: GmailMessage[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ mimeType: string; body?: { data?: string } }>;
  };
  internalDate: string;
}

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

export class GmailConnectorService {
  private readonly GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

  /**
   * Fetch threads from Gmail API
   */
  async fetchThreads(
    accessToken: string,
    lastSyncAt: Date | null
  ): Promise<ParsedThread[]> {
    try {
      // Build query for incremental sync
      let query = 'in:inbox OR in:sent';
      if (lastSyncAt) {
        const timestamp = Math.floor(lastSyncAt.getTime() / 1000);
        query += ` after:${timestamp}`;
      }

      // List threads
      const threadList = await this.listThreads(accessToken, query);
      
      if (!threadList || threadList.length === 0) {
        return [];
      }

      // Fetch full thread details
      const threads = await Promise.all(
        threadList.map((threadId) => this.getThread(accessToken, threadId))
      );

      // Parse threads
      return threads
        .filter((thread) => thread !== null)
        .map((thread) => this.parseThread(thread!));
    } catch (error) {
      console.error('Error fetching Gmail threads:', error);
      throw error;
    }
  }

  /**
   * List thread IDs matching query
   */
  private async listThreads(
    accessToken: string,
    query: string,
    maxResults: number = 100
  ): Promise<string[]> {
    const url = `${this.GMAIL_API_BASE}/users/me/threads?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.threads?.map((t: { id: string }) => t.id) || [];
  }

  /**
   * Get full thread details
   */
  private async getThread(
    accessToken: string,
    threadId: string
  ): Promise<GmailThread | null> {
    const url = `${this.GMAIL_API_BASE}/users/me/threads/${threadId}?format=full`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch thread ${threadId}: ${response.status}`);
      return null;
    }

    return response.json();
  }

  /**
   * Parse Gmail thread into standardized format
   */
  private parseThread(thread: GmailThread): ParsedThread {
    const gmailMessages = thread.messages || [];
    const firstMessage = gmailMessages[0];
    const lastMessage = gmailMessages[gmailMessages.length - 1];

    // Extract subject
    const subject = this.getHeader(firstMessage, 'Subject') || '(No Subject)';

    // Extract participants
    const participants = this.extractParticipants(gmailMessages);

    // Extract last message date
    const lastMessageAt = new Date(parseInt(lastMessage.internalDate));

    // Parse all messages
    const messages = gmailMessages.map(msg => this.parseMessage(msg));

    // Create summary from first message
    const firstBody = messages[0]?.body || '';
    const summary = firstBody.substring(0, 200) + (firstBody.length > 200 ? '...' : '');

    return {
      externalId: thread.id,
      subject,
      participants,
      lastMessageAt,
      summary,
      messages,
    };
  }

  /**
   * Parse individual Gmail message
   */
  private parseMessage(message: GmailMessage): ParsedMessage {
    const from = this.parseEmailAddress(this.getHeader(message, 'From') || '');
    const to = this.parseEmailAddressList(this.getHeader(message, 'To') || '');
    const cc = this.parseEmailAddressList(this.getHeader(message, 'Cc') || '');
    const subject = this.getHeader(message, 'Subject') || '(No Subject)';
    const inReplyTo = this.getHeader(message, 'In-Reply-To') || undefined;
    const references = this.getHeader(message, 'References')?.split(/\s+/) || undefined;

    // Extract both plain text and HTML
    const bodyText = this.extractBodyText(message);
    const bodyHtml = this.extractBodyHtml(message);

    const sentAt = new Date(parseInt(message.internalDate));

    return {
      externalId: message.id,
      from: from || { name: 'Unknown', email: 'unknown@example.com' },
      to,
      cc,
      subject,
      body: bodyText,
      bodyHtml,
      sentAt,
      receivedAt: sentAt,
      inReplyTo,
      references,
    };
  }

  /**
   * Parse list of email addresses
   */
  private parseEmailAddressList(addressString: string): Array<{ name: string; email: string }> {
    if (!addressString) return [];
    
    const addresses = addressString.split(',');
    return addresses
      .map(addr => this.parseEmailAddress(addr.trim()))
      .filter((addr): addr is { name: string; email: string } => addr !== null);
  }

  /**
   * Extract plain text body
   */
  private extractBodyText(message: GmailMessage): string {
    const textPart = this.findPart(message.payload.parts || [], 'text/plain');
    if (textPart?.body?.data) {
      return this.decodeBase64(textPart.body.data);
    }

    // Fall back to HTML stripped
    const htmlPart = this.findPart(message.payload.parts || [], 'text/html');
    if (htmlPart?.body?.data) {
      const html = this.decodeBase64(htmlPart.body.data);
      return this.stripHtml(html);
    }

    // Fall back to message body
    if (message.payload.body?.data) {
      return this.decodeBase64(message.payload.body.data);
    }

    return message.snippet || '';
  }

  /**
   * Extract HTML body
   */
  private extractBodyHtml(message: GmailMessage): string | undefined {
    const htmlPart = this.findPart(message.payload.parts || [], 'text/html');
    if (htmlPart?.body?.data) {
      return this.decodeBase64(htmlPart.body.data);
    }

    // Check if main body is HTML
    if (message.payload.body?.data) {
      const content = this.decodeBase64(message.payload.body.data);
      if (content.includes('<html') || content.includes('<body')) {
        return content;
      }
    }

    return undefined;
  }

  /**
   * Get header value from message
   */
  private getHeader(message: GmailMessage, headerName: string): string | null {
    const header = message.payload.headers.find(
      (h) => h.name.toLowerCase() === headerName.toLowerCase()
    );
    return header?.value || null;
  }

  /**
   * Extract participants from all messages in thread
   */
  private extractParticipants(
    messages: GmailMessage[]
  ): Array<{ name: string; email: string }> {
    const participantMap = new Map<string, { name: string; email: string }>();

    for (const message of messages) {
      // Extract From
      const from = this.getHeader(message, 'From');
      if (from) {
        const parsed = this.parseEmailAddress(from);
        if (parsed) {
          participantMap.set(parsed.email, parsed);
        }
      }

      // Extract To
      const to = this.getHeader(message, 'To');
      if (to) {
        const addresses = to.split(',');
        for (const addr of addresses) {
          const parsed = this.parseEmailAddress(addr.trim());
          if (parsed) {
            participantMap.set(parsed.email, parsed);
          }
        }
      }

      // Extract Cc
      const cc = this.getHeader(message, 'Cc');
      if (cc) {
        const addresses = cc.split(',');
        for (const addr of addresses) {
          const parsed = this.parseEmailAddress(addr.trim());
          if (parsed) {
            participantMap.set(parsed.email, parsed);
          }
        }
      }
    }

    return Array.from(participantMap.values());
  }

  /**
   * Parse email address string (e.g., "John Doe <john@example.com>")
   */
  private parseEmailAddress(
    address: string
  ): { name: string; email: string } | null {
    const match = address.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
    if (!match) return null;

    const name = match[1]?.trim() || match[2].split('@')[0];
    const email = match[2].trim();

    return { name, email };
  }

  /**
   * Find message part by MIME type
   */
  private findPart(
    parts: Array<{ mimeType: string; body?: { data?: string }; parts?: any[] }>,
    mimeType: string
  ): { body?: { data?: string } } | null {
    for (const part of parts) {
      if (part.mimeType === mimeType) {
        return part;
      }
      if (part.parts) {
        const found = this.findPart(part.parts, mimeType);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Decode base64url encoded string
   */
  private decodeBase64(data: string): string {
    // Gmail uses base64url encoding (- and _ instead of + and /)
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
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
}

export const gmailConnectorService = new GmailConnectorService();
