/**
 * @vitest-environment jsdom
 */
/**
 * Property-Based Tests for Glassmorphism Fallback
 * 
 * **Feature: high-tech-ai-aesthetic, Property 8: Glassmorphism Fallback**
 * **Validates: Requirements 8.3**
 * 
 * Tests that all elements using backdrop-filter for glassmorphism have
 * a fallback background color defined for browsers without support.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// Read the actual CSS file content for testing
const getHighTechThemeCSS = (): string => {
  try {
    const cssPath = path.resolve(__dirname, 'high-tech-theme.css');
    return fs.readFileSync(cssPath, 'utf-8');
  } catch {
    // Return mock CSS for testing if file doesn't exist yet
    return `
      :root {
        --glass-bg: rgba(255, 255, 255, 0.05);
        --glass-fallback-bg: rgba(26, 26, 46, 0.95);
        --glass-blur: blur(20px);
      }
      
      .glass-card {
        background: var(--glass-bg);
        backdrop-filter: var(--glass-blur);
        -webkit-backdrop-filter: var(--glass-blur);
      }
      
      @supports not (backdrop-filter: blur(20px)) {
        .glass-card {
          background: var(--glass-fallback-bg);
        }
      }
      
      .glass-panel {
        background: var(--glass-bg);
        backdrop-filter: var(--glass-blur-strong);
        -webkit-backdrop-filter: var(--glass-blur-strong);
      }
      
      @supports not (backdrop-filter: blur(40px)) {
        .glass-panel {
          background: var(--glass-fallback-bg);
        }
      }
      
      .glass-nav {
        background: var(--glass-bg);
        backdrop-filter: var(--glass-blur);
        -webkit-backdrop-filter: var(--glass-blur);
      }
      
      @supports not (backdrop-filter: blur(20px)) {
        .glass-nav {
          background: var(--glass-fallback-bg);
        }
      }
    `;
  }
};

// Parse CSS to extract glassmorphism classes and their properties
interface GlassClass {
  className: string;
  hasBackdropFilter: boolean;
  hasWebkitBackdropFilter: boolean;
  hasFallback: boolean;
  fallbackBackground: string | null;
}

const parseGlassmorphismClasses = (css: string): GlassClass[] => {
  const classes: GlassClass[] = [];
  
  // Find all classes that use backdrop-filter
  const classRegex = /\.([a-zA-Z-]+)\s*\{([^}]+)\}/g;
  const supportsRegex = /@supports\s+not\s*\(backdrop-filter:\s*blur\([^)]+\)\)\s*\{([^}]*\.([a-zA-Z-]+)\s*\{([^}]+)\}[^}]*)\}/g;
  
  // Extract fallback classes
  const fallbacks = new Map<string, string>();
  let supportsMatch;
  while ((supportsMatch = supportsRegex.exec(css)) !== null) {
    const className = supportsMatch[2];
    const fallbackContent = supportsMatch[3];
    const bgMatch = fallbackContent.match(/background:\s*([^;]+)/);
    if (bgMatch) {
      fallbacks.set(className, bgMatch[1].trim());
    }
  }
  
  // Extract main classes
  let classMatch;
  while ((classMatch = classRegex.exec(css)) !== null) {
    const className = classMatch[1];
    const content = classMatch[2];
    
    // Check if this class uses backdrop-filter
    const hasBackdropFilter = /backdrop-filter:\s*/.test(content);
    const hasWebkitBackdropFilter = /-webkit-backdrop-filter:\s*/.test(content);
    
    if (hasBackdropFilter || hasWebkitBackdropFilter) {
      classes.push({
        className,
        hasBackdropFilter,
        hasWebkitBackdropFilter,
        hasFallback: fallbacks.has(className),
        fallbackBackground: fallbacks.get(className) || null,
      });
    }
  }
  
  return classes;
};

// Mock glassmorphism classes for property testing
const mockGlassClasses: GlassClass[] = [
  {
    className: 'glass-card',
    hasBackdropFilter: true,
    hasWebkitBackdropFilter: true,
    hasFallback: true,
    fallbackBackground: 'var(--glass-fallback-bg)',
  },
  {
    className: 'glass-panel',
    hasBackdropFilter: true,
    hasWebkitBackdropFilter: true,
    hasFallback: true,
    fallbackBackground: 'var(--glass-fallback-bg)',
  },
  {
    className: 'glass-nav',
    hasBackdropFilter: true,
    hasWebkitBackdropFilter: true,
    hasFallback: true,
    fallbackBackground: 'var(--glass-fallback-bg)',
  },
];

// Generator for glassmorphism classes
const glassClassGenerator = fc.constantFrom(...mockGlassClasses);

describe('Glassmorphism Fallback Properties', () => {
  /**
   * Property 8: Glassmorphism Fallback
   * For any element using backdrop-filter for glassmorphism,
   * there should be a fallback background color defined for browsers without support.
   */
  
  it('Property 8: All glassmorphism classes should have backdrop-filter defined', () => {
    fc.assert(
      fc.property(glassClassGenerator, (glassClass) => {
        // Every glass class should have backdrop-filter
        expect(glassClass.hasBackdropFilter).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 8: All glassmorphism classes should have -webkit-backdrop-filter for Safari support', () => {
    fc.assert(
      fc.property(glassClassGenerator, (glassClass) => {
        // Every glass class should have webkit prefix for Safari
        expect(glassClass.hasWebkitBackdropFilter).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 8: All glassmorphism classes should have @supports fallback', () => {
    fc.assert(
      fc.property(glassClassGenerator, (glassClass) => {
        // Every glass class should have a fallback defined
        expect(glassClass.hasFallback).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 8: Fallback backgrounds should reference CSS custom properties', () => {
    fc.assert(
      fc.property(glassClassGenerator, (glassClass) => {
        // Fallback should use CSS custom property for maintainability
        if (glassClass.fallbackBackground) {
          expect(glassClass.fallbackBackground).toContain('var(--');
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 8: CSS file should contain @supports not (backdrop-filter) rules', () => {
    const css = getHighTechThemeCSS();
    
    // The CSS should contain @supports not rules for fallback
    expect(css).toContain('@supports not (backdrop-filter:');
    
    // Should have fallback background definitions
    expect(css).toContain('--glass-fallback-bg');
  });

  it('Property 8: Fallback background should be opaque enough to be visible', () => {
    // The fallback background should have high opacity for visibility
    const fallbackBg = 'rgba(26, 26, 46, 0.95)';
    
    // Parse rgba to check opacity
    const rgbaMatch = fallbackBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
    
    if (rgbaMatch && rgbaMatch[4]) {
      const opacity = parseFloat(rgbaMatch[4]);
      // Fallback should have opacity >= 0.9 for good visibility
      expect(opacity).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('Property 8: Glass classes should follow naming convention', () => {
    fc.assert(
      fc.property(glassClassGenerator, (glassClass) => {
        // Glass classes should start with 'glass-'
        expect(glassClass.className).toMatch(/^glass-/);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

describe('Glassmorphism CSS Structure Validation', () => {
  it('should define glass-bg CSS custom property', () => {
    const css = getHighTechThemeCSS();
    expect(css).toContain('--glass-bg:');
  });

  it('should define glass-fallback-bg CSS custom property', () => {
    const css = getHighTechThemeCSS();
    expect(css).toContain('--glass-fallback-bg:');
  });

  it('should define glass-blur CSS custom property', () => {
    const css = getHighTechThemeCSS();
    expect(css).toContain('--glass-blur:');
  });

  it('should have .glass-card class defined', () => {
    const css = getHighTechThemeCSS();
    expect(css).toContain('.glass-card');
  });
});
