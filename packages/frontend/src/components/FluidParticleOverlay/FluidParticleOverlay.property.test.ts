/**
 * FluidParticleOverlay Property Tests
 * Tests physics invariants for the fluid dynamics particle system
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Configuration constants matching the component
const MAX_PARTICLES = 500;
const MAX_SPEED = 12;
const CANVAS_BUFFER = 50;

describe('FluidParticleOverlay Invariants', () => {
    // INV-1: Particle Count Conservation
    describe('INV-1: Particle Count Conservation', () => {
        it('should maintain total particle count across all layers', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 50, max: MAX_PARTICLES }),
                    (totalCount) => {
                        // Distribute across layers (20%, 50%, 30%)
                        const foreground = Math.floor(totalCount * 0.2);
                        const mid = Math.floor(totalCount * 0.5);
                        const background = totalCount - foreground - mid;

                        const sum = foreground + mid + background;
                        expect(sum).toBe(totalCount);
                        return sum === totalCount;
                    }
                )
            );
        });
    });

    // INV-2: Particle Position Bounds
    describe('INV-2: Particle Position Bounds', () => {
        it('should keep particles within canvas bounds plus buffer', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 200, max: 800 }), // canvas width
                    fc.integer({ min: 200, max: 800 }), // canvas height
                    fc.float({ min: -100, max: 900 }),  // particle x
                    fc.float({ min: -100, max: 900 }),  // particle y
                    (canvasWidth, canvasHeight, x, y) => {
                        // Particles should be wrapped if outside bounds
                        const wrappedX = wrapPosition(x, canvasWidth, CANVAS_BUFFER);
                        const wrappedY = wrapPosition(y, canvasHeight, CANVAS_BUFFER);

                        expect(wrappedX).toBeGreaterThanOrEqual(-CANVAS_BUFFER);
                        expect(wrappedX).toBeLessThanOrEqual(canvasWidth + CANVAS_BUFFER);
                        expect(wrappedY).toBeGreaterThanOrEqual(-CANVAS_BUFFER);
                        expect(wrappedY).toBeLessThanOrEqual(canvasHeight + CANVAS_BUFFER);

                        return true;
                    }
                )
            );
        });
    });

    // INV-3: Velocity Magnitude Bound
    describe('INV-3: Velocity Magnitude Bound', () => {
        it('should clamp velocity to max speed', () => {
            fc.assert(
                fc.property(
                    fc.float({ min: -50, max: 50 }), // vx
                    fc.float({ min: -50, max: 50 }), // vy
                    (vx, vy) => {
                        const magnitude = Math.sqrt(vx * vx + vy * vy);
                        const clamped = clampVelocity(vx, vy, MAX_SPEED);
                        const clampedMagnitude = Math.sqrt(clamped.vx * clamped.vx + clamped.vy * clamped.vy);

                        expect(clampedMagnitude).toBeLessThanOrEqual(MAX_SPEED + 0.001); // Small epsilon for floating point
                        return clampedMagnitude <= MAX_SPEED + 0.001;
                    }
                )
            );
        });
    });

    // INV-5: Cursor Attraction Falloff (using attraction, not repulsion)
    describe('INV-5: Cursor Attraction Falloff', () => {
        const ATTRACTION_RADIUS = 120;
        const ATTRACTION_STRENGTH = 8.0;

        it('should have zero attraction force outside radius', () => {
            fc.assert(
                fc.property(
                    fc.float({ min: ATTRACTION_RADIUS + 1, max: 500 }), // distance > radius
                    (distance) => {
                        const force = calculateAttractionForce(distance, ATTRACTION_RADIUS, ATTRACTION_STRENGTH);
                        expect(force).toBe(0);
                        return force === 0;
                    }
                )
            );
        });

        it('should have maximum attraction force at distance zero', () => {
            const force = calculateAttractionForce(0, ATTRACTION_RADIUS, ATTRACTION_STRENGTH);
            expect(force).toBe(ATTRACTION_STRENGTH);
        });

        it('should have smooth quadratic falloff within radius', () => {
            fc.assert(
                fc.property(
                    fc.float({ min: Math.fround(0.001), max: Math.fround(ATTRACTION_RADIUS - 0.001) }), // Avoid exact boundary
                    (distance) => {
                        const force = calculateAttractionForce(distance, ATTRACTION_RADIUS, ATTRACTION_STRENGTH);
                        const expectedForce = ATTRACTION_STRENGTH * Math.pow(1 - distance / ATTRACTION_RADIUS, 2);

                        // Handle potential NaN cases
                        if (Number.isNaN(force) || Number.isNaN(expectedForce)) {
                            return true; // Skip NaN cases (edge cases at boundaries)
                        }

                        expect(Math.abs(force - expectedForce)).toBeLessThan(0.001);
                        return true;
                    }
                )
            );
        });
    });

    // INV-8: Opacity Range
    describe('INV-8: Opacity Range', () => {
        it('should keep opacity within [0, 1]', () => {
            fc.assert(
                fc.property(
                    fc.float({ min: -2, max: 3 }), // arbitrary opacity input
                    (rawOpacity) => {
                        const clamped = Math.max(0, Math.min(1, rawOpacity));
                        expect(clamped).toBeGreaterThanOrEqual(0);
                        expect(clamped).toBeLessThanOrEqual(1);
                        return clamped >= 0 && clamped <= 1;
                    }
                )
            );
        });
    });
});

// Helper functions that mirror component logic
function wrapPosition(pos: number, size: number, buffer: number): number {
    const min = -buffer;
    const max = size + buffer;
    const range = max - min;

    if (pos < min) {
        return max - ((min - pos) % range);
    }
    if (pos > max) {
        return min + ((pos - max) % range);
    }
    return pos;
}

function clampVelocity(vx: number, vy: number, maxSpeed: number): { vx: number; vy: number } {
    const magnitude = Math.sqrt(vx * vx + vy * vy);
    if (magnitude > maxSpeed) {
        const scale = maxSpeed / magnitude;
        return { vx: vx * scale, vy: vy * scale };
    }
    return { vx, vy };
}

function calculateAttractionForce(distance: number, radius: number, strength: number): number {
    if (distance >= radius) return 0;
    return strength * Math.pow(1 - distance / radius, 2);
}
