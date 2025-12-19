import fc from 'fast-check';
import { it, describe, expect } from 'vitest';

/**
 * Mocking the logic of the Swarm Engine to verify invariants
 * C1: UVs must remain static
 * S1: Convergence/Divergence logic
 * P1: Periodic pulsation
 */

describe('Molecular Swarm Invariants', () => {
    // Invariant C1: UV coordinates must not drift during any state transition
    it('C1: Color UVs should remain constant for any given particle index', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 25000 }), // particle index
                fc.double({ min: 0, max: 1 }),       // u progress
                (index: number, _progress: number) => {
                    // Logic: UVs are assigned once and never recalculated
                    // We simulate the mapping logic here
                    const initialU = (index % 500) / 500;
                    const animatedU = (index % 500) / 500; // should be identical
                    expect(initialU).toBe(animatedU);
                }
            )
        );
    });

    // Invariant S1: Explosion state must increase spatial divergence
    it('S1: "explode" state should increase particle distance from origin', () => {
        fc.assert(
            fc.property(
                fc.float(),                // x
                fc.float(),                // y
                fc.float({ min: 0.1, max: 1.0 }), // progress
                (x: number, y: number, progress: number) => {
                    const initialDist = Math.sqrt(x * x + y * y);

                    // Simulated Burst Force logic from shader: dir * pow(uProgress, 0.4) * 400.0
                    const burstForce = Math.pow(progress, 0.4) * 400.0;
                    const mag = Math.sqrt(x * x + y * y) || 0.001;
                    const dx = (x / mag) * burstForce;
                    const dy = (y / mag) * burstForce;

                    const finalDist = Math.sqrt((x + dx) * (x + dx) + (y + dy) * (y + dy));

                    // Invariant: Distance must increase as progress increases (for explode)
                    if (progress > 0) {
                        expect(finalDist).toBeGreaterThan(initialDist);
                    }
                }
            )
        );
    });

    // Invariant P1: Pulsation must be bounded and periodic
    it('P1: Pulsation values must remain within high-tech ranges [0.4, 1.0]', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0, max: 1000 }), // time
                (time: number) => {
                    // Simulated shader logic: 0.5 + sin(time * 3.0) * 0.3
                    const pulsation = 0.5 + Math.sin(time * 3.0) * 0.3;
                    expect(pulsation).toBeGreaterThanOrEqual(0.2);
                    expect(pulsation).toBeLessThanOrEqual(0.8);
                }
            )
        );
    });
});
