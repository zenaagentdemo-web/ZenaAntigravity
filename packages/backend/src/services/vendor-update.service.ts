import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface VendorUpdateOptions {
  propertyId: string;
  userId: string;
}

export interface VendorUpdateResult {
  propertyAddress: string;
  vendorNames: string[];
  emailDraft: string;
  metrics: {
    viewings: number;
    inquiries: number;
    offers: number;
  };
  buyerFeedback: string[];
  communicationSummary: string;
}

/**
 * Service for generating vendor update emails with buyer feedback,
 * viewing activity, and campaign metrics
 */
export class VendorUpdateService {
  /**
   * Generate a vendor update for a property
   */
  async generateVendorUpdate(options: VendorUpdateOptions): Promise<VendorUpdateResult> {
    const { propertyId, userId } = options;

    // Fetch property with all related data
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        userId,
      },
      include: {
        vendors: true,
        buyers: true,
        threads: {
          where: {
            classification: { in: ['buyer', 'vendor'] },
          },
          orderBy: { lastMessageAt: 'desc' },
        },
        deals: {
          include: {
            contacts: true,
          },
        },
      },
    });

    if (!property) {
      throw new Error('Property not found');
    }

    // Gather metrics
    const metrics = await this.gatherMetrics(propertyId, userId);

    // Gather buyer feedback
    const buyerFeedback = await this.gatherBuyerFeedback(propertyId, userId);

    // Create communication summary
    const communicationSummary = this.createCommunicationSummary(property.threads);

    // Generate email draft
    let emailDraft: string;
    try {
      emailDraft = await this.generateStrategicEmailDraftWithLLM({
        propertyAddress: property.address,
        vendorNames: property.vendors.map(v => v.name),
        metrics,
        buyerFeedback,
        communicationSummary,
      });
    } catch (error) {
      console.warn('Strategic LLM draft failed, falling back to template:', error);
      emailDraft = this.formatVendorUpdateEmail({
        propertyAddress: property.address,
        vendorNames: property.vendors.map(v => v.name),
        metrics,
        buyerFeedback,
        communicationSummary,
      });
    }

    return {
      propertyAddress: property.address,
      vendorNames: property.vendors.map(v => v.name),
      emailDraft,
      metrics,
      buyerFeedback,
      communicationSummary,
    };
  }

  /**
   * BRAIN-FIRST: Generate a strategic vendor update email using LLM
   */
  private async generateStrategicEmailDraftWithLLM(data: {
    propertyAddress: string;
    vendorNames: string[];
    metrics: { viewings: number; inquiries: number; offers: number };
    buyerFeedback: string[];
    communicationSummary: string;
  }): Promise<string> {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const { propertyAddress, vendorNames, metrics, buyerFeedback, communicationSummary } = data;
    const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

    const prompt = `You are Zena, a strategic real estate AI assistant. Draft a professional vendor update email for the property: ${propertyAddress}.
    
VENDOR(S): ${vendorNames.join(', ')}

CAMPAIGN DATA:
- Viewings: ${metrics.viewings}
- Inquiries: ${metrics.inquiries}
- Offers: ${metrics.offers}

BUYER FEEDBACK:
${buyerFeedback.map(f => `- ${f}`).join('\n') || 'No specific feedback yet.'}

RECENT ACTIVITY:
${communicationSummary}

INSTRUCTIONS:
1. Start with a warm, professional greeting.
2. Provide a strategic interpretation of the metrics. Don't just list them; explain what they mean for the campaign (e.g., if viewings are high but no offers, we might need a price review).
3. Summarize the buyer sentiment from the feedback provided.
4. Conclude with a clear next step or recommendation.
5. Use UK English spelling and a tone that is confident, expert, and transparent.
6. The email should be ready to send.
7. Return ONLY the email body text.`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json() as any;
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    return text.trim();
  }

  /**
   * Gather key metrics for the property
   */
  private async gatherMetrics(propertyId: string, userId: string): Promise<{
    viewings: number;
    inquiries: number;
    offers: number;
  }> {
    // Count viewings from timeline events
    const viewings = await prisma.timelineEvent.count({
      where: {
        userId,
        entityType: 'property',
        entityId: propertyId,
        type: 'meeting',
        summary: { contains: 'viewing', mode: 'insensitive' },
      },
    });

    // Count inquiries from buyer threads
    const inquiries = await prisma.thread.count({
      where: {
        userId,
        propertyId,
        classification: 'buyer',
      },
    });

    // Count offers from deals
    const offers = await prisma.deal.count({
      where: {
        userId,
        propertyId,
        stage: { in: ['offer', 'conditional', 'pre_settlement', 'sold'] },
      },
    });

    return { viewings, inquiries, offers };
  }

  /**
   * Gather and anonymize buyer feedback
   */
  private async gatherBuyerFeedback(propertyId: string, userId: string): Promise<string[]> {
    // Get buyer threads with feedback
    const buyerThreads = await prisma.thread.findMany({
      where: {
        userId,
        propertyId,
        classification: 'buyer',
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 10,
    });

    // Extract and anonymize feedback
    const feedback: string[] = [];

    for (const thread of buyerThreads) {
      // Extract feedback from summary
      if (thread.summary && thread.summary.length > 20) {
        const anonymizedFeedback = this.anonymizeBuyerIdentity(
          thread.summary,
          thread.participants as any[]
        );
        feedback.push(anonymizedFeedback);
      }
    }

    return feedback;
  }

  /**
   * Anonymize buyer identities in feedback
   */
  private anonymizeBuyerIdentity(text: string, participants: any[]): string {
    let anonymized = text;

    // Replace buyer names with "A prospective buyer" or "An interested party"
    for (const participant of participants) {
      if (participant.name) {
        // Replace full name
        anonymized = anonymized.replace(
          new RegExp(participant.name, 'gi'),
          'a prospective buyer'
        );

        // Replace first name only
        const firstName = participant.name.split(' ')[0];
        if (firstName) {
          anonymized = anonymized.replace(
            new RegExp(`\\b${firstName}\\b`, 'gi'),
            'a prospective buyer'
          );
        }
      }

      // Replace email addresses
      if (participant.email) {
        anonymized = anonymized.replace(
          new RegExp(participant.email, 'gi'),
          '[buyer contact]'
        );
      }
    }

    return anonymized;
  }

  /**
   * Create a summary of recent communications
   */
  private createCommunicationSummary(threads: any[]): string {
    if (threads.length === 0) {
      return 'No recent communications.';
    }

    const recentThreads = threads.slice(0, 5);
    const summaries = recentThreads.map(thread => {
      const date = new Date(thread.lastMessageAt).toLocaleDateString();
      const type = thread.classification;
      return `- ${date}: ${type} communication - ${thread.subject}`;
    });

    return summaries.join('\n');
  }

  /**
   * Format the vendor update as a professional email draft (Fallback Template)
   */
  private formatVendorUpdateEmail(data: {
    propertyAddress: string;
    vendorNames: string[];
    metrics: { viewings: number; inquiries: number; offers: number };
    buyerFeedback: string[];
    communicationSummary: string;
  }): string {
    const { propertyAddress, vendorNames, metrics, buyerFeedback, communicationSummary } = data;

    const greeting = vendorNames.length > 0
      ? `Dear ${vendorNames.join(' and ')},`
      : 'Dear Vendor,';

    const lines = [
      greeting,
      '',
      `I wanted to provide you with an update on the campaign for ${propertyAddress}.`,
      '',
      '**Campaign Metrics:**',
      `- Viewings: ${metrics.viewings}`,
      `- Inquiries: ${metrics.inquiries}`,
      `- Offers: ${metrics.offers}`,
      '',
    ];

    if (buyerFeedback.length > 0) {
      lines.push('**Buyer Feedback:**');
      buyerFeedback.forEach(feedback => {
        lines.push(`- ${feedback}`);
      });
      lines.push('');
    }

    lines.push('**Recent Activity:**');
    lines.push(communicationSummary);
    lines.push('');
    lines.push('Please let me know if you have any questions or would like to discuss the campaign further.');
    lines.push('');
    lines.push('Best regards');

    return lines.join('\n');
  }
}

export const vendorUpdateService = new VendorUpdateService();
