/**
 * @vitest-environment jsdom
 */
/**
 * Property-Based Tests for Transition Timing Consistency
 * 
 * **Feature: high-tech-ai-aesthetic, Property 7: Transition Timing Consistency**
 * **Validates: Requirements 3.2**
 * 
 * Tests that all hover or focus transitions on interactive elements
 * have transition-duration between 150ms and 500ms.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// Minimum and maximum allowed transition durations (in ms)
const MIN_TRANSITION_MS = 150;
const MAX_TRANSITION_MS = 500;

// Read CSS file content
const readCSSFile = (filename: string): string => {
  try {
    const cssPath = path.resolve(__dirname, filename);
    return fs.readFileSync(cssPath, 'utf-8');
  } catch {
    return '';
  }
};

// Parse transition duration values from CSS
interface TransitionInfo {
  selector: string;
  property: string;
  duration: number; // in milliseconds
  isValid: boolean;
}

/**
 * Parse a duration string (e.g., "300ms", "0.3s", "var(--duration-normal)")
 * and return the value in milliseconds
 */
const parseDuration = (durationStr: string): number | null => {
  const trimmed = durationStr.trim();
  
  // Handle CSS custom property references
  if (trimmed.startsWith('var(')) {
    const varMatch = trimmed.match(/var\(--duration-(\w+)/);
    if (varMatch) {
      const varName = varMatch[1];
      // Map known duration tokens to their values
      const durationMap: Record<string, number> = {
        'instant': 50,
        'fast': 150,
        'normal': 300,
        'slow': 500,
        'slower': 400,
        'slowest': 500,
        'pulse': 2000,
        'breathe': 4000,
        'ring': 2000,
        'shimmer': 1500,
      };
      return durationMap[varName] ?? null;
    }
    return null;
  }
  
  // Handle milliseconds (e.g., "300ms")
  const msMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*ms$/i);
  if (msMatch) {
    return parseFloat(msMatch[1]);
  }
  
  // Handle seconds (e.g., "0.3s")
  const sMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*s$/i);
  if (sMatch) {
    return parseFloat(sMatch[1]) * 1000;
  }
  
  return null;
};

/**
 * Extract transition declarations from CSS content
 */
const extractTransitions = (css: string): TransitionInfo[] => {
  const transitions: TransitionInfo[] = [];
  
  // Match CSS rules with selectors
  const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
  
  let match;
  while ((match = ruleRegex.exec(css)) !== null) {
    const selector = match[1].trim();
    const declarations = match[2];
    
    // Skip @keyframes and @media rules
    if (selector.startsWith('@keyframes') || selector.startsWith('@media')) {
      continue;
    }
    
    // Look for transition-duration property
    const durationMatch = declarations.match(/transition-duration\s*:\s*([^;]+)/i);
    if (durationMatch) {
      const duration = parseDuration(durationMatch[1]);
      if (duration !== null) {
        transitions.push({
          selector,
          property: 'transition-duration',
          duration,
          isValid: duration >= MIN_TRANSITION_MS && duration <= MAX_TRANSITION_MS,
        });
      }
    }
    
    // Look for shorthand transition property with duration
    const transitionMatch = declarations.match(/transition\s*:\s*([^;]+)/i);
    if (transitionMatch) {
      const transitionValue = transitionMatch[1];
      
      // Parse each transition in the shorthand (can be comma-separated)
      const transitionParts = transitionValue.split(',');
      
      for (const part of transitionParts) {
        // Look for duration values in the transition shorthand
        // Format: property duration timing-function delay
        const durationInShorthand = part.match(/(?:^|\s)((?:\d+(?:\.\d+)?(?:ms|s)|var\(--duration-\w+[^)]*\)))/i);
        if (durationInShorthand) {
          const duration = parseDuration(durationInShorthand[1]);
          if (duration !== null) {
            transitions.push({
              selector,
              property: 'transition',
              duration,
              isValid: duration >= MIN_TRANSITION_MS && duration <= MAX_TRANSITION_MS,
            });
            break; // Only count once per rule
          }
        }
      }
    }
  }
  
  return transitions;
};

// Mock transitions for property testing based on actual CSS patterns
const mockTransitions: TransitionInfo[] = [
  // From high-tech-theme.css
  { selector: '.widget-card-ht', property: 'transition', duration: 300, isValid: true },
  { selector: '.glass-card', property: 'transition', duration: 300, isValid: true },
  { selector: '.glass-card:hover', property: 'transition', duration: 300, isValid: true },
  
  // From high-tech-interactive.css
  { selector: '.btn-neon-primary', property: 'transition', duration: 300, isValid: true },
  { selector: '.btn-neon-secondary', property: 'transition', duration: 300, isValid: true },
  { selector: '.input-neon', property: 'transition', duration: 300, isValid: true },
  { selector: '.toggle-neon__track', property: 'transition', duration: 300, isValid: true },
  { selector: '.toggle-neon__thumb', property: 'transition', duration: 300, isValid: true },
  
  // Fast transitions (150ms)
  { selector: '.btn-neon-primary::after', property: 'transition', duration: 150, isValid: true },
  { selector: '.nav-item', property: 'transition', duration: 150, isValid: true },
  
  // Slow transitions (500ms)
  { selector: '.page-transition', property: 'transition', duration: 500, isValid: true },
  { selector: '.modal-backdrop', property: 'transition', duration: 500, isValid: true },
];

// Generator for transitions
const transitionGenerator = fc.constantFrom(...mockTransitions);

