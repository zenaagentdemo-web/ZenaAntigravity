/**
 * @vitest-environment jsdom
 */
/**
 * Property-based tests for reply template classification matching
 * **Feature: new-page-dropdown-fixes, Property 25: Template Classification Matching**
 * **Validates: Requirements 3.4**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { 
  ReplyTemplate, 
  ThreadClassification, 
  TemplateCategory, 
  TemplateVariable,
  TemplateVariableType 
} from './newPage.types';

// ============================================================================
// Arbitraries for Property Testing
// ============================================================================

const threadClassificationArb = fc.constantFrom<ThreadClassification>(
  'buyer', 'vendor', 'market', 'lawyer_broker', 'noise'
);

const templateCategoryArb = fc.constantFrom<TemplateCategory>(
  'greeting', 'followup', 'scheduling', 'closing', 'information', 'negotiation'
);

const templateVariableTypeArb = fc.constantFrom<TemplateVariableType>(
  'text', 'date', 'amount', 'property_address'
);

const templateVariableArb = fc.record<TemplateVariable>({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  type: templateVariableTypeArb,
  required: fc.boolean(),
  default_value: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
});

const replyTemplateArb = fc.record<ReplyTemplate>({
  id: fc.uuid(),
  name: fc.string({ minLength: 5, maxLength: 50 }),
  content: fc.string({ minLength: 20, maxLength: 500 }),
  classification: threadClassificationArb,
  category: templateCategoryArb,
  variables: fc.array(templateVariableArb, { maxLength: 5 }),
  usage_count: fc.nat({ max: 1000 }),
  effectiveness_score: fc.float({ min: 0, max: 1 })
});

// ============================================================================
// Template Filtering Logic (Implementation to Test)
// ============================================================================

/**
 * Filters templates based on thread classification
 * This is the implementation we're testing
 */
function filterTemplatesByClassification(
  templates: ReplyTemplate[], 
  threadClassification: ThreadClassification
): ReplyTemplate[] {
  return templates.filter(template => 
    template.classification === threadClassification || 
    template.classification === 'noise' // Universal templates marked as 'noise'
  );
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Reply Template Classification Matching Properties', () => {
  it('should only return templates matching thread classification or universal templates', () => {
    // **Feature: new-page-dropdown-fixes, Property 25: Template Classification Matching**
    fc.assert(
      fc.property(
        fc.array(replyTemplateArb, { minLength: 1, maxLength: 20 }),
        threadClassificationArb,
        (templates, threadClassification) => {
          const filteredTemplates = filterTemplatesByClassification(templates, threadClassification);
          
          // All returned templates must either match the thread classification
          // or be universal (marked as 'noise' classification)
          return filteredTemplates.every(template => 
            template.classification === threadClassification || 
            template.classification === 'noise'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include all templates that match the thread classification', () => {
    // **Feature: new-page-dropdown-fixes, Property 25: Template Classification Matching**
    fc.assert(
      fc.property(
        fc.array(replyTemplateArb, { minLength: 1, maxLength: 20 }),
        threadClassificationArb,
        (templates, threadClassification) => {
          const filteredTemplates = filterTemplatesByClassification(templates, threadClassification);
          const matchingTemplates = templates.filter(t => t.classification === threadClassification);
          
          // All templates with matching classification should be included
          return matchingTemplates.every(matchingTemplate =>
            filteredTemplates.some(filtered => filtered.id === matchingTemplate.id)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include universal templates (noise classification) for any thread classification', () => {
    // **Feature: new-page-dropdown-fixes, Property 25: Template Classification Matching**
    fc.assert(
      fc.property(
        fc.array(replyTemplateArb, { minLength: 1, maxLength: 20 }),
        threadClassificationArb,
        (templates, threadClassification) => {
          const filteredTemplates = filterTemplatesByClassification(templates, threadClassification);
          const universalTemplates = templates.filter(t => t.classification === 'noise');
          
          // All universal templates should be included regardless of thread classification
          return universalTemplates.every(universalTemplate =>
            filteredTemplates.some(filtered => filtered.id === universalTemplate.id)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should never return empty array when universal templates exist', () => {
    // **Feature: new-page-dropdown-fixes, Property 25: Template Classification Matching**
    fc.assert(
      fc.property(
        fc.array(replyTemplateArb, { minLength: 1, maxLength: 20 }),
        threadClassificationArb,
        (templates, threadClassification) => {
          // Ensure at least one universal template exists
          const templatesWithUniversal = [
            ...templates,
            {
              id: 'universal-1',
              name: 'Universal Template',
              content: 'Thank you for your message.',
              classification: 'noise' as ThreadClassification,
              category: 'greeting' as TemplateCategory,
              variables: [],
              usage_count: 0,
              effectiveness_score: 0.5
            }
          ];
          
          const filteredTemplates = filterTemplatesByClassification(templatesWithUniversal, threadClassification);
          
          // Should never be empty when universal templates exist
          return filteredTemplates.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve template order when filtering', () => {
    // **Feature: new-page-dropdown-fixes, Property 25: Template Classification Matching**
    fc.assert(
      fc.property(
        fc.array(replyTemplateArb, { minLength: 2, maxLength: 10 }),
        threadClassificationArb,
        (templates, threadClassification) => {
          const filteredTemplates = filterTemplatesByClassification(templates, threadClassification);
          
          // Check that the relative order is preserved
          for (let i = 0; i < filteredTemplates.length - 1; i++) {
            const currentIndex = templates.findIndex(t => t.id === filteredTemplates[i].id);
            const nextIndex = templates.findIndex(t => t.id === filteredTemplates[i + 1].id);
            
            // Current template should appear before next template in original array
            if (currentIndex >= nextIndex) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});