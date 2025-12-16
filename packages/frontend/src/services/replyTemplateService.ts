/**
 * Reply Template Service
 * 
 * Handles loading, filtering, and managing reply templates for quick responses.
 * Includes template variable substitution and usage tracking.
 * 
 * Requirements: 3.4, 3.5
 */

import { 
  ReplyTemplate, 
  ThreadClassification, 
  TemplateCategory,
  TemplateVariable,
  Thread 
} from '../models/newPage.types';

// ============================================================================
// Template Data Store (Mock Implementation)
// ============================================================================

/**
 * Mock template data - in a real implementation this would come from an API
 */
const MOCK_TEMPLATES: ReplyTemplate[] = [
  // Buyer Templates
  {
    id: 'buyer-greeting-1',
    name: 'Buyer Initial Response',
    content: 'Thank you for your interest in {{property_address}}. I\'d be happy to help you with your property search. When would be a good time to discuss your requirements?',
    classification: 'buyer',
    category: 'greeting',
    variables: [
      { name: 'property_address', type: 'property_address', required: true }
    ],
    usage_count: 45,
    effectiveness_score: 0.85
  },
  {
    id: 'buyer-scheduling-1',
    name: 'Buyer Viewing Schedule',
    content: 'I can arrange a viewing of {{property_address}} for {{viewing_date}}. Please let me know if this time works for you, or suggest an alternative.',
    classification: 'buyer',
    category: 'scheduling',
    variables: [
      { name: 'property_address', type: 'property_address', required: true },
      { name: 'viewing_date', type: 'date', required: true }
    ],
    usage_count: 32,
    effectiveness_score: 0.92
  },
  {
    id: 'buyer-followup-1',
    name: 'Buyer Follow-up',
    content: 'Hi {{client_name}}, I wanted to follow up on your interest in {{property_address}}. Do you have any questions or would you like to schedule a viewing?',
    classification: 'buyer',
    category: 'followup',
    variables: [
      { name: 'client_name', type: 'text', required: true },
      { name: 'property_address', type: 'property_address', required: true }
    ],
    usage_count: 28,
    effectiveness_score: 0.78
  },

  // Vendor Templates
  {
    id: 'vendor-greeting-1',
    name: 'Vendor Initial Contact',
    content: 'Thank you for considering me to help sell your property at {{property_address}}. I\'d love to discuss how I can achieve the best outcome for you.',
    classification: 'vendor',
    category: 'greeting',
    variables: [
      { name: 'property_address', type: 'property_address', required: true }
    ],
    usage_count: 38,
    effectiveness_score: 0.88
  },
  {
    id: 'vendor-information-1',
    name: 'Market Update',
    content: 'Based on recent sales in your area, properties similar to {{property_address}} are selling for approximately {{price_range}}. I\'d be happy to provide a detailed market analysis.',
    classification: 'vendor',
    category: 'information',
    variables: [
      { name: 'property_address', type: 'property_address', required: true },
      { name: 'price_range', type: 'amount', required: true }
    ],
    usage_count: 22,
    effectiveness_score: 0.91
  },

  // Lawyer/Broker Templates
  {
    id: 'lawyer-followup-1',
    name: 'Legal Process Update',
    content: 'Thank you for the update on {{property_address}}. I\'ll review the documents and get back to you by {{response_date}} with any questions.',
    classification: 'lawyer_broker',
    category: 'followup',
    variables: [
      { name: 'property_address', type: 'property_address', required: true },
      { name: 'response_date', type: 'date', required: true }
    ],
    usage_count: 15,
    effectiveness_score: 0.95
  },

  // Universal Templates (marked as 'noise')
  {
    id: 'universal-thanks-1',
    name: 'Thank You',
    content: 'Thank you for your message. I\'ll review the details and get back to you shortly.',
    classification: 'noise',
    category: 'greeting',
    variables: [],
    usage_count: 67,
    effectiveness_score: 0.72
  },
  {
    id: 'universal-schedule-1',
    name: 'Schedule Meeting',
    content: 'I\'d be happy to discuss this further. Are you available for a call on {{meeting_date}} at {{meeting_time}}?',
    classification: 'noise',
    category: 'scheduling',
    variables: [
      { name: 'meeting_date', type: 'date', required: true },
      { name: 'meeting_time', type: 'text', required: true, default_value: '10:00 AM' }
    ],
    usage_count: 41,
    effectiveness_score: 0.83
  }
];

// ============================================================================
// Template Service Class
// ============================================================================

export class ReplyTemplateService {
  private templates: ReplyTemplate[] = MOCK_TEMPLATES;

