/**
 * Microsoft Graph Connector Service
 * Handles Microsoft Graph API integration for Outlook/Hotmail thread fetching
 */

export interface MicrosoftMessage {
  id: string;
  conversationId: string;
  subject: string;
  bodyPreview: string;
  body: {
    contentType: string;
    content: string;
  };
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  ccRecipients: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  receivedDateTime: string;
  sentDateTime: string;
}

export interface ParsedThread {
  externalId: string;
  subject: string;
  participants: Array<{ name: string; email: string }>;
  lastMessageAt: Date;
  summary: string;
  body: string;
}

export class MicrosoftConnectorService {
  private readonly GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

  /**
   * Fetch threads from Microsoft Graph API
   */
  async fetchThreads(
    accessToken: string,
    lastSyncAt: Date | null
  ): Promise<ParsedThread[]> {
    try {
      // Build filter for incremental sync
      let filter = '';
      if (lastSyncAt) {
        const isoDate = lastSyncAt.toISOString();
        filter = `receivedDateTime ge ${isoDate}`;
      }

      // Fetch messages
      const messages = await this.listMessages(accessToken, filter);

      if (!messages || messages.length === 0) {
        return [];
      }

      // Group messages by conversation ID
      const conversations = this.groupByConversation(messages);

      // Parse each conversation as a thread
      return Array.from(conversations.values()).map((msgs) =>
        this.parseThread(msgs)
      );
    } catch (error) {
      console.error('Error fetching Microsoft threads:', error);
      throw error;
    }
  }

  /**
   * List messages from mailbox
   */
  private async listMessages(
    accessToken: string,
    filter: string,
    top: number = 100
  ): Promise<MicrosoftMessage[]> {
    let url = `${this.GRAPH_API_BASE}/me/messages?$top=${top}&$orderby=receivedDateTime desc`;
    
    if (filter) {
      url += `&$filter=${encodeURIComponent(filter)}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Microsoft Graph API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.value || [];
  }

  /**
   * Group messages by conversation ID
   */
  private groupByConversation(
    messages: MicrosoftMessage[]
  ): Map<string, MicrosoftMessage[]> {
    const conversations = new Map<string, MicrosoftMessage[]>();

    for (const message of messages) {
      const conversationId = message.conversationId;
      if (!conversations.has(conversationId)) {
        conversations.set(conversationId, []);
      }
      conversations.get(conversationId)!.push(message);
    }

    // Sort messages within each conversation by date
    for (const [, msgs] of conversations) {
      msgs.sort(
        (a, b) =>
          new Date(a.receivedDateTime).getTime() -
          new Date(b.receivedDateTime).getTime()
      );
    }

    return conversations;
  }

  /**
   * Parse conversation into standardized thread format
   */
  private parseThread(messages: MicrosoftMessage[]): ParsedThread {
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];

    // Extract subject
    const subject = firstMessage.subject || '(No Subject)';

    // Extract participants
    const participants = this.extractParticipants(messages);

    // Extract last message date
    const lastMessageAt = new Date(lastMessage.receivedDateTime);

    // Extract body from last message
    const body = this.extractBody(lastMessage);

    // Create summary (first 200 chars of body)
    const summary = body.substring(0, 200) + (body.length > 200 ? '...' : '');

    return {
      externalId: firstMessage.conversationId,
      subject,
      participants,
      lastMessageAt,
      summary,
      body,
    };
  }

  /**
   * Extract participants from all messages
   */
  private extractParticipants(
    messages: MicrosoftMessage[]
  ): Array<{ name: string; email: string }> {
    const participantMap = new Map<string, { name: string; email: string }>();

    for (const message of messages) {
      // Add sender
      if (message.from?.emailAddress) {
        const { name, address } = message.from.emailAddress;
        participantMap.set(address, { name: name || address, email: address });
      }

      // Add recipients
      for (const recipient of message.toRecipients || []) {
        const { name, address } = recipient.emailAddress;
        participantMap.set(address, { name: name || address, email: address });
      }

      // Add CC recipients
      for (const recipient of message.ccRecipients || []) {
        const { name, address } = recipient.emailAddress;
        participantMap.set(address, { name: name || address, email: address });
      }
    }

    return Array.from(participantMap.values());
  }

  /**
   * Extract body text from message
   */
  private extractBody(message: MicrosoftMessage): string {
    if (!message.body) {
      return message.bodyPreview || '';
    }

    const { contentType, content } = message.body;

    if (contentType === 'text') {
      return content;
    }

    if (contentType === 'html') {
      return this.stripHtml(content);
    }

    return message.bodyPreview || '';
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

export const microsoftConnectorService = new MicrosoftConnectorService();