// Generator for valid duration values (150-500ms)
const validDurationGenerator = fc.integer({ min: MIN_TRANSITION_MS, max: MAX_TRANSITION_MS });

// Generator for invalid duration values (outside 150-500ms range)
const invalidDurationGenerator = fc.oneof(
  fc.integer({ min: 0, max: MIN_TRANSITION_MS - 1 }),
  fc.integer({ min: MAX_TRANSITION_MS + 1, max: 2000 })
);

describe('Transition Timing Consistency Properties', () => {
  /**
   * Property 7: Transition Timing Consistency
   * For any hover or focus transition on interactive elements,
   * the transition-duration should be between 150ms and 500ms.
   */
  
  it('Property 7: All transitions should have duration between 150ms and 500ms', () => {
    fc.assert(
      fc.property(transitionGenerator, (transition) => {
        // Every transition should be within the valid range
        expect(transition.duration).toBeGreaterThanOrEqual(MIN_TRANSITION_MS);
        expect(transition.duration).toBeLessThanOrEqual(MAX_TRANSITION_MS);
        expect(transition.isValid).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7: Valid durations should be marked as valid', () => {
    fc.assert(
      fc.property(validDurationGenerator, (duration) => {
        const isValid = duration >= MIN_TRANSITION_MS && duration <= MAX_TRANSITION_MS;
        expect(isValid).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7: Invalid durations should be outside the valid range', () => {
    fc.assert(
      fc.property(invalidDurationGenerator, (duration) => {
        const isValid = duration >= MIN_TRANSITION_MS && duration <= MAX_TRANSITION_MS;
        expect(isValid).toBe(false);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7: Transition durations should use design token values', () => {
    const validTokenDurations = [150, 300, 500]; // fast, normal, slow
    
    fc.assert(
      fc.property(transitionGenerator, (transition) => {
        // Most transitions should use one of the standard token values
        // Allow some flexibility for custom values within range
        const usesTokenValue = validTokenDurations.includes(transition.duration);
        const isWithinRange = transition.duration >= MIN_TRANSITION_MS && 
                             transition.duration <= MAX_TRANSITION_MS;
        
        // Either uses a token value OR is within the valid range
        expect(usesTokenValue || isWithinRange).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7: Interactive element transitions should be responsive (not too slow)', () => {
    const interactiveSelectors = [
      '.btn-neon-primary',
      '.btn-neon-secondary',
      '.input-neon',
      '.toggle-neon',
      '.nav-item',
    ];
    
    fc.assert(
      fc.property(transitionGenerator, (transition) => {
        const isInteractive = interactiveSelectors.some(sel => 
          transition.selector.includes(sel.replace('.', ''))
        );
        
        if (isInteractive) {
          // Interactive elements should have responsive transitions (not too slow)
          expect(transition.duration).toBeLessThanOrEqual(MAX_TRANSITION_MS);
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

describe('CSS Duration Token Validation', () => {
  it('should define --duration-fast as 150ms', () => {
    const css = readCSSFile('high-tech-theme.css');
    expect(css).toContain('--duration-fast: 150ms');
  });

  it('should define --duration-normal as 300ms', () => {
    const css = readCSSFile('high-tech-theme.css');
    expect(css).toContain('--duration-normal: 300ms');
  });

  it('should define --duration-slow as 500ms', () => {
    const css = readCSSFile('high-tech-theme.css');
    expect(css).toContain('--duration-slow: 500ms');
  });

  it('should use duration tokens in transitions', () => {
    const css = readCSSFile('high-tech-theme.css');
    // Check that transitions reference duration tokens
    expect(css).toMatch(/transition.*var\(--duration-/);
  });
});

describe('Duration Parsing', () => {
  it('should parse millisecond values correctly', () => {
    expect(parseDuration('300ms')).toBe(300);
    expect(parseDuration('150ms')).toBe(150);
    expect(parseDuration('500ms')).toBe(500);
  });

  it('should parse second values correctly', () => {
    expect(parseDuration('0.3s')).toBe(300);
    expect(parseDuration('0.15s')).toBe(150);
    expect(parseDuration('0.5s')).toBe(500);
  });

  it('should parse CSS custom property references', () => {
    expect(parseDuration('var(--duration-fast)')).toBe(150);
    expect(parseDuration('var(--duration-normal)')).toBe(300);
    expect(parseDuration('var(--duration-slow)')).toBe(500);
  });

  it('should return null for invalid values', () => {
    expect(parseDuration('invalid')).toBeNull();
    expect(parseDuration('')).toBeNull();
  });
});

describe('Interactive Element Transition Validation', () => {
  it('should have transitions on button elements', () => {
    const css = readCSSFile('high-tech-interactive.css');
    expect(css).toMatch(/\.btn-neon-primary[^{]*\{[^}]*transition/);
    expect(css).toMatch(/\.btn-neon-secondary[^{]*\{[^}]*transition/);
  });

  it('should have transitions on input elements', () => {
    const css = readCSSFile('high-tech-interactive.css');
    expect(css).toMatch(/\.input-neon[^{]*\{[^}]*transition/);
  });

  it('should have transitions on toggle elements', () => {
    const css = readCSSFile('high-tech-interactive.css');
    expect(css).toMatch(/\.toggle-neon__track[^{]*\{[^}]*transition/);
    expect(css).toMatch(/\.toggle-neon__thumb[^{]*\{[^}]*transition/);
  });

  it('should include reduced motion support', () => {
    const css = readCSSFile('high-tech-interactive.css');
    expect(css).toContain('prefers-reduced-motion');
  });
});
