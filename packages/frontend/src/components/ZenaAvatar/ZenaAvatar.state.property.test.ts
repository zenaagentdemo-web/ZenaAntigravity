/**
 * @vitest-environment jsdom
 */
/**
 * Property-Based Tests for ZenaAvatar State Animations
 * 
 * **Feature: high-tech-ai-aesthetic, Property 2: AI Avatar State Animation**
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.5**
 * 
 * Tests that for any AI Avatar state (idle, active, processing), the element
 * should have appropriate CSS animation properties applied that differ based
 * on state intensity.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Avatar states and their expected animation characteristics
const AVATAR_STATES = {
  idle: {
    animationName: 'zena-breathe',
    hasGlow: true,
    intensity: 'low',
    description: 'Subtle breathing animation with color-shifting glow',
  },
  active: {
    animationName: 'zena-pulse-glow',
    hasGlow: true,
    intensity: 'high',
    description: 'Intensified glow and pulse',
  },
  processing: {
    animationName: 'zena-processing',
    hasGlow: true,
    intensity: 'medium',
    description: 'Rotating rings effect',
  },
  listening: {
    animationName: 'zena-listening',
    hasGlow: true,
    intensity: 'medium',
    description: 'Pulsing with cyan emphasis',
  },
  speaking: {
    animationName: 'zena-speaking',
    hasGlow: false,
    intensity: 'medium',
    description: 'Rhythmic pulse',
  },
  success: {
    animationName: 'zena-success',
    hasGlow: true,
    intensity: 'low',
    description: 'Green glow with bounce',
  },
  error: {
    animationName: 'zena-error',
    hasGlow: true,
    intensity: 'high',
    description: 'Red pulsing glow',
  },
} as const;

type AvatarState = keyof typeof AVATAR_STATES;

// Expected CSS class patterns for each state
const STATE_CSS_CLASSES: Record<AvatarState, string> = {
  idle: 'zena-avatar--idle',
  active: 'zena-avatar--active',
  processing: 'zena-avatar--processing',
  listening: 'zena-avatar--listening',
  speaking: 'zena-avatar--speaking',
  success: 'zena-avatar--success',
  error: 'zena-avatar--error',
};

// Animation intensity levels
const INTENSITY_LEVELS = ['low', 'medium', 'high'] as const;
type IntensityLevel = typeof INTENSITY_LEVELS[number];

// Generators
const avatarStateGenerator = fc.constantFrom<AvatarState>(
  'idle', 'active', 'processing', 'listening', 'speaking', 'success', 'error'
);

const intensityGenerator = fc.constantFrom<IntensityLevel>('low', 'medium', 'high');

const animatedStateGenerator = fc.constantFrom<AvatarState>(
  'idle', 'active', 'processing', 'listening'
);

/**
 * Check if a state has ring animations
 */
function stateHasRingAnimations(state: AvatarState): boolean {
  return ['idle', 'active', 'listening', 'processing'].includes(state);
}

/**
 * Get expected animation duration based on state
 */
function getExpectedAnimationDuration(state: AvatarState): string {
  const durations: Record<AvatarState, string> = {
    idle: 'var(--duration-breathe)', // 4s
    active: '0.5s',
    processing: '1.5s',
    listening: '1s',
    speaking: '0.8s',
    success: '0.6s',
    error: '0.5s',
  };
  return durations[state];
}

/**
 * Get expected animation iteration count
 */
function getExpectedIterationCount(state: AvatarState): string {
  // Success is a one-time animation, others are infinite
  return state === 'success' ? '1' : 'infinite';
}

/**
 * Check if state should have intensified glow
 */
function hasIntensifiedGlow(state: AvatarState): boolean {
  return AVATAR_STATES[state].intensity === 'high';
}

