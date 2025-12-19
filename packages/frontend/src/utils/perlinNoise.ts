/**
 * Perlin Noise Implementation
 * 
 * Classic 2D Perlin noise for smooth, organic flow fields.
 * Used for particle movement and fluid dynamics effects.
 */

// Permutation table for gradient lookup
const permutation: number[] = [];
const gradients: { x: number; y: number }[] = [];

// Initialize permutation table and gradients
function initNoise(seed: number = 0): void {
    // Simple seeded random
    const seededRandom = (s: number) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
    };

    // Generate permutation table (256 entries)
    const perm: number[] = [];
    for (let i = 0; i < 256; i++) {
        perm.push(i);
    }

    // Shuffle with seed
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(seededRandom(seed + i) * (i + 1));
        [perm[i], perm[j]] = [perm[j], perm[i]];
    }

    // Double the permutation table
    permutation.length = 0;
    for (let i = 0; i < 512; i++) {
        permutation.push(perm[i & 255]);
    }

    // Generate gradients (unit vectors at various angles)
    gradients.length = 0;
    for (let i = 0; i < 256; i++) {
        const angle = (i / 256) * Math.PI * 2;
        gradients.push({
            x: Math.cos(angle),
            y: Math.sin(angle),
        });
    }
}

// Initialize on load
initNoise(42);

/**
 * Smoothstep interpolation (6t^5 - 15t^4 + 10t^3)
 * Provides smooth, continuous derivatives
 */
function fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Linear interpolation
 */
function lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
}

/**
 * Dot product of gradient and distance vector
 */
function grad(hash: number, x: number, y: number): number {
    const g = gradients[hash & 255];
    return g.x * x + g.y * y;
}

/**
 * 2D Perlin Noise
 * 
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns Noise value in range [-1, 1]
 */
export function noise2D(x: number, y: number): number {
    // Grid cell coordinates
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    // Relative position within cell [0, 1]
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    // Fade curves for interpolation
    const u = fade(xf);
    const v = fade(yf);

    // Hash coordinates of the 4 corners
    const aa = permutation[permutation[X] + Y];
    const ab = permutation[permutation[X] + Y + 1];
    const ba = permutation[permutation[X + 1] + Y];
    const bb = permutation[permutation[X + 1] + Y + 1];

    // Gradient dot products
    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);

    return lerp(x1, x2, v);
}

/**
 * Octave Perlin Noise (Fractal Brownian Motion)
 * 
 * Combines multiple noise octaves for more natural appearance.
 * 
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param octaves - Number of noise layers
 * @param persistence - Amplitude reduction per octave (0.5 typical)
 * @returns Noise value in range approximately [-1, 1]
 */
export function octaveNoise2D(
    x: number,
    y: number,
    octaves: number = 4,
    persistence: number = 0.5
): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
        total += noise2D(x * frequency, y * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2;
    }

    return total / maxValue;
}

/**
 * Flow Field Angle
 * 
 * Returns an angle in radians based on noise at position.
 * Used for directing particle movement.
 * 
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param time - Time offset for animation
 * @param scale - Noise scale (lower = larger patterns)
 * @returns Angle in radians [0, 2π]
 */
export function flowFieldAngle(
    x: number,
    y: number,
    time: number,
    scale: number = 0.003
): number {
    const noiseValue = noise2D(x * scale, y * scale + time * 0.0005);
    return noiseValue * Math.PI * 2;
}

/**
 * Flow Field Velocity
 * 
 * Returns velocity vector based on noise flow field.
 * 
 * @param x - X coordinate
 * @param y - Y coordinate  
 * @param time - Time offset for animation
 * @param scale - Noise scale
 * @param baseSpeed - Base velocity magnitude
 * @returns Velocity vector { vx, vy }
 */
export function flowFieldVelocity(
    x: number,
    y: number,
    time: number,
    scale: number = 0.003,
    baseSpeed: number = 0.8
): { vx: number; vy: number } {
    const angle = flowFieldAngle(x, y, time, scale);

    // Vary magnitude with secondary noise
    const magnitudeNoise = noise2D(x * scale * 0.5, y * scale * 0.5 + 100);
    const magnitude = baseSpeed * (1 + magnitudeNoise * 0.5);

    return {
        vx: Math.cos(angle) * magnitude,
        vy: Math.sin(angle) * magnitude,
    };
}

/**
 * Re-initialize noise with a new seed
 */
export function reseed(seed: number): void {
    initNoise(seed);
}

export default {
    noise2D,
    octaveNoise2D,
    flowFieldAngle,
    flowFieldVelocity,
    reseed,
};
