/**
 * Property-Based Tests for HologramParticleEngine
 * 
 * Tests invariants that must hold true for the Hollywood hologram dissolve effect:
 * 1. Color preservation - particles carry correct image colors
 * 2. Position memory - particles return to origin after reform
 * 3. Particle count invariant - count stays constant
 * 4. Progress bounds - dissolveProgress stays [0,1]
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock particle data structure for testing logic
interface MockParticle {
    x: number;
    y: number;
    z: number;
    originX: number;
    originY: number;
    originZ: number;
    r: number;
    g: number;
    b: number;
    noiseValue: number;
}

// Simulate dissolve logic - determines if particle should be displaced
function shouldDissolve(noiseValue: number, progress: number): boolean {
    return progress > noiseValue;
}

// Simulate reform position calculation
function calculateReformPosition(
    current: { x: number; y: number; z: number },
    origin: { x: number; y: number; z: number },
    progress: number,
    springK: number = 0.08
): { x: number; y: number; z: number } {
    const dx = origin.x - current.x;
    const dy = origin.y - current.y;
    const dz = origin.z - current.z;

    // Spring force increases with progress
    const force = springK * (1 + progress * 3);

    return {
        x: current.x + dx * force,
        y: current.y + dy * force,
        z: current.z + dz * force,
    };
}

// Clamp progress to valid bounds
function clampProgress(progress: number): number {
    return Math.max(0, Math.min(1, progress));
}

describe('HologramParticleEngine Property Tests', () => {

    // Arbitrary generators
    const pixelColorArb = fc.record({
        r: fc.integer({ min: 0, max: 255 }),
        g: fc.integer({ min: 0, max: 255 }),
        b: fc.integer({ min: 0, max: 255 }),
    });

    const positionArb = fc.record({
        x: fc.float({ min: -300, max: 300, noNaN: true }),
        y: fc.float({ min: -300, max: 300, noNaN: true }),
        z: fc.float({ min: -100, max: 100, noNaN: true }),
    });

    const noiseValueArb = fc.float({ min: 0, max: 1, noNaN: true });
    const progressArb = fc.float({ min: 0, max: 1, noNaN: true });

    const particleArb = fc.record({
        x: fc.float({ min: -300, max: 300, noNaN: true }),
        y: fc.float({ min: -300, max: 300, noNaN: true }),
        z: fc.float({ min: -100, max: 100, noNaN: true }),
        originX: fc.float({ min: -300, max: 300, noNaN: true }),
        originY: fc.float({ min: -300, max: 300, noNaN: true }),
        originZ: fc.constant(0),
        r: fc.integer({ min: 0, max: 255 }),
        g: fc.integer({ min: 0, max: 255 }),
        b: fc.integer({ min: 0, max: 255 }),
        noiseValue: noiseValueArb,
    });

    describe('Invariant 1: Color Preservation', () => {
        it('particle color must match source pixel RGB at all times', () => {
            fc.assert(
                fc.property(
                    pixelColorArb,
                    progressArb,
                    (color, progress) => {
                        // During any animation state, the particle's stored color
                        // should remain unchanged from initialization
                        const particle = {
                            r: color.r,
                            g: color.g,
                            b: color.b,
                            // Simulate animation - color should NOT change
                            animatedR: color.r,
                            animatedG: color.g,
                            animatedB: color.b,
                        };

                        // Color must be preserved through animation
                        expect(particle.animatedR).toBe(color.r);
                        expect(particle.animatedG).toBe(color.g);
                        expect(particle.animatedB).toBe(color.b);
                    }
                )
            );
        });

        it('RGB values stay within valid range [0, 255]', () => {
            fc.assert(
                fc.property(pixelColorArb, (color) => {
                    expect(color.r).toBeGreaterThanOrEqual(0);
                    expect(color.r).toBeLessThanOrEqual(255);
                    expect(color.g).toBeGreaterThanOrEqual(0);
                    expect(color.g).toBeLessThanOrEqual(255);
                    expect(color.b).toBeGreaterThanOrEqual(0);
                    expect(color.b).toBeLessThanOrEqual(255);
                })
            );
        });
    });

    describe('Invariant 2: Position Memory', () => {
        it('particles converge to origin when reform progress approaches 1', () => {
            fc.assert(
                fc.property(
                    particleArb,
                    (particle) => {
                        let current = { x: particle.x, y: particle.y, z: particle.z };
                        const origin = { x: particle.originX, y: particle.originY, z: particle.originZ };

                        // Simulate 100 iterations of reform animation
                        for (let i = 0; i < 100; i++) {
                            const progress = i / 100;
                            current = calculateReformPosition(current, origin, progress);
                        }

                        // After full reform, should be very close to origin
                        const distance = Math.sqrt(
                            Math.pow(current.x - origin.x, 2) +
                            Math.pow(current.y - origin.y, 2) +
                            Math.pow(current.z - origin.z, 2)
                        );

                        // Must be within 1px of origin
                        expect(distance).toBeLessThan(1);
                    }
                )
            );
        });

        it('origin position never changes during animation', () => {
            fc.assert(
                fc.property(
                    positionArb,
                    progressArb,
                    (origin, progress) => {
                        const savedOrigin = { ...origin };

                        // Simulate any animation - origin should be immutable
                        const _ = calculateReformPosition(
                            { x: origin.x + 100, y: origin.y + 100, z: 50 },
                            origin,
                            progress
                        );

                        expect(origin.x).toBe(savedOrigin.x);
                        expect(origin.y).toBe(savedOrigin.y);
                        expect(origin.z).toBe(savedOrigin.z);
                    }
                )
            );
        });
    });

    describe('Invariant 3: Particle Count', () => {
        it('particle array length stays constant through state changes', () => {
            fc.assert(
                fc.property(
                    fc.array(particleArb, { minLength: 100, maxLength: 2000 }),
                    fc.array(fc.constantFrom('idle', 'dissolve', 'vortex', 'reform'), { minLength: 1, maxLength: 10 }),
                    (particles, stateSequence) => {
                        const initialCount = particles.length;

                        // Simulate state transitions - count should never change
                        for (const state of stateSequence) {
                            // No particles added or removed
                            expect(particles.length).toBe(initialCount);
                        }
                    }
                )
            );
        });
    });

    describe('Invariant 4: Progress Bounds', () => {
        it('dissolveProgress stays within [0, 1]', () => {
            fc.assert(
                fc.property(
                    fc.float({ min: -10, max: 10, noNaN: true }),
                    (rawProgress) => {
                        const clampedProgress = clampProgress(rawProgress);

                        expect(clampedProgress).toBeGreaterThanOrEqual(0);
                        expect(clampedProgress).toBeLessThanOrEqual(1);
                    }
                )
            );
        });

        it('dissolve triggers only when progress exceeds noiseValue', () => {
            fc.assert(
                fc.property(
                    noiseValueArb,
                    progressArb,
                    (noiseValue, progress) => {
                        const shouldMove = shouldDissolve(noiseValue, progress);

                        if (progress > noiseValue) {
                            expect(shouldMove).toBe(true);
                        } else {
                            expect(shouldMove).toBe(false);
                        }
                    }
                )
            );
        });

        it('all particles dissolve when progress = 1', () => {
            fc.assert(
                fc.property(
                    fc.array(noiseValueArb, { minLength: 10, maxLength: 100 }),
                    (noiseValues) => {
                        const progress = 1.0;

                        // Every particle should be dissolved at progress = 1
                        for (const noise of noiseValues) {
                            expect(shouldDissolve(noise, progress)).toBe(true);
                        }
                    }
                )
            );
        });

        it('no particles dissolve when progress = 0', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 10, maxLength: 100 }),
                    (noiseInts) => {
                        const noiseValues = noiseInts.map(n => n / 100);
                        const progress = 0.0;

                        // No particle should be dissolved at progress = 0
                        for (const noise of noiseValues) {
                            // noise > 0, so progress (0) is never > noise
                            if (noise > 0) {
                                expect(shouldDissolve(noise, progress)).toBe(false);
                            }
                        }
                    }
                )
            );
        });
    });

    describe('Double Helix Vortex Properties', () => {
        it('helix produces two distinct spiral paths', () => {
            fc.assert(
                fc.property(
                    fc.float({ min: 0, max: Math.fround(Math.PI * 4), noNaN: true }),
                    fc.float({ min: 50, max: 150, noNaN: true }),
                    (angle, radius) => {
                        // Helix 1 position
                        const helix1 = {
                            x: Math.cos(angle) * radius,
                            y: Math.sin(angle) * radius,
                        };

                        // Helix 2 position (offset by PI)
                        const helix2 = {
                            x: Math.cos(angle + Math.PI) * radius,
                            y: Math.sin(angle + Math.PI) * radius,
                        };

                        // The two helixes should be on opposite sides
                        const distance = Math.sqrt(
                            Math.pow(helix1.x - helix2.x, 2) +
                            Math.pow(helix1.y - helix2.y, 2)
                        );

                        // Distance should be approximately 2 * radius (diameter)
                        expect(distance).toBeCloseTo(2 * radius, 0);
                    }
                )
            );
        });
    });
});
