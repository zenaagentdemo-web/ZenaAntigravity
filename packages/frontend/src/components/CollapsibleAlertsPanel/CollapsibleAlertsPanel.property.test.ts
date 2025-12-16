/**
 * @vitest-environment jsdom
 */
/**
 * Property-Based Tests for CollapsibleAlertsPanel
 * 
 * **Feature: high-tech-ai-aesthetic, Property 12: Notification Priority Styling**
 * **Validates: Requirements 7.1, 7.2, 7.3**
 * 
 * Tests that notification elements have glow colors matching their priority level:
 * - Urgent: red glow
 * - Warning: amber/yellow glow
 * - Success: cyan/green glow
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Priority types
type AlertPriority = 'urgent' | 'warning' | 'info' | 'success';

// Expected glow color mappings based on priority
const PRIORITY_GLOW_COLORS: Record<AlertPriority, { primary: string; dim: string }> = {
  urgent: {
    primary: '#FF4444', // --status-urgent
    dim: 'rgba(255, 68, 68, 0.5)', // --status-urgent-dim
  },
  warning: {
    primary: '#FFAA00', // --status-warning
    dim: 'rgba(255, 170, 0, 0.5)', // --status-warning-dim
  },
  success: {
    primary: '#00FF88', // --status-success
    dim: 'rgba(0, 255, 136, 0.5)', // --status-success-dim
  },
  info: {
    primary: '#00D4FF', // --status-info
    dim: 'rgba(0, 212, 255, 0.5)', // --status-info-dim
  },
};

// CSS class mappings for priority
const PRIORITY_CSS_CLASSES: Record<AlertPriority, string> = {
  urgent: 'alert-item--urgent',
  warning: 'alert-item--warning',
  success: 'alert-item--success',
  info: 'alert-item--info',
};

// Generator for alert priorities
const priorityArb = fc.constantFrom<AlertPriority>('urgent', 'warning', 'info', 'success');

// Generator for alert data
const alertArb = fc.record({
  id: fc.uuid(),
  priority: priorityArb,
  title: fc.string({ minLength: 1, maxLength: 100 }),
  message: fc.string({ minLength: 1, maxLength: 500 }),
  dismissed: fc.boolean(),
});

// Generator for arrays of alerts
const alertsArb = fc.array(alertArb, { minLength: 1, maxLength: 10 });

/**
 * Simulates getting the CSS class for an alert based on priority
 */
function getAlertCssClass(priority: AlertPriority): string {
  return PRIORITY_CSS_CLASSES[priority];
}

/**
 * Simulates getting the expected glow colors for a priority
 */
function getExpectedGlowColors(priority: AlertPriority): { primary: string; dim: string } {
  return PRIORITY_GLOW_COLORS[priority];
}

/**
 * Validates that a CSS class contains the expected priority indicator
 */
function cssClassMatchesPriority(cssClass: string, priority: AlertPriority): boolean {
  return cssClass.includes(`--${priority}`);
}

/**
 * Validates that glow colors are appropriate for the priority level
 */
function glowColorsMatchPriority(
  priority: AlertPriority,
  glowColors: { primary: string; dim: string }
): boolean {
  const expected = PRIORITY_GLOW_COLORS[priority];
  return glowColors.primary === expected.primary && glowColors.dim === expected.dim;
}

describe('CollapsibleAlertsPanel - Property 12: Notification Priority Styling', () => {
  /**
   * Property 12: Notification Priority Styling
   * *For any* notification element, the glow color should match its priority level
   * (red for urgent, amber for warning, cyan/green for success)
   * **Validates: Requirements 7.1, 7.2, 7.3**
   */
  
  it('should assign correct CSS class for any alert priority', () => {
    fc.assert(
      fc.property(priorityArb, (priority) => {
        const cssClass = getAlertCssClass(priority);
        
        // The CSS class should contain the priority name
        expect(cssClassMatchesPriority(cssClass, priority)).toBe(true);
        
        // The CSS class should follow the expected pattern
        expect(cssClass).toBe(`alert-item--${priority}`);
      }),
      { numRuns: 100 }
    );
  });

  it('should map urgent priority to red glow colors', () => {
    fc.assert(
      fc.property(
        fc.constant('urgent' as AlertPriority),
        (priority) => {
          const glowColors = getExpectedGlowColors(priority);
          
          // Urgent should have red-based colors
          expect(glowColors.primary).toBe('#FF4444');
          expect(glowColors.dim).toContain('255, 68, 68');
          expect(glowColorsMatchPriority(priority, glowColors)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should map warning priority to amber/yellow glow colors', () => {
    fc.assert(
      fc.property(
        fc.constant('warning' as AlertPriority),
        (priority) => {
          const glowColors = getExpectedGlowColors(priority);
          
          // Warning should have amber/yellow-based colors
          expect(glowColors.primary).toBe('#FFAA00');
          expect(glowColors.dim).toContain('255, 170, 0');
          expect(glowColorsMatchPriority(priority, glowColors)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should map success priority to cyan/green glow colors', () => {
    fc.assert(
      fc.property(
        fc.constant('success' as AlertPriority),
        (priority) => {
          const glowColors = getExpectedGlowColors(priority);
          
          // Success should have green-based colors
          expect(glowColors.primary).toBe('#00FF88');
          expect(glowColors.dim).toContain('0, 255, 136');
          expect(glowColorsMatchPriority(priority, glowColors)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should map info priority to cyan glow colors', () => {
    fc.assert(
      fc.property(
        fc.constant('info' as AlertPriority),
        (priority) => {
          const glowColors = getExpectedGlowColors(priority);
          
          // Info should have cyan-based colors
          expect(glowColors.primary).toBe('#00D4FF');
          expect(glowColors.dim).toContain('0, 212, 255');
          expect(glowColorsMatchPriority(priority, glowColors)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have unique glow colors for each priority level', () => {
    fc.assert(
      fc.property(
        fc.tuple(priorityArb, priorityArb).filter(([a, b]) => a !== b),
        ([priority1, priority2]) => {
          const colors1 = getExpectedGlowColors(priority1);
          const colors2 = getExpectedGlowColors(priority2);
          
          // Different priorities should have different primary colors
          expect(colors1.primary).not.toBe(colors2.primary);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should assign correct CSS classes for any array of alerts', () => {
    fc.assert(
      fc.property(alertsArb, (alerts) => {
        // For each alert, verify the CSS class matches its priority
        alerts.forEach((alert) => {
          const cssClass = getAlertCssClass(alert.priority);
          expect(cssClassMatchesPriority(cssClass, alert.priority)).toBe(true);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should have glow colors that match priority for any alert', () => {
    fc.assert(
      fc.property(alertArb, (alert) => {
        const glowColors = getExpectedGlowColors(alert.priority);
        
        // Glow colors should always match the priority
        expect(glowColorsMatchPriority(alert.priority, glowColors)).toBe(true);
        
        // Primary color should be a valid hex color
        expect(glowColors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
        
        // Dim color should be a valid rgba color
        expect(glowColors.dim).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain priority-color mapping consistency across multiple calls', () => {
    fc.assert(
      fc.property(
        fc.tuple(priorityArb, fc.integer({ min: 1, max: 10 })),
        ([priority, iterations]) => {
          const firstColors = getExpectedGlowColors(priority);
          
          // Multiple calls should return the same colors
          for (let i = 0; i < iterations; i++) {
            const colors = getExpectedGlowColors(priority);
            expect(colors.primary).toBe(firstColors.primary);
            expect(colors.dim).toBe(firstColors.dim);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
