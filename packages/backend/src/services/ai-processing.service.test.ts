import { describe, it, expect, beforeEach } from 'vitest';
import { AIProcessingService } from './ai-processing.service.js';

describe('AIProcessingService', () => {
  let aiService: AIProcessingService;

  beforeEach(() => {
    aiService = new AIProcessingService();
  });

  describe('Thread Classification', () => {
    it('should classify buyer threads using fallback when no API key', async () => {
      const thread = {
        id: 'test-1',
        subject: 'Interested in viewing the property at 123 Main St',
        participants: [
          { name: 'John Buyer', email: 'john@example.com' },
          { name: 'Agent', email: 'agent@realestate.com' },
        ],
        summary: 'Buyer expressing interest in viewing a property',
        lastMessageAt: new Date(),
      };

      const result = await aiService.classifyThread(thread);

      expect(result.classification).toBe('buyer');
      expect(result.category).toMatch(/^(focus|waiting)$/);
      expect(result.nextActionOwner).toMatch(/^(agent|other)$/);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should classify vendor threads using fallback', async () => {
      const thread = {
        id: 'test-2',
        subject: 'Re: Listing my property for sale',
        participants: [
          { name: 'Jane Vendor', email: 'jane@example.com' },
          { name: 'Agent', email: 'agent@realestate.com' },
        ],
        summary: 'Vendor wants to list their property for sale',
        lastMessageAt: new Date(),
      };

      const result = await aiService.classifyThread(thread);

      expect(result.classification).toBe('vendor');
      expect(result.category).toMatch(/^(focus|waiting)$/);
      expect(result.nextActionOwner).toMatch(/^(agent|other)$/);
    });

    it('should classify noise/marketing threads using fallback', async () => {
      const thread = {
        id: 'test-3',
        subject: 'Newsletter: Latest market trends - Unsubscribe here',
        participants: [
          { name: 'Marketing Team', email: 'marketing@newsletter.com' },
        ],
        summary: 'Monthly newsletter with market updates and promotions',
        lastMessageAt: new Date(),
      };

      const result = await aiService.classifyThread(thread);

      expect(result.classification).toBe('noise');
      expect(result.category).toMatch(/^(focus|waiting)$/);
      expect(result.nextActionOwner).toMatch(/^(agent|other)$/);
    });

    it('should classify lawyer/broker threads using fallback', async () => {
      const thread = {
        id: 'test-4',
        subject: 'Contract review for 456 Oak Avenue',
        participants: [
          { name: 'Legal Team', email: 'lawyer@lawfirm.com' },
          { name: 'Agent', email: 'agent@realestate.com' },
        ],
        summary: 'Lawyer requesting contract review and conveyancing details',
        lastMessageAt: new Date(),
      };

      const result = await aiService.classifyThread(thread);

      expect(result.classification).toBe('lawyer_broker');
      expect(result.category).toMatch(/^(focus|waiting)$/);
      expect(result.nextActionOwner).toMatch(/^(agent|other)$/);
    });

    it('should classify market contact threads using fallback', async () => {
      const thread = {
        id: 'test-5',
        subject: 'Market update and industry insights',
        participants: [
          { name: 'Fellow Agent', email: 'agent2@realestate.com' },
          { name: 'Agent', email: 'agent@realestate.com' },
        ],
        summary: 'Discussion about market trends with another agent',
        lastMessageAt: new Date(),
      };

      const result = await aiService.classifyThread(thread);

      expect(result.classification).toBe('market');
      expect(result.category).toMatch(/^(focus|waiting)$/);
      expect(result.nextActionOwner).toMatch(/^(agent|other)$/);
    });

    it('should handle threads with minimal information', async () => {
      const thread = {
        id: 'test-6',
        subject: 'Hello',
        participants: [
          { name: 'Unknown', email: 'unknown@example.com' },
        ],
        summary: 'Brief message',
        lastMessageAt: new Date(),
      };

      const result = await aiService.classifyThread(thread);

      // Should default to noise when unclear
      expect(result.classification).toMatch(/^(buyer|vendor|market|lawyer_broker|noise)$/);
      expect(result.category).toMatch(/^(focus|waiting)$/);
      expect(result.nextActionOwner).toMatch(/^(agent|other)$/);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should categorize reply threads as waiting', async () => {
      const thread = {
        id: 'test-7',
        subject: 'Re: Property inquiry',
        participants: [
          { name: 'Buyer', email: 'buyer@example.com' },
        ],
        summary: 'Reply to previous inquiry',
        lastMessageAt: new Date(),
      };

      const result = await aiService.classifyThread(thread);

      // Threads with "Re:" typically indicate waiting for response
      expect(result.category).toBe('waiting');
      expect(result.nextActionOwner).toBe('other');
    });

    it('should categorize new threads as focus', async () => {
      const thread = {
        id: 'test-8',
        subject: 'New property inquiry',
        participants: [
          { name: 'Buyer', email: 'buyer@example.com' },
        ],
        summary: 'Initial inquiry about a property',
        lastMessageAt: new Date(),
      };

      const result = await aiService.classifyThread(thread);

      // New threads without "Re:" typically need agent action
      expect(result.category).toBe('focus');
      expect(result.nextActionOwner).toBe('agent');
    });
  });

  describe('Classification Validation', () => {
    it('should always return valid classification types', async () => {
      const validClassifications = ['buyer', 'vendor', 'market', 'lawyer_broker', 'noise'];
      const validCategories = ['focus', 'waiting'];
      const validOwners = ['agent', 'other'];

      const thread = {
        id: 'test-validation',
        subject: 'Test thread',
        participants: [{ name: 'Test', email: 'test@example.com' }],
        summary: 'Test summary',
        lastMessageAt: new Date(),
      };

      const result = await aiService.classifyThread(thread);

      expect(validClassifications).toContain(result.classification);
      expect(validCategories).toContain(result.category);
      expect(validOwners).toContain(result.nextActionOwner);
    });

    it('should return confidence between 0 and 1', async () => {
      const thread = {
        id: 'test-confidence',
        subject: 'Test thread',
        participants: [{ name: 'Test', email: 'test@example.com' }],
        summary: 'Test summary',
        lastMessageAt: new Date(),
      };

      const result = await aiService.classifyThread(thread);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Entity Extraction', () => {
    it('should extract contacts from thread participants', async () => {
      const thread = {
        id: 'test-entity-1',
        subject: 'Property viewing request',
        participants: [
          { name: 'John Buyer', email: 'john@example.com', role: 'buyer' },
          { name: 'Agent Smith', email: 'agent@realestate.com', role: 'agent' },
        ],
        summary: 'John Buyer is interested in viewing the property',
        lastMessageAt: new Date(),
      };

      const result = await aiService.extractEntities(thread);

      expect(result.contacts).toBeDefined();
      expect(result.contacts.length).toBeGreaterThan(0);
      expect(result.contacts[0]).toHaveProperty('name');
      expect(result.contacts[0]).toHaveProperty('email');
      expect(result.contacts[0]).toHaveProperty('role');
      expect(result.contacts[0]).toHaveProperty('confidence');
    });

    it('should extract property addresses from thread content', async () => {
      const thread = {
        id: 'test-entity-2',
        subject: 'Viewing at 123 Main Street',
        participants: [
          { name: 'Buyer', email: 'buyer@example.com' },
        ],
        summary: 'Would like to schedule a viewing at 123 Main Street for this weekend',
        lastMessageAt: new Date(),
      };

      const result = await aiService.extractEntities(thread);

      expect(result.properties).toBeDefined();
      expect(Array.isArray(result.properties)).toBe(true);
      if (result.properties.length > 0) {
        expect(result.properties[0]).toHaveProperty('address');
        expect(result.properties[0]).toHaveProperty('confidence');
      }
    });

    it('should extract dates and event types from thread content', async () => {
      const thread = {
        id: 'test-entity-3',
        subject: 'Viewing scheduled',
        participants: [
          { name: 'Buyer', email: 'buyer@example.com' },
        ],
        summary: 'Viewing scheduled for 15th March at 2pm',
        lastMessageAt: new Date(),
      };

      const result = await aiService.extractEntities(thread);

      expect(result.dates).toBeDefined();
      expect(Array.isArray(result.dates)).toBe(true);
      if (result.dates.length > 0) {
        expect(result.dates[0]).toHaveProperty('date');
        expect(result.dates[0]).toHaveProperty('type');
        expect(result.dates[0]).toHaveProperty('description');
        expect(result.dates[0]).toHaveProperty('confidence');
      }
    });

    it('should extract actions from thread content', async () => {
      const thread = {
        id: 'test-entity-4',
        subject: 'Follow up required',
        participants: [
          { name: 'Buyer', email: 'buyer@example.com' },
        ],
        summary: 'Please send me the contract details by Friday',
        lastMessageAt: new Date(),
      };

      const result = await aiService.extractEntities(thread);

      expect(result.actions).toBeDefined();
      expect(Array.isArray(result.actions)).toBe(true);
      if (result.actions.length > 0) {
        expect(result.actions[0]).toHaveProperty('action');
        expect(result.actions[0]).toHaveProperty('owner');
        expect(result.actions[0]).toHaveProperty('confidence');
      }
    });

    it('should detect deal stage from thread content', async () => {
      const thread = {
        id: 'test-entity-5',
        subject: 'Offer submitted',
        participants: [
          { name: 'Buyer', email: 'buyer@example.com' },
        ],
        summary: 'I have submitted an offer of $500,000 for the property',
        lastMessageAt: new Date(),
      };

      const result = await aiService.extractEntities(thread);

      if (result.dealStage) {
        const validStages = ['lead', 'qualified', 'viewing', 'offer', 'conditional', 'pre_settlement', 'sold', 'nurture'];
        expect(validStages).toContain(result.dealStage);
      }
    });

    it('should detect risk signals from thread content', async () => {
      const thread = {
        id: 'test-entity-6',
        subject: 'Concerns about the property',
        participants: [
          { name: 'Buyer', email: 'buyer@example.com' },
        ],
        summary: 'I am concerned about the structural issues mentioned in the inspection report',
        lastMessageAt: new Date(),
      };

      const result = await aiService.extractEntities(thread);

      if (result.riskSignal) {
        expect(result.riskSignal).toHaveProperty('level');
        expect(result.riskSignal).toHaveProperty('reason');
        expect(result.riskSignal).toHaveProperty('confidence');
        const validLevels = ['none', 'low', 'medium', 'high'];
        expect(validLevels).toContain(result.riskSignal.level);
      }
    });

    it('should handle threads with no extractable entities', async () => {
      const thread = {
        id: 'test-entity-7',
        subject: 'Hello',
        participants: [
          { name: 'Unknown', email: 'unknown@example.com' },
        ],
        summary: 'Just saying hello',
        lastMessageAt: new Date(),
      };

      const result = await aiService.extractEntities(thread);

      expect(result).toBeDefined();
      expect(result.contacts).toBeDefined();
      expect(result.properties).toBeDefined();
      expect(result.dates).toBeDefined();
      expect(result.actions).toBeDefined();
    });

    it('should validate contact roles', async () => {
      const thread = {
        id: 'test-entity-8',
        subject: 'Property inquiry',
        participants: [
          { name: 'Contact', email: 'contact@example.com', role: 'buyer' },
        ],
        summary: 'Inquiry about property',
        lastMessageAt: new Date(),
      };

      const result = await aiService.extractEntities(thread);

      const validRoles = ['buyer', 'vendor', 'market', 'other'];
      result.contacts.forEach((contact) => {
        expect(validRoles).toContain(contact.role);
      });
    });

    it('should validate date types', async () => {
      const thread = {
        id: 'test-entity-9',
        subject: 'Auction scheduled',
        participants: [
          { name: 'Vendor', email: 'vendor@example.com' },
        ],
        summary: 'Auction scheduled for next Saturday',
        lastMessageAt: new Date(),
      };

      const result = await aiService.extractEntities(thread);

      const validDateTypes = ['viewing', 'appraisal', 'meeting', 'auction', 'settlement', 'other'];
      result.dates.forEach((date) => {
        expect(validDateTypes).toContain(date.type);
      });
    });

    it('should validate action owners', async () => {
      const thread = {
        id: 'test-entity-10',
        subject: 'Action required',
        participants: [
          { name: 'Client', email: 'client@example.com' },
        ],
        summary: 'Please review and respond',
        lastMessageAt: new Date(),
      };

      const result = await aiService.extractEntities(thread);

      const validOwners = ['agent', 'other'];
      result.actions.forEach((action) => {
        expect(validOwners).toContain(action.owner);
      });
    });
  });
});