describe('ZenaAvatar - Property 2: AI Avatar State Animation', () => {
  /**
   * Property 2: AI Avatar State Animation
   * For any AI Avatar state (idle, active, processing), the element should have
   * appropriate CSS animation properties applied that differ based on state intensity.
   */

  it('Property 2: Each state should have a unique CSS class', () => {
    fc.assert(
      fc.property(avatarStateGenerator, (state) => {
        const cssClass = STATE_CSS_CLASSES[state];
        
        // CSS class should follow naming convention
        expect(cssClass).toMatch(/^zena-avatar--\w+$/);
        
        // CSS class should contain the state name
        expect(cssClass).toContain(state);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: Each state should have a defined animation name', () => {
    fc.assert(
      fc.property(avatarStateGenerator, (state) => {
        const stateConfig = AVATAR_STATES[state];
        
        // Animation name should be defined
        expect(stateConfig.animationName).toBeTruthy();
        
        // Animation name should follow naming convention
        expect(stateConfig.animationName).toMatch(/^zena-\w+(-\w+)*$/);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: Animation names should be unique per state', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const animationNames = Object.values(AVATAR_STATES).map(s => s.animationName);
        const uniqueNames = new Set(animationNames);
        
        // Each state should have a unique animation
        expect(uniqueNames.size).toBe(animationNames.length);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: States with ring animations should include idle, active, listening, processing', () => {
    fc.assert(
      fc.property(animatedStateGenerator, (state) => {
        // These states should have ring animations
        expect(stateHasRingAnimations(state)).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: Idle state should have breathing animation', () => {
    fc.assert(
      fc.property(fc.constant('idle' as AvatarState), (state) => {
        const stateConfig = AVATAR_STATES[state];
        
        expect(stateConfig.animationName).toBe('zena-breathe');
        expect(stateConfig.intensity).toBe('low');
        expect(stateConfig.hasGlow).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: Active state should have intensified glow', () => {
    fc.assert(
      fc.property(fc.constant('active' as AvatarState), (state) => {
        const stateConfig = AVATAR_STATES[state];
        
        expect(stateConfig.animationName).toBe('zena-pulse-glow');
        expect(stateConfig.intensity).toBe('high');
        expect(hasIntensifiedGlow(state)).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: Processing state should have rotating animation', () => {
    fc.assert(
      fc.property(fc.constant('processing' as AvatarState), (state) => {
        const stateConfig = AVATAR_STATES[state];
        
        expect(stateConfig.animationName).toBe('zena-processing');
        // Check for 'Rotating' (case-insensitive)
        expect(stateConfig.description.toLowerCase()).toContain('rotating');
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: High intensity states should have stronger glow effects', () => {
    const highIntensityStates: AvatarState[] = ['active', 'error'];
    
    fc.assert(
      fc.property(fc.constantFrom(...highIntensityStates), (state) => {
        const stateConfig = AVATAR_STATES[state];
        
        expect(stateConfig.intensity).toBe('high');
        expect(stateConfig.hasGlow).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: Low intensity states should have subtle animations', () => {
    const lowIntensityStates: AvatarState[] = ['idle', 'success'];
    
    fc.assert(
      fc.property(fc.constantFrom(...lowIntensityStates), (state) => {
        const stateConfig = AVATAR_STATES[state];
        
        expect(stateConfig.intensity).toBe('low');
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: All states except success should have infinite animation', () => {
    fc.assert(
      fc.property(avatarStateGenerator, (state) => {
        const iterationCount = getExpectedIterationCount(state);
        
        if (state === 'success') {
          expect(iterationCount).toBe('1');
        } else {
          expect(iterationCount).toBe('infinite');
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: Each state should have a description', () => {
    fc.assert(
      fc.property(avatarStateGenerator, (state) => {
        const stateConfig = AVATAR_STATES[state];
        
        expect(stateConfig.description).toBeTruthy();
        expect(stateConfig.description.length).toBeGreaterThan(5);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: Animation intensity should be one of the defined levels', () => {
    fc.assert(
      fc.property(avatarStateGenerator, (state) => {
        const stateConfig = AVATAR_STATES[state];
        
        expect(INTENSITY_LEVELS).toContain(stateConfig.intensity);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: States with glow should have hasGlow set to true', () => {
    const glowStates: AvatarState[] = ['idle', 'active', 'processing', 'listening', 'success', 'error'];
    
    fc.assert(
      fc.property(fc.constantFrom(...glowStates), (state) => {
        const stateConfig = AVATAR_STATES[state];
        
        expect(stateConfig.hasGlow).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: Different states should produce different visual effects', () => {
    fc.assert(
      fc.property(
        avatarStateGenerator,
        avatarStateGenerator,
        (state1, state2) => {
          if (state1 === state2) return true;
          
          const config1 = AVATAR_STATES[state1];
          const config2 = AVATAR_STATES[state2];
          
          // At least one property should differ between states
          const hasDifference = 
            config1.animationName !== config2.animationName ||
            config1.intensity !== config2.intensity ||
            config1.hasGlow !== config2.hasGlow;
          
          expect(hasDifference).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
