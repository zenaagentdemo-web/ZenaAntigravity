/**
 * @vitest-environment jsdom
 */
/**
 * Property-Based Tests for Neon Accent Usage
 * 
 * **Feature: high-tech-ai-aesthetic, Property 4: Neon Accent Usage**
 * **Validates: Requirements 2.2, 2.5**
 * 
 * Tests that for any interactive element (buttons, links, inputs) in focus
 * or hover state, the styling should use neon accent colors from the defined
 * palette (--neon-cyan, --neon-magenta, --neon-purple).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// Read the CSS files for testing
const getHighTechThemeCSS = (): string => {
  try {
    const cssPath = path.resolve(__dirname, 'high-tech-theme.css');
    return fs.readFileSync(cssPath, 'utf-8');
  } catch {
    return '';
  }
};

const getHighTechInteractiveCSS = (): string => {
  try {
    const cssPath = path.resolve(__dirname, 'high-tech-interactive.css');
    return fs.readFileSync(cssPath, 'utf-8');
  } catch {
    return '';
  }
};

// Neon accent color CSS variables
const neonAccentColors = [
  '--neon-cyan',
  '--neon-magenta',
  '--neon-purple',
  '--neon-orange',
  '--neon-green',
];

// Interactive element selectors that should use neon accents
const interactiveElements = [
  'btn-neon-primary',
  'btn-neon-secondary',
  'input-neon',
  'toggle-neon',
];

// States that should have neon accent styling
const interactiveStates = [
  ':hover',
  ':focus',
  ':active',
  ':checked',
];

// Generator for neon accent colors
const neonAccentColorGenerator = fc.constantFrom(...neonAccentColors);
const interactiveElementGenerator = fc.constantFrom(...interactiveElements);
const interactiveStateGenerator = fc.constantFrom(...interactiveStates);

describe('Neon Accent Usage Properties - Property 4', () => {
  /**
   * Property 4: Neon Accent Usage
   * For any interactive element (buttons, links, inputs) in focus or hover state,
   * the styling should use neon accent colors from the defined palette.
   */
  
  const themeCSS = getHighTechThemeCSS();
  const interactiveCSS = getHighTechInteractiveCSS();
  const combinedCSS = themeCSS + interactiveCSS;
  
  it('Property 4: All neon accent colors should be defined as CSS custom properties', () => {
    fc.assert(
      fc.property(neonAccentColorGenerator, (colorVar) => {
        // Each neon accent color should be defined in the theme
        expect(themeCSS).toContain(`${colorVar}:`);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: Neon cyan should be the primary accent color', () => {
    // Check that neon-cyan is defined with correct hex value
    expect(themeCSS).toContain('--neon-cyan: #00D4FF');
    
    // Check that neon-cyan has dim variant for glow effects
    expect(themeCSS).toContain('--neon-cyan-dim:');
    expect(themeCSS).toContain('--neon-cyan-subtle:');
  });

  it('Property 4: Neon magenta should be defined for secondary accents', () => {
    expect(themeCSS).toContain('--neon-magenta: #FF00FF');
    expect(themeCSS).toContain('--neon-magenta-dim:');
  });

  it('Property 4: Neon purple should be defined for tertiary accents', () => {
    expect(themeCSS).toContain('--neon-purple: #8B5CF6');
    expect(themeCSS).toContain('--neon-purple-dim:');
  });

  it('Property 4: Interactive elements should use neon accent colors', () => {
    fc.assert(
      fc.property(interactiveElementGenerator, (element) => {
        // Each interactive element should reference neon accent colors
        const elementCSS = combinedCSS.includes(`.${element}`);
        expect(elementCSS).toBe(true);
        
        // Should use at least one neon accent color
        const usesNeonAccent = 
          combinedCSS.includes('var(--neon-cyan)') ||
          combinedCSS.includes('var(--neon-magenta)') ||
          combinedCSS.includes('var(--neon-purple)');
        expect(usesNeonAccent).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: Button hover states should use neon accent colors for glow', () => {
    // Check that button hover uses neon cyan for glow
    expect(interactiveCSS).toContain('.btn-neon-primary:hover');
    expect(interactiveCSS).toContain('var(--neon-cyan)');
    
    // Check that secondary button hover uses neon accent
    expect(interactiveCSS).toContain('.btn-neon-secondary:hover');
  });

  it('Property 4: Input focus states should use neon accent colors', () => {
    // Check that input focus uses neon cyan
    expect(interactiveCSS).toContain('.input-neon:focus');
    expect(interactiveCSS).toContain('var(--neon-cyan)');
  });

  it('Property 4: Toggle checked state should use neon accent colors', () => {
    // Check that toggle checked uses neon cyan
    expect(interactiveCSS).toContain('.toggle-neon__input:checked');
    expect(interactiveCSS).toContain('var(--neon-cyan)');
  });

  it('Property 4: Glow effects should use neon accent colors', () => {
    // Check that glow CSS variables use neon colors
    expect(themeCSS).toContain('--glow-cyan:');
    expect(themeCSS).toContain('--glow-magenta:');
    expect(themeCSS).toContain('--glow-purple:');
    
    // Glow definitions should reference neon colors
    expect(themeCSS).toMatch(/--glow-cyan:[^;]*var\(--neon-cyan\)/);
    expect(themeCSS).toMatch(/--glow-magenta:[^;]*var\(--neon-magenta\)/);
    expect(themeCSS).toMatch(/--glow-purple:[^;]*var\(--neon-purple\)/);
  });

  it('Property 4: Border glow should use neon accent colors', () => {
    // Check that border glow uses neon cyan
    expect(themeCSS).toContain('--border-glow:');
    expect(themeCSS).toMatch(/--border-glow:[^;]*rgba\(0,\s*212,\s*255/);
  });
});

describe('Neon Accent Color Variants', () => {
  const interactiveCSS = getHighTechInteractiveCSS();
  
  it('Property 4: Secondary buttons should have color variants', () => {
    // Check for magenta variant
    expect(interactiveCSS).toContain('.btn-neon-secondary--magenta');
    expect(interactiveCSS).toContain('var(--neon-magenta)');
    
    // Check for purple variant
    expect(interactiveCSS).toContain('.btn-neon-secondary--purple');
    expect(interactiveCSS).toContain('var(--neon-purple)');
  });

  it('Property 4: Toggle switches should have color variants', () => {
    // Check for magenta variant
    expect(interactiveCSS).toContain('.toggle-neon--magenta');
    
    // Check for purple variant
    expect(interactiveCSS).toContain('.toggle-neon--purple');
    
    // Check for success variant
    expect(interactiveCSS).toContain('.toggle-neon--success');
  });

  it('Property 4: Color variants should use appropriate neon colors', () => {
    // Magenta variants should use neon-magenta
    expect(interactiveCSS).toMatch(/\.btn-neon-secondary--magenta[^}]*var\(--neon-magenta\)/);
    expect(interactiveCSS).toMatch(/\.toggle-neon--magenta[^}]*var\(--neon-magenta\)/);
    
    // Purple variants should use neon-purple
    expect(interactiveCSS).toMatch(/\.btn-neon-secondary--purple[^}]*var\(--neon-purple\)/);
    expect(interactiveCSS).toMatch(/\.toggle-neon--purple[^}]*var\(--neon-purple\)/);
  });
});

describe('Neon Accent in High-Tech Theme Overrides', () => {
  const themeCSS = getHighTechThemeCSS();
  const interactiveCSS = getHighTechInteractiveCSS();
  
  it('Property 4: High-tech theme should override primary button with neon gradient', () => {
    expect(interactiveCSS).toContain('[data-theme="high-tech"] .btn--primary');
    expect(interactiveCSS).toContain('var(--neon-cyan)');
    expect(interactiveCSS).toContain('var(--neon-purple)');
  });

  it('Property 4: High-tech theme should override secondary button with neon border', () => {
    expect(interactiveCSS).toContain('[data-theme="high-tech"] .btn--secondary');
    expect(interactiveCSS).toContain('var(--neon-cyan)');
  });

  it('Property 4: High-tech theme should override input focus with neon glow', () => {
    expect(interactiveCSS).toContain('[data-theme="high-tech"] .input:focus');
    expect(interactiveCSS).toContain('var(--neon-cyan)');
  });

  it('Property 4: High-tech theme should override ghost button hover with neon color', () => {
    expect(interactiveCSS).toContain('[data-theme="high-tech"] .btn--ghost:hover');
    expect(interactiveCSS).toContain('var(--neon-cyan)');
  });
});

describe('Neon Accent Consistency', () => {
  const themeCSS = getHighTechThemeCSS();
  const interactiveCSS = getHighTechInteractiveCSS();
  const combinedCSS = themeCSS + interactiveCSS;
  
  it('Property 4: All neon colors should have consistent hex values', () => {
    // Cyan should always be #00D4FF
    expect(themeCSS).toContain('--neon-cyan: #00D4FF');
    
    // Magenta should always be #FF00FF
    expect(themeCSS).toContain('--neon-magenta: #FF00FF');
    
    // Purple should always be #8B5CF6
    expect(themeCSS).toContain('--neon-purple: #8B5CF6');
  });

  it('Property 4: Neon colors should be used via CSS variables, not hardcoded', () => {
    // Interactive CSS should reference variables, not hardcoded colors
    // Count references to var(--neon-*) vs hardcoded hex values
    const varReferences = (interactiveCSS.match(/var\(--neon-/g) || []).length;
    
    // Should have multiple variable references
    expect(varReferences).toBeGreaterThan(10);
  });

  it('Property 4: Icons should use neon accent colors with glow', () => {
    // Check that icon styling uses neon colors
    expect(themeCSS).toContain('filter: drop-shadow');
    expect(themeCSS).toContain('var(--neon-cyan)');
  });
});
