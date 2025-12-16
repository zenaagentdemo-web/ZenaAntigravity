/**
 * Viseme type for lip sync mouth shapes
 */
export type Viseme = 'rest' | 'aa' | 'oh' | 'ee' | 'mm' | 'ff';

/**
 * Expression types for facial animations
 */
export type Expression = 'neutral' | 'happy' | 'thinking' | 'listening' | 'laughing';

/**
 * Eye state for blinking
 */
export type EyeState = 'open' | 'closed' | 'half';

/**
 * Mapping of visemes to asset paths
 */
export const VISEME_ASSETS: Record<Viseme, string> = {
    rest: '/assets/zena-mouth-rest.png',
    aa: '/assets/zena-mouth-aa.png',
    oh: '/assets/zena-mouth-oh.png',
    ee: '/assets/zena-mouth-ee.png',
    mm: '/assets/zena-mouth-mm.png',
    ff: '/assets/zena-mouth-ff.png',
};

/**
 * Mapping of expressions to full-face asset paths
 */
export const EXPRESSION_ASSETS: Record<Expression, string> = {
    neutral: '/assets/zena-base.jpg',
    happy: '/assets/zena-expression-happy.png',
    thinking: '/assets/zena-expression-thinking.png',
    listening: '/assets/zena-expression-listening.png',
    laughing: '/assets/zena-expression-laughing.png',
};

/**
 * Eye state assets
 */
export const EYE_ASSETS: Record<EyeState, string> = {
    open: '/assets/zena-base.jpg', // Base image has open eyes
    closed: '/assets/zena-eyes-closed.png',
    half: '/assets/zena-eyes-closed.png', // Use closed as fallback for half
};

/**
 * Base Zena image
 */
export const ZENA_BASE = '/assets/zena-base.jpg';

/**
 * Amplitude thresholds for viseme selection
 */
export const AMPLITUDE_THRESHOLDS = {
    silent: 0.05,    // Below this = rest
    quiet: 0.15,     // mm sound
    medium: 0.35,    // ee sound  
    loud: 0.55,      // aa sound
    veryLoud: 0.75,  // oh sound
};

/**
 * Timing constants
 */
export const ANIMATION_TIMING = {
    blinkInterval: { min: 2000, max: 6000 }, // ms between blinks
    blinkDuration: 150, // ms for blink animation
    visemeTransition: 50, // ms for mouth shape transitions
    expressionTransition: 300, // ms for expression changes
};
