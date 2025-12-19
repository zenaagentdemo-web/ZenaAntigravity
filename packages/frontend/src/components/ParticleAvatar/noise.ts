/**
 * Simple pseudo-random noise implementation (Perlin-like) for particle turbulence.
 * This avoids external dependencies while providing smooth, natural-feeling motion.
 */

export class SimplexNoise {
    private p: Uint8Array;

    constructor() {
        this.p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
            this.p[i] = i;
        }
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
        }
    }

    private fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    private lerp(t: number, a: number, b: number): number {
        return a + t * (b - a);
    }

    private grad(hash: number, x: number, y: number, z: number): number {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    noise2D(x: number, y: number): number {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);

        const u = this.fade(x);
        const v = this.fade(y);

        const p = this.p;
        const A = p[X] + Y, AA = p[A % 256], AB = p[(A + 1) % 256];
        const B = p[(X + 1) % 256] + Y, BA = p[B % 256], BB = p[(B + 1) % 256];

        return this.lerp(v, this.lerp(u, this.grad(p[AA % 256], x, y, 0),
            this.grad(p[BA % 256], x - 1, y, 0)),
            this.lerp(u, this.grad(p[AB % 256], x, y - 1, 0),
                this.grad(p[BB % 256], x - 1, y - 1, 0)));
    }
}
