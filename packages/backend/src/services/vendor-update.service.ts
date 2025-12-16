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
    const emailDraft = this.formatVendorUpdateEmail({
      propertyAddress: property.address,
      vendorNames: property.vendors.map(v => v.name),
      metrics,
      buyerFeedback,
      communicationSummary,
    });
    
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
   * Format the vendor update as a professional email draft
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
