import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface EmailParticipant {
  name?: string;
  email: string;
}

/**
 * Contact Auto-Creation Service
 * Automatically creates contacts from email participants
 */
export class ContactAutoCreationService {

  /**
   * Create contacts from email participants if they don't exist
   */
  async createContactsFromParticipants(
    userId: string,
    participants: any,
    userEmail: string
  ): Promise<void> {
    try {
      // Ensure participants is an array
      if (!Array.isArray(participants)) {
        console.log('Participants is not an array:', typeof participants, participants);
        return;
      }

      for (const participant of participants) {
        let email: string;
        let name: string;

        // Handle different participant formats
        if (typeof participant === 'string') {
          // Legacy format: "Name <email@domain.com>" or just "email@domain.com"
          const emailMatch = participant.match(/<(.+?)>/) || [null, participant];
          email = emailMatch[1] || participant;
          name = participant.includes('<')
            ? participant.split('<')[0].trim().replace(/"/g, '')
            : this.extractNameFromEmail(email);
        } else if (typeof participant === 'object' && participant.email) {
          // New format: { name: "Name", email: "email@domain.com" }
          email = participant.email;
          name = participant.name || this.extractNameFromEmail(email);
        } else {
          console.log('Unknown participant format:', typeof participant, participant);
          continue;
        }

        // Skip the user's own email
        if (email.toLowerCase() === userEmail.toLowerCase()) {
          continue;
        }

        // Check if contact already exists
        const existingContact = await prisma.contact.findFirst({
          where: {
            userId,
            emails: {
              has: email
            }
          }
        });

        if (!existingContact) {
          // Determine role based on email domain and patterns
          const role = this.determineContactRole(email, name);

          console.log(`📧 Creating new contact: ${name} (${email}) as ${role}`);

          await prisma.contact.create({
            data: {
              userId,
              name,
              emails: [email],
              phones: [],
              role,
              relationshipNotes: [
                {
                  id: Date.now().toString(),
                  content: `Contact created automatically from email communication`,
                  source: 'email',
                  createdAt: new Date(),
                }
              ]
            }
          });
        }
      }
    } catch (error) {
      console.error('Error creating contacts from participants:', error);
      // Don't throw - we don't want to fail email sync if contact creation fails
    }
  }

  /**
   * Extract a reasonable name from an email address
   */
  private extractNameFromEmail(email: string): string {
    const localPart = email.split('@')[0];

    // Handle common patterns
    if (localPart.includes('.')) {
      // john.smith -> John Smith
      return localPart
        .split('.')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
    } else if (localPart.includes('_')) {
      // john_smith -> John Smith
      return localPart
        .split('_')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
    } else {
      // johnsmith -> Johnsmith
      return localPart.charAt(0).toUpperCase() + localPart.slice(1).toLowerCase();
    }
  }

  /**
   * Determine contact role based on email patterns and context
   */
  private determineContactRole(email: string, name: string): string {
    const emailLower = email.toLowerCase();
    const nameLower = name.toLowerCase();

    // Tradesperson patterns
    if (
      emailLower.includes('plumb') ||
      emailLower.includes('sparky') ||
      emailLower.includes('electric') ||
      emailLower.includes('clean') ||
      emailLower.includes('build') ||
      emailLower.includes('maintenance') ||
      emailLower.includes('repair') ||
      nameLower.includes('plumb') ||
      nameLower.includes('electric') ||
      nameLower.includes('maintenance')
    ) {
      return 'tradesperson';
    }

    // Agent patterns (other agents)
    if (
      emailLower.includes('realty') ||
      emailLower.includes('agent') ||
      emailLower.includes('broker') ||
      nameLower.includes('realty') ||
      nameLower.includes('agency')
    ) {
      return 'agent';
    }

    // Default to 'other' - can be manually updated later
    return 'other';
  }

  /**
   * Update contact role based on email content analysis
   */
  async updateContactRoleFromContext(
    userId: string,
    email: string,
    emailSubject: string,
    emailSummary: string
  ): Promise<void> {
    try {
      const contact = await prisma.contact.findFirst({
        where: {
          userId,
          emails: {
            has: email
          }
        }
      });

      if (!contact || contact.role !== 'other') {
        return; // Only update if contact exists and is currently 'other'
      }

      const content = `${emailSubject} ${emailSummary}`.toLowerCase();
      let newRole = contact.role;

      // Analyze content for buyer indicators
      if (
        content.includes('interested in buying') ||
        content.includes('looking to purchase') ||
        content.includes('want to buy') ||
        content.includes('buyer') ||
        content.includes('purchase') ||
        content.includes('offer')
      ) {
        newRole = 'buyer';
      }
      // Analyze content for vendor indicators
      else if (
        content.includes('want to sell') ||
        content.includes('looking to sell') ||
        content.includes('vendor') ||
        content.includes('seller') ||
        content.includes('listing') ||
        content.includes('property for sale')
      ) {
        newRole = 'vendor';
      }
      // Analyze content for tradesperson indicators
      else if (
        content.includes('quote') ||
        content.includes('repair') ||
        content.includes('fix') ||
        content.includes('maintenance') ||
        content.includes('invoice') ||
        content.includes('plumbing') ||
        content.includes('electrical')
      ) {
        newRole = 'tradesperson';
      }
      // Analyze content for agent indicators
      else if (
        content.includes('conjunctional') ||
        content.includes('split') ||
        content.includes('other agency') ||
        content.includes('referral')
      ) {
        newRole = 'agent';
      }

      if (newRole !== contact.role) {
        console.log(`🔄 Updating contact role: ${contact.name} (${email}) from ${contact.role} to ${newRole}`);

        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            role: newRole,
            relationshipNotes: [
              ...contact.relationshipNotes as any[],
              {
                id: Date.now().toString(),
                content: `Role updated to ${newRole} based on email content analysis`,
                source: 'ai',
                createdAt: new Date(),
              }
            ]
          }
        });
      }
    } catch (error) {
      console.error('Error updating contact role from context:', error);
      // Don't throw - this is a nice-to-have feature
    }
  }
}

export const contactAutoCreationService = new ContactAutoCreationService();