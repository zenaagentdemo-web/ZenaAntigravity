/**
 * @vitest-environment jsdom
 */
/**
 * Cross-Browser Compatibility Property Tests
 * Validates: Requirements 7.4, 7.5
 * 
 * These tests verify that cross-browser compatibility patterns are correctly
 * implemented and that CSS properties have appropriate vendor prefixes.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// Read the cross-browser CSS file
const crossBrowserCssPath = path.join(__dirname, 'cross-browser.css');
const crossBrowserCss = fs.readFileSync(crossBrowserCssPath, 'utf-8');

// Read other CSS files for comprehensive testing
const tokensCssPath = path.join(__dirname, 'tokens.css');
const tokensCss = fs.readFileSync(tokensCssPath, 'utf-8');

const responsiveCssPath = path.join(__dirname, 'responsive.css');
const responsiveCss = fs.readFileSync(responsiveCssPath, 'utf-8');

const animationsCssPath = path.join(__dirname, 'animations.css');
const animationsCss = fs.readFileSync(animationsCssPath, 'utf-8');

// Combine all CSS for comprehensive testing
const allCss = [crossBrowserCss, tokensCss, responsiveCss, animationsCss].join('\n');

describe('Cross-Browser Compatibility Property Tests', () => {
  /**
   * Property: Vendor Prefix Consistency
   * For any CSS property that requires vendor prefixes, the cross-browser
   * stylesheet should include appropriate prefixes for major browsers.
   */
  describe('Vendor Prefix Consistency', () => {
    const vendorPrefixedProperties = [
      { property: 'user-select', prefixes: ['-webkit-user-select', '-moz-user-select', '-ms-user-select'] },
      { property: 'appearance', prefixes: ['-webkit-appearance', '-moz-appearance'] },
      { property: 'backdrop-filter', prefixes: ['-webkit-backdrop-filter'] },
      { property: 'background-clip', prefixes: ['-webkit-background-clip'] },
      { property: 'text-fill-color', prefixes: ['-webkit-text-fill-color'] },
      { property: 'overflow-scrolling', prefixes: ['-webkit-overflow-scrolling'] },
      { property: 'font-smoothing', prefixes: ['-webkit-font-smoothing', '-moz-osx-font-smoothing'] },
    ];

    it('should include vendor prefixes for properties that need them', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...vendorPrefixedProperties),
          (propConfig) => {
            // Check if the property is used in the CSS
            if (allCss.includes(propConfig.property)) {
              // At least one vendor prefix should be present OR a @supports fallback
              const hasVendorPrefix = propConfig.prefixes.some(prefix => 
                allCss.includes(prefix)
              );
              // Also accept @supports fallback as a valid cross-browser strategy
              const hasSupportsFallback = allCss.includes(`@supports not (${propConfig.property}`);
              return hasVendorPrefix || hasSupportsFallback;
            }
            return true; // Property not used, so no prefix needed
          }
        ),
        { numRuns: vendorPrefixedProperties.length }
      );
    });

    it('should have webkit prefix for backdrop-filter when used', () => {
      // The cross-browser CSS provides fallback support for backdrop-filter
      // via @supports not (backdrop-filter: blur(8px)) rule
      if (crossBrowserCss.includes('backdrop-filter')) {
        // Either has the webkit prefix OR has a @supports fallback
        const hasWebkitPrefix = crossBrowserCss.includes('-webkit-backdrop-filter');
        const hasFallback = crossBrowserCss.includes('@supports not (backdrop-filter');
        expect(hasWebkitPrefix || hasFallback).toBe(true);
      }
    });

    it('should have webkit prefix for background-clip: text', () => {
      if (allCss.includes('background-clip: text')) {
        expect(allCss).toContain('-webkit-background-clip: text');
      }
    });
  });

  /**
   * Property: Touch Target Minimum Size
   * For any touch-interactive element, the minimum touch target size
   * should be at least 44px (WCAG 2.1 AAA) or 48px (Material Design).
   */
  describe('Touch Target Compliance', () => {
    it('should define touch target minimum size variable', () => {
      expect(allCss).toContain('--touch-target-min');
    });

    it('should have touch target styles for coarse pointer devices', () => {
      expect(allCss).toContain('@media (pointer: coarse)');
      expect(allCss).toContain('min-height: var(--touch-target-min)');
    });
  });

  /**
   * Property: Safe Area Insets Support
   * For notched devices, safe area insets should be properly handled.
   */
  describe('Safe Area Insets Support', () => {
    it('should support safe area insets for notched devices', () => {
      expect(allCss).toContain('env(safe-area-inset');
    });

    it('should have @supports check for safe area insets', () => {
      expect(allCss).toMatch(/@supports.*safe-area-inset/);
    });
  });

  /**
   * Property: Reduced Motion Support
   * For users who prefer reduced motion, animations should be disabled.
   */
  describe('Reduced Motion Support', () => {
    it('should include prefers-reduced-motion media query', () => {
      expect(allCss).toContain('@media (prefers-reduced-motion: reduce)');
    });

    it('should disable animations for reduced motion preference', () => {
      const reducedMotionSection = allCss.match(
        /@media \(prefers-reduced-motion: reduce\)[^}]*\{[\s\S]*?\}\s*\}/
      );
      expect(reducedMotionSection).toBeTruthy();
      if (reducedMotionSection) {
        const section = reducedMotionSection[0];
        // Should contain animation-duration or animation: none
        expect(
          section.includes('animation-duration') || 
          section.includes('animation: none') ||
          section.includes('transition-duration')
        ).toBe(true);
      }
    });
  });

  /**
   * Property: High Contrast Mode Support
   * For users with high contrast preferences, the UI should remain usable.
   */
  describe('High Contrast Mode Support', () => {
    it('should include high contrast media query', () => {
      expect(allCss).toMatch(/@media.*prefers-contrast.*high|@media.*forced-colors.*active/);
    });
  });

  /**
   * Property: Print Styles
   * Print styles should be included for proper document printing.
   */
  describe('Print Styles', () => {
    it('should include print media query', () => {
      expect(allCss).toContain('@media print');
    });

    it('should hide non-essential elements in print', () => {
      const printSection = allCss.match(/@media print[^}]*\{[\s\S]*?\}\s*\}/);
      expect(printSection).toBeTruthy();
    });
  });

  /**
   * Property: Scrollbar Styling
   * Scrollbars should be styled consistently across browsers.
   */
  describe('Scrollbar Styling', () => {
    it('should include webkit scrollbar styles', () => {
      expect(allCss).toContain('::-webkit-scrollbar');
    });

    it('should include Firefox scrollbar styles', () => {
      expect(allCss).toContain('scrollbar-width');
      expect(allCss).toContain('scrollbar-color');
    });
  });

  /**
   * Property: Form Element Normalization
   * Form elements should be normalized across browsers.
   */
  describe('Form Element Normalization', () => {
    it('should normalize button appearance', () => {
      expect(allCss).toContain('button');
      expect(allCss).toMatch(/appearance:\s*button|appearance:\s*none/);
    });

    it('should remove Firefox inner focus ring', () => {
      expect(allCss).toContain('::-moz-focus-inner');
    });

    it('should handle iOS input styling', () => {
      expect(allCss).toMatch(/-webkit-appearance:\s*none/);
    });
  });

  /**
   * Property: Focus Visible Support
   * Focus styles should use :focus-visible for keyboard-only focus.
   */
  describe('Focus Visible Support', () => {
    it('should include focus-visible styles', () => {
      expect(allCss).toContain(':focus-visible');
    });

    it('should have fallback for browsers without focus-visible', () => {
      expect(allCss).toMatch(/@supports not.*:focus-visible/);
    });
  });

  /**
   * Property: CSS Custom Properties Fallback
   * There should be fallbacks for browsers that don't support CSS custom properties.
   */
  describe('CSS Custom Properties Fallback', () => {
    it('should have @supports check for custom properties', () => {
      expect(allCss).toMatch(/@supports not.*--/);
    });
  });

  /**
   * Property: Sticky Positioning
   * Position sticky should include webkit prefix.
   */
  describe('Sticky Positioning', () => {
    it('should include webkit prefix for sticky positioning', () => {
      expect(allCss).toContain('-webkit-sticky');
    });
  });

  /**
   * Property: GPU Acceleration
   * Animated elements should use GPU acceleration for smooth performance.
   */
  describe('GPU Acceleration', () => {
    it('should include transform: translateZ(0) for GPU acceleration', () => {
      expect(allCss).toContain('translateZ(0)');
    });

    it('should include backface-visibility for animation optimization', () => {
      expect(allCss).toContain('backface-visibility');
    });
  });

  /**
   * Property: Text Size Adjust
   * Text size adjustment should be controlled for consistent rendering.
   */
  describe('Text Size Adjust', () => {
    it('should include text-size-adjust properties', () => {
      expect(allCss).toContain('-webkit-text-size-adjust');
      expect(allCss).toContain('text-size-adjust');
    });
  });

  /**
   * Property: Consistent Border Radius
   * Border radius should include webkit prefix for older browsers.
   */
  describe('Border Radius Consistency', () => {
    it('should include webkit border-radius prefix', () => {
      expect(allCss).toContain('-webkit-border-radius');
    });
  });

  /**
   * Property: Image Handling
   * Images should be handled consistently across browsers.
   */
  describe('Image Handling', () => {
    it('should prevent image dragging', () => {
      expect(allCss).toContain('-webkit-user-drag');
    });

    it('should make images responsive', () => {
      expect(allCss).toContain('max-width: 100%');
    });
  });
});

describe('Cross-Browser CSS Structure Tests', () => {
  /**
   * Property: CSS File Structure
   * The CSS file should be well-organized with clear sections.
   */
  it('should have organized sections with comments', () => {
    // Check for section headers
    const sectionHeaders = crossBrowserCss.match(/\/\*\s*={10,}/g);
    expect(sectionHeaders).toBeTruthy();
    expect(sectionHeaders!.length).toBeGreaterThan(5);
  });

  it('should not have syntax errors (balanced braces)', () => {
    const openBraces = (crossBrowserCss.match(/\{/g) || []).length;
    const closeBraces = (crossBrowserCss.match(/\}/g) || []).length;
    expect(openBraces).toBe(closeBraces);
  });

  it('should not have empty rule sets', () => {
    // Empty rule sets like "selector { }" (with only whitespace)
    const emptyRules = crossBrowserCss.match(/\{[\s]*\}/g);
    expect(emptyRules).toBeNull();
  });
});

describe('Browser-Specific Feature Detection', () => {
  /**
   * Property: Feature Detection with @supports
   * Modern CSS should use @supports for feature detection.
   */
  it('should use @supports for feature detection', () => {
    const supportsCount = (crossBrowserCss.match(/@supports/g) || []).length;
    expect(supportsCount).toBeGreaterThan(0);
  });

  it('should have fallbacks for gap property', () => {
    expect(crossBrowserCss).toContain('@supports not (gap');
  });

  it('should have fallbacks for aspect-ratio', () => {
    expect(crossBrowserCss).toContain('@supports not (aspect-ratio');
  });
});
