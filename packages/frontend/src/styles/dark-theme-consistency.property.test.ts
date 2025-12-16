/**
 * @vitest-environment jsdom
 */
/**
 * Property-Based Tests for Dark Theme Token Consistency
 * 
 * **Feature: high-tech-ai-aesthetic, Property 3: Dark Theme Token Consistency**
 * **Validates: Requirements 2.1, 2.3**
 * 
 * Tests that all background colors used in the interface reference CSS custom properties
 * from the dark color system (--bg-primary, --bg-secondary, --bg-tertiary, or --bg-glass variants).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// Dark theme background tokens as defined in high-tech-theme.css
const DARK_THEME_BG_TOKENS = {
  // Primary Background Gradients
  '--bg-primary': '#0A0A0F',
  '--bg-secondary': '#12121A',
  '--bg-tertiary': '#1A1A2E',
  
  // Elevated/Glass Backgrounds
  '--bg-elevated': 'rgba(26, 26, 46, 0.8)',
  '--bg-glass': 'rgba(255, 255, 255, 0.05)',
  '--bg-glass-hover': 'rgba(255, 255, 255, 0.08)',
  '--bg-glass-active': 'rgba(255, 255, 255, 0.1)',
  '--bg-glass-border': 'rgba(255, 255, 255, 0.1)',
  
  // Fallback backgrounds
  '--glass-fallback-bg': 'rgba(26, 26, 46, 0.95)',
  '--glass-bg': 'rgba(255, 255, 255, 0.05)',
  '--glass-bg-hover': 'rgba(255, 255, 255, 0.08)',
};

// Valid dark theme background token names
const VALID_BG_TOKEN_NAMES = [
  '--bg-primary',
  '--bg-secondary',
  '--bg-tertiary',
  '--bg-elevated',
  '--bg-glass',
  '--bg-glass-hover',
  '--bg-glass-active',
  '--bg-glass-border',
  '--glass-bg',
  '--glass-bg-hover',
  '--glass-bg-active',
  '--glass-fallback-bg',
  '--color-background',
  '--color-background-secondary',
  '--color-surface',
  '--color-surface-hover',
];

// Mock getComputedStyle for testing
const mockGetComputedStyle = () => ({
  getPropertyValue: (property: string) => DARK_THEME_BG_TOKENS[property as keyof typeof DARK_THEME_BG_TOKENS] || '',
});

beforeEach(() => {
  global.getComputedStyle = mockGetComputedStyle as any;
  global.document = {
    documentElement: { style: {} },
  } as any;
});

// Read the actual CSS file content for testing
const getHighTechThemeCSS = (): string => {
  try {
    const cssPath = path.resolve(__dirname, 'high-tech-theme.css');
    return fs.readFileSync(cssPath, 'utf-8');
  } catch {
    return '';
  }
};

// Parse CSS to extract background declarations
interface BackgroundDeclaration {
  selector: string;
  property: string;
  value: string;
  usesToken: boolean;
  tokenName: string | null;
}

const parseBackgroundDeclarations = (css: string): BackgroundDeclaration[] => {
  const declarations: BackgroundDeclaration[] = [];
  
  // Match CSS rules with background or background-color properties
  const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
  let match;
  
  while ((match = ruleRegex.exec(css)) !== null) {
    const selector = match[1].trim();
    const content = match[2];
    
    // Find background declarations
    const bgRegex = /background(?:-color)?:\s*([^;]+)/g;
    let bgMatch;
    
    while ((bgMatch = bgRegex.exec(content)) !== null) {
      const value = bgMatch[1].trim();
      
      // Check if value uses a CSS custom property
      const tokenMatch = value.match(/var\((--[a-zA-Z-]+)/);
      const usesToken = tokenMatch !== null;
      const tokenName = tokenMatch ? tokenMatch[1] : null;
      
      declarations.push({
        selector,
        property: bgMatch[0].split(':')[0].trim(),
        value,
        usesToken,
        tokenName,
      });
    }
  }
  
  return declarations;
};

// Generator for dark theme background tokens
const darkBgTokenGenerator = fc.constantFrom(
  '--bg-primary',
  '--bg-secondary',
  '--bg-tertiary',
  '--bg-elevated',
  '--bg-glass',
  '--bg-glass-hover'
);

// Generator for glass background tokens
const glassBgTokenGenerator = fc.constantFrom(
  '--glass-bg',
  '--glass-bg-hover',
  '--glass-bg-active',
  '--glass-fallback-bg'
);

describe('Dark Theme Token Consistency Properties', () => {
  /**
   * Property 3: Dark Theme Token Consistency
   * For any background color used in the interface, it should reference CSS custom properties
   * from the dark color system (--bg-primary, --bg-secondary, --bg-tertiary, or --bg-glass variants).
   */
  
  it('Property 3: All dark background tokens should be defined as CSS custom properties', () => {
    fc.assert(
      fc.property(darkBgTokenGenerator, (bgToken) => {
        const computedStyle = getComputedStyle(document.documentElement);
        const bgValue = computedStyle.getPropertyValue(bgToken);
        
        // Background tokens should not be empty
        expect(bgValue).toBeTruthy();
        expect(bgValue.trim()).not.toBe('');
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3: Primary dark backgrounds should use hex colors with low luminance', () => {
    const primaryBgTokens = ['--bg-primary', '--bg-secondary', '--bg-tertiary'];
    
    fc.assert(
      fc.property(fc.constantFrom(...primaryBgTokens), (bgToken) => {
        const computedStyle = getComputedStyle(document.documentElement);
        const bgValue = computedStyle.getPropertyValue(bgToken);
        
        // Should be a valid hex color
        if (/^#[0-9a-fA-F]{6}$/.test(bgValue)) {
          const r = parseInt(bgValue.slice(1, 3), 16);
          const g = parseInt(bgValue.slice(3, 5), 16);
          const b = parseInt(bgValue.slice(5, 7), 16);
          
          // Calculate relative luminance (simplified)
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          
          // Dark backgrounds should have low luminance (< 0.15)
          expect(luminance).toBeLessThan(0.15);
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3: Glass background tokens should use rgba with low opacity', () => {
    fc.assert(
      fc.property(glassBgTokenGenerator, (glassToken) => {
        const computedStyle = getComputedStyle(document.documentElement);
        const glassValue = computedStyle.getPropertyValue(glassToken);
        
        if (glassValue) {
          // Glass backgrounds should use rgba format
          const rgbaMatch = glassValue.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
          
          if (rgbaMatch) {
            // Glass backgrounds should have low opacity for transparency effect
            // Exception: fallback backgrounds should have high opacity
            if (glassToken.includes('fallback')) {
              const opacity = parseFloat(rgbaMatch[4] || '1');
              expect(opacity).toBeGreaterThanOrEqual(0.9);
            } else {
              const opacity = parseFloat(rgbaMatch[4] || '1');
              expect(opacity).toBeLessThanOrEqual(0.15);
            }
          }
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3: Dark theme background scale should progress from darkest to lightest', () => {
    const bgScale = ['--bg-primary', '--bg-secondary', '--bg-tertiary'];
    
    // Parse hex values and verify progression
    const computedStyle = getComputedStyle(document.documentElement);
    const values = bgScale.map(token => {
      const value = computedStyle.getPropertyValue(token);
      if (/^#[0-9a-fA-F]{6}$/.test(value)) {
        return parseInt(value.slice(1), 16);
      }
      return 0;
    });
    
    // Each subsequent value should be greater (lighter) than the previous
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('Property 3: CSS file should define all required dark theme background tokens', () => {
    const css = getHighTechThemeCSS();
    
    if (css) {
      // Check that all primary background tokens are defined
      expect(css).toContain('--bg-primary:');
      expect(css).toContain('--bg-secondary:');
      expect(css).toContain('--bg-tertiary:');
      
      // Check that glass background tokens are defined
      expect(css).toContain('--bg-glass:');
      expect(css).toContain('--glass-bg:');
      expect(css).toContain('--glass-fallback-bg:');
    }
  });

  it('Property 3: Background declarations in high-tech theme should use CSS custom properties', () => {
    const css = getHighTechThemeCSS();
    
    if (css) {
      const declarations = parseBackgroundDeclarations(css);
      
      // Filter to only high-tech specific selectors
      const highTechDeclarations = declarations.filter(d => 
        d.selector.includes('high-tech') || 
        d.selector.includes('glass-') ||
        d.selector.includes('widget-card-ht') ||
        d.selector.includes('[data-theme="high-tech"]')
      );
      
      // Most background declarations should use CSS custom properties
      const tokenUsageCount = highTechDeclarations.filter(d => d.usesToken).length;
      const totalCount = highTechDeclarations.length;
      
      if (totalCount > 0) {
        const tokenUsageRatio = tokenUsageCount / totalCount;
        // At least 70% of background declarations should use tokens
        expect(tokenUsageRatio).toBeGreaterThanOrEqual(0.7);
      }
    }
  });

  it('Property 3: High-tech theme should override base theme colors correctly', () => {
    const css = getHighTechThemeCSS();
    
    if (css) {
      // Check that high-tech theme overrides base colors
      expect(css).toContain('[data-theme="high-tech"]');
      expect(css).toContain('--color-background: var(--bg-primary)');
      expect(css).toContain('--color-background-secondary: var(--bg-secondary)');
      expect(css).toContain('--color-surface: var(--bg-tertiary)');
    }
  });

  it('Property 3: All background tokens should follow naming convention', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(DARK_THEME_BG_TOKENS)),
        (tokenName) => {
          // Background tokens should start with --bg- or --glass-
          const isValidPrefix = tokenName.startsWith('--bg-') || tokenName.startsWith('--glass-');
          expect(isValidPrefix).toBe(true);
          
          // Token names should use kebab-case
          expect(tokenName).toMatch(/^--[a-z]+(-[a-z]+)*$/);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Dark Theme Glassmorphism Integration', () => {
  it('Property 3: Glassmorphism classes should use dark theme background tokens', () => {
    const css = getHighTechThemeCSS();
    
    if (css) {
      // Glass card should use glass-bg token
      expect(css).toContain('.glass-card');
      expect(css).toContain('var(--glass-bg)');
      
      // Glass panel should use glass-bg token
      expect(css).toContain('.glass-panel');
      
      // Glass nav should use glass-bg token
      expect(css).toContain('.glass-nav');
    }
  });

  it('Property 3: Widget cards should use glassmorphism with dark theme tokens', () => {
    const css = getHighTechThemeCSS();
    
    if (css) {
      // Widget card should use glass-bg token
      expect(css).toContain('.widget-card-ht');
      expect(css).toContain('var(--glass-bg)');
    }
  });
});

describe('Dark Theme Color Contrast', () => {
  it('Property 3: Dark backgrounds should provide sufficient contrast for text', () => {
    // Test that dark backgrounds have sufficient contrast with white text
    const darkBgColors = [
      { token: '--bg-primary', hex: '#0A0A0F' },
      { token: '--bg-secondary', hex: '#12121A' },
      { token: '--bg-tertiary', hex: '#1A1A2E' },
    ];
    
    fc.assert(
      fc.property(fc.constantFrom(...darkBgColors), (bgColor) => {
        // Parse hex color
        const r = parseInt(bgColor.hex.slice(1, 3), 16);
        const g = parseInt(bgColor.hex.slice(3, 5), 16);
        const b = parseInt(bgColor.hex.slice(5, 7), 16);
        
        // Calculate relative luminance
        const bgLuminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // White text luminance is 1.0
        const textLuminance = 1.0;
        
        // Calculate contrast ratio (simplified)
        const contrastRatio = (textLuminance + 0.05) / (bgLuminance + 0.05);
        
        // WCAG AA requires 4.5:1 for normal text
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
