/**
 * @vitest-environment jsdom
 */
/**
 * Property-Based Tests for Button Glow on Interaction
 * 
 * **Feature: high-tech-ai-aesthetic, Property 13: Button Glow on Interaction**
 * **Validates: Requirements 6.1, 6.3**
 * 
 * Tests that for any primary button in hover or active state,
 * it should have an intensified glow effect compared to its default state.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// Read the actual CSS file content for testing
const getHighTechInteractiveCSS = (): string => {
  try {
    const cssPath = path.resolve(__dirname, 'high-tech-interactive.css');
    return fs.readFileSync(cssPath, 'utf-8');
  } catch {
    return '';
  }
};

// Button class names that should have glow effects
const neonButtonClasses = [
  'btn-neon-primary',
  'btn-neon-secondary',
];

// Button size variants
const buttonSizeVariants = [
  'btn-neon-primary--sm',
  'btn-neon-primary--lg',
  'btn-neon-secondary--sm',
  'btn-neon-secondary--lg',
];

// Button color variants
const buttonColorVariants = [
  'btn-neon-secondary--magenta',
  'btn-neon-secondary--purple',
];

// Interface for button glow properties
interface ButtonGlowProperties {
  className: string;
  hasDefaultGlow: boolean;
  hasHoverGlow: boolean;
  hasActiveGlow: boolean;
  hoverGlowIntensified: boolean;
  activeGlowIntensified: boolean;
  hasTransform: boolean;
  hasFlashEffect: boolean;
}

// Parse CSS to check for glow intensity values
const parseGlowIntensity = (glowValue: string): number => {
  // Extract the blur radius from box-shadow (e.g., "0 0 20px" -> 20)
  const matches = glowValue.match(/0\s+0\s+(\d+)px/g);
  if (!matches) return 0;
  
  // Sum all blur radii to get total intensity
  return matches.reduce((sum, match) => {
    const radius = parseInt(match.match(/(\d+)px/)?.[1] || '0', 10);
    return sum + radius;
  }, 0);
};

// Generator for button class names
const neonButtonClassGenerator = fc.constantFrom(...neonButtonClasses);
const buttonSizeVariantGenerator = fc.constantFrom(...buttonSizeVariants);
const buttonColorVariantGenerator = fc.constantFrom(...buttonColorVariants);

describe('Button Glow on Interaction Properties - Property 13', () => {
  /**
   * Property 13: Button Glow on Interaction
   * For any primary button in hover or active state, it should have
   * an intensified glow effect compared to its default state.
   */
  
  const css = getHighTechInteractiveCSS();
  
  it('Property 13: Neon primary button should have default glow effect', () => {
    // Check that btn-neon-primary has box-shadow glow
    expect(css).toContain('.btn-neon-primary');
    expect(css).toContain('box-shadow:');
    expect(css).toContain('var(--glow-cyan)');
  });

  it('Property 13: Neon primary button hover should have intensified glow', () => {
    // Check for hover state with intensified glow
    expect(css).toContain('.btn-neon-primary:hover:not(:disabled)');
    // Hover should have larger glow values (40px, 80px vs default 20px, 40px)
    expect(css).toMatch(/\.btn-neon-primary:hover:not\(:disabled\)[^}]*box-shadow:\s*0\s+0\s+40px/);
  });

  it('Property 13: Neon primary button active should have flash effect', () => {
    // Check for active state with flash effect
    expect(css).toContain('.btn-neon-primary:active:not(:disabled)');
    // Active should have even larger glow and inset glow for flash
    expect(css).toMatch(/\.btn-neon-primary:active:not\(:disabled\)[^}]*box-shadow:[^;]*inset/);
  });

  it('Property 13: Hover state should lift button with transform', () => {
    // Check for translateY on hover
    expect(css).toContain('.btn-neon-primary:hover:not(:disabled)');
    expect(css).toMatch(/transform:\s*translateY\(-2px\)/);
  });

  it('Property 13: Active state should return button to original position', () => {
    // Check for translateY(0) on active
    expect(css).toContain('.btn-neon-primary:active:not(:disabled)');
    expect(css).toMatch(/\.btn-neon-primary:active:not\(:disabled\)[^}]*transform:\s*translateY\(0\)/);
  });

  it('Property 13: Button should have gradient background', () => {
    // Check for gradient background
    expect(css).toContain('linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))');
  });

  it('Property 13: Button should have flash animation on press', () => {
    // Check for flash animation keyframes
    expect(css).toContain('@keyframes btn-flash');
    expect(css).toContain('.btn-neon-primary::after');
  });

  it('Property 13: All neon button types should have glow effects', () => {
    fc.assert(
      fc.property(neonButtonClassGenerator, (className) => {
        // Each button class should have box-shadow
        expect(css).toContain(`.${className}`);
        expect(css).toContain('box-shadow:');
        
        // Each button class should have hover state
        expect(css).toContain(`.${className}:hover:not(:disabled)`);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 13: Button size variants should be defined', () => {
    fc.assert(
      fc.property(buttonSizeVariantGenerator, (variant) => {
        // Each size variant should be defined
        expect(css).toContain(`.${variant}`);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 13: Secondary button color variants should have appropriate glow colors', () => {
    fc.assert(
      fc.property(buttonColorVariantGenerator, (variant) => {
        // Each color variant should be defined
        expect(css).toContain(`.${variant}`);
        
        // Each variant should have hover state
        expect(css).toContain(`.${variant}:hover:not(:disabled)`);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

describe('Button Glow Intensity Comparison', () => {
  const css = getHighTechInteractiveCSS();
  
  it('Property 13: Hover glow should be more intense than default glow', () => {
    // Default glow uses var(--glow-cyan) which is "0 0 20px var(--neon-cyan), 0 0 40px var(--neon-cyan-dim)"
    // Hover glow should be "0 0 40px var(--neon-cyan), 0 0 80px var(--neon-cyan-dim)"
    
    // Check that hover has larger values
    const hoverMatch = css.match(/\.btn-neon-primary:hover:not\(:disabled\)[^}]*box-shadow:\s*([^;]+);/);
    expect(hoverMatch).toBeTruthy();
    
    if (hoverMatch) {
      const hoverGlow = hoverMatch[1];
      // Hover should have 40px and 80px values
      expect(hoverGlow).toMatch(/40px/);
      expect(hoverGlow).toMatch(/80px/);
    }
  });

  it('Property 13: Active glow should be most intense', () => {
    // Active glow should have 60px and 100px values plus inset
    const activeMatch = css.match(/\.btn-neon-primary:active:not\(:disabled\)[^}]*box-shadow:\s*([^;]+);/);
    expect(activeMatch).toBeTruthy();
    
    if (activeMatch) {
      const activeGlow = activeMatch[1];
      // Active should have 60px and 100px values
      expect(activeGlow).toMatch(/60px/);
      expect(activeGlow).toMatch(/100px/);
      // Active should have inset for flash effect
      expect(activeGlow).toContain('inset');
    }
  });

  it('Property 13: Brightness filter should increase on hover and active', () => {
    // Check for filter: brightness on hover
    expect(css).toMatch(/\.btn-neon-primary:hover:not\(:disabled\)[^}]*filter:\s*brightness\(1\.1\)/);
    
    // Check for filter: brightness on active (should be higher)
    expect(css).toMatch(/\.btn-neon-primary:active:not\(:disabled\)[^}]*filter:\s*brightness\(1\.2\)/);
  });
});

describe('Button Accessibility', () => {
  const css = getHighTechInteractiveCSS();
  
  it('Property 13: Buttons should have focus-visible styles', () => {
    expect(css).toContain('.btn-neon-primary:focus-visible');
    expect(css).toContain('outline:');
  });

  it('Property 13: Disabled buttons should not have glow effects', () => {
    expect(css).toContain('.btn-neon-primary:disabled');
    expect(css).toMatch(/\.btn-neon-primary:disabled[^}]*box-shadow:\s*none/);
  });

  it('Property 13: Reduced motion should disable transitions', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('transition: none');
  });

  it('Property 13: Touch devices should have minimum touch target size', () => {
    expect(css).toContain('@media (pointer: coarse)');
    expect(css).toContain('min-height: var(--touch-target-min)');
    expect(css).toContain('min-width: var(--touch-target-min)');
  });
});

describe('Button Transitions', () => {
  const css = getHighTechInteractiveCSS();
  
  it('Property 13: Buttons should use transform and opacity for 60fps performance', () => {
    // Check that transitions use transform
    expect(css).toMatch(/transition:[^;]*transform/);
    
    // Check that transitions use box-shadow (for glow)
    expect(css).toMatch(/transition:[^;]*box-shadow/);
    
    // Check that transitions use filter (for brightness)
    expect(css).toMatch(/transition:[^;]*filter/);
  });

  it('Property 13: Transitions should use smooth easing', () => {
    expect(css).toContain('var(--ease-smooth)');
  });

  it('Property 13: Transitions should use normal duration', () => {
    expect(css).toContain('var(--duration-normal)');
  });
});