  /**
   * Load templates filtered by thread classification
   * Returns templates that match the classification or are universal
   */
  async loadTemplatesByClassification(classification: ThreadClassification): Promise<ReplyTemplate[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const filteredTemplates = this.filterTemplatesByClassification(this.templates, classification);
    
    // Sort by effectiveness score (descending) and usage count
    return filteredTemplates.sort((a, b) => {
      if (a.effectiveness_score !== b.effectiveness_score) {
        return b.effectiveness_score - a.effectiveness_score;
      }
      return b.usage_count - a.usage_count;
    });
  }

  /**
   * Load templates by category for a specific classification
   */
  async loadTemplatesByCategory(
    classification: ThreadClassification, 
    category: TemplateCategory
  ): Promise<ReplyTemplate[]> {
    const allTemplates = await this.loadTemplatesByClassification(classification);
    return allTemplates.filter(template => template.category === category);
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: string): Promise<ReplyTemplate | null> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return this.templates.find(template => template.id === templateId) || null;
  }

  /**
   * Substitute variables in template content
   */
  substituteVariables(
    template: ReplyTemplate, 
    variables: Record<string, string>,
    thread?: Thread
  ): string {
    let content = template.content;

    // Auto-populate some variables from thread context
    if (thread) {
      variables = {
        property_address: thread.propertyAddress || '',
        client_name: thread.participants[0]?.name || '',
        ...variables
      };
    }

    // Replace template variables
    template.variables.forEach(variable => {
      const value = variables[variable.name] || variable.default_value || '';
      const placeholder = `{{${variable.name}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), value);
    });

    return content;
  }

  /**
   * Track template usage for effectiveness scoring
   */
  async trackTemplateUsage(templateId: string, wasEffective: boolean = true): Promise<void> {
    const template = this.templates.find(t => t.id === templateId);
    if (template) {
      template.usage_count += 1;
      
      // Update effectiveness score using exponential moving average
      const alpha = 0.1; // Learning rate
      const newScore = wasEffective ? 1 : 0;
      template.effectiveness_score = 
        (1 - alpha) * template.effectiveness_score + alpha * newScore;
    }

    // In a real implementation, this would persist to backend
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Get template suggestions based on thread content and classification
   */
  async getSuggestedTemplates(
    thread: Thread, 
    maxSuggestions: number = 5
  ): Promise<ReplyTemplate[]> {
    const allTemplates = await this.loadTemplatesByClassification(thread.classification);
    
    // Score templates based on context relevance
    const scoredTemplates = allTemplates.map(template => ({
      template,
      relevanceScore: this.calculateRelevanceScore(template, thread)
    }));

    // Sort by relevance and effectiveness
    scoredTemplates.sort((a, b) => {
      const scoreA = a.relevanceScore * a.template.effectiveness_score;
      const scoreB = b.relevanceScore * b.template.effectiveness_score;
      return scoreB - scoreA;
    });

    return scoredTemplates
      .slice(0, maxSuggestions)
      .map(scored => scored.template);
  }

  /**
   * Validate that all required variables are provided
   */
  validateTemplateVariables(
    template: ReplyTemplate, 
    variables: Record<string, string>
  ): { isValid: boolean; missingVariables: string[] } {
    const missingVariables = template.variables
      .filter(variable => variable.required)
      .filter(variable => !variables[variable.name] && !variable.default_value)
      .map(variable => variable.name);

    return {
      isValid: missingVariables.length === 0,
      missingVariables
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Filter templates by classification (includes universal templates)
   * This implements the logic tested by Property 25
   */
  private filterTemplatesByClassification(
    templates: ReplyTemplate[], 
    classification: ThreadClassification
  ): ReplyTemplate[] {
    return templates.filter(template => 
      template.classification === classification || 
      template.classification === 'noise' // Universal templates
    );
  }

  /**
   * Calculate relevance score for template suggestion
   */
  private calculateRelevanceScore(template: ReplyTemplate, thread: Thread): number {
    let score = 0.5; // Base score

    // Boost score for category relevance
    if (thread.summary.toLowerCase().includes('viewing') && template.category === 'scheduling') {
      score += 0.3;
    }
    if (thread.summary.toLowerCase().includes('price') && template.category === 'information') {
      score += 0.3;
    }
    if (thread.summary.toLowerCase().includes('thank') && template.category === 'greeting') {
      score += 0.2;
    }

    // Boost for property-related templates when property context exists
    if (thread.propertyAddress && template.variables.some(v => v.type === 'property_address')) {
      score += 0.2;
    }

    // Boost for recent high-performing templates
    if (template.effectiveness_score > 0.8) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }
}

// ============================================================================
// Service Instance Export
// ============================================================================

export const replyTemplateService = new ReplyTemplateService();