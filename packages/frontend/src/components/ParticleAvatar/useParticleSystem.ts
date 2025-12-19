import { useState, useRef, useCallback, useEffect } from 'react';
import { SimplexNoise } from './noise';

export type ParticleState = 'idle' | 'explode' | 'swirl' | 'reform';

interface Particle {
    x: number;
    y: number;
    originX: number;
    originY: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    opacity: number;
    life: number; // For twinkle/aging
}

interface UseParticleSystemOptions {
    particleCount?: number;
    canvasWidth: number;
    canvasHeight: number;
}

interface UseParticleSystemReturn {
    particles: Particle[];
    state: ParticleState;
    initializeFromImage: (imageSrc: string) => Promise<void>;
    explode: () => void;
    swirl: (amplitude: number) => void;
    reform: () => void;
    reset: () => void;
    isInitialized: boolean;
}

const noise = new SimplexNoise();

/**
 * Enhanced Particle System with Noise-based fluid dynamics and spiral reform.
 */
export function useParticleSystem({
    particleCount = 500,
    canvasWidth,
    canvasHeight,
}: UseParticleSystemOptions): UseParticleSystemReturn {
    const [particles, setParticles] = useState<Particle[]>([]);
    const [state, setState] = useState<ParticleState>('idle');
    const [isInitialized, setIsInitialized] = useState(false);
    const animationRef = useRef<number | null>(null);
    const timeRef = useRef(0);

    // Initialize particles by sampling from an image with better variety
    const initializeFromImage = useCallback(async (imageSrc: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const tempCanvas = document.createElement('canvas');
                const ctx = tempCanvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }

                tempCanvas.width = canvasWidth;
                tempCanvas.height = canvasHeight;
                ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

                const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
                const data = imageData.data;

                const newParticles: Particle[] = [];
                const step = Math.floor((canvasWidth * canvasHeight) / (particleCount * 2)); // Dynamic step

                for (let i = 0; i < data.length; i += 4 * step) {
                    if (newParticles.length >= particleCount) break;

                    const a = data[i + 3];
                    if (a < 128) continue; // Higher threshold for cleaner silhouette

                    const pixelIndex = i / 4;
                    const x = pixelIndex % canvasWidth;
                    const y = Math.floor(pixelIndex / canvasWidth);

                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    newParticles.push({
                        x,
                        y,
                        originX: x,
                        originY: y,
                        vx: (Math.random() - 0.5) * 0.5,
                        vy: (Math.random() - 0.5) * 0.5,
                        color: `rgba(${r}, ${g}, ${b}, ${a / 255})`,
                        size: 1 + Math.random() * 2,
                        opacity: Math.random(),
                        life: Math.random() * 100,
                    });
                }

                setParticles(newParticles);
                setIsInitialized(true);
                resolve();
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageSrc;
        });
    }, [canvasWidth, canvasHeight, particleCount]);

    // High-tech explosion
    const explode = useCallback(() => {
        setState('explode');
        setParticles(prev => prev.map(p => {
            const dx = p.x - canvasWidth / 2;
            const dy = p.y - canvasHeight / 2;
            const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.5;
            const force = 8 + Math.random() * 12;
            return {
                ...p,
                vx: Math.cos(angle) * force,
                vy: Math.sin(angle) * force,
            };
        }));
    }, [canvasWidth, canvasHeight]);

    // Natural fluid-like swirl using noise field
    const swirl = useCallback((amplitude: number) => {
        setState('swirl');
        // Actual physics update happens in the render loop
    }, []);

    // Physics-based Re-materialization
    const reform = useCallback(() => {
        setState('reform');
    }, []);

    const reset = useCallback(() => {
        setState('idle');
        setParticles(prev => prev.map(p => ({
            ...p,
            x: p.originX,
            y: p.originY,
            vx: 0,
            vy: 0,
        })));
    }, []);

    // Global Physics Update
    useEffect(() => {
        if (!isInitialized) return;

        const animate = () => {
            timeRef.current += 0.01;
            const t = timeRef.current;

            setParticles(prev => prev.map(p => {
                let { x, y, vx, vy, originX, originY, life } = p;

                if (state === 'explode' || state === 'swirl') {
                    // 1. DUST PHYSICS (Noise Field)
                    const noiseScale = 0.005;
                    const noiseInfluence = state === 'swirl' ? 0.4 : 0.1;
                    const angle = noise.noise2D(x * noiseScale, y * noiseScale + t) * Math.PI * 4;

                    vx += Math.cos(angle) * noiseInfluence;
                    vy += Math.sin(angle) * noiseInfluence;

                    // 2. VORTEX BIAS (Circular drift)
                    if (state === 'swirl') {
                        const dx = x - canvasWidth / 2;
                        const dy = y - canvasHeight / 2;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const vortexForce = (1 / (dist + 50)) * 5;
                        vx += -dy * vortexForce;
                        vy += dx * vortexForce;
                    }

                    // 3. APPLY VELOCITY & DRAG
                    x += vx;
                    y += vy;
                    vx *= 0.96; // Drag
                    vy *= 0.96;

                    // Boundary constraints with gentle bounce
                    if (x < 0 || x > canvasWidth) vx *= -0.5;
                    if (y < 0 || y > canvasHeight) vy *= -0.5;

                } else if (state === 'reform') {
                    // 4. SPIRAL REBUILD PHYSICS
                    const dx = originX - x;
                    const dy = originY - y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // Convergence speed
                    const speed = 0.05 + (dist / 1000);

                    // Spiral effect: apply perpendicular force that decays
                    const spiralEffect = Math.min(dist / 50, 2);
                    vx = (dx * speed) + (dy * 0.05 * spiralEffect);
                    vy = (dy * speed) - (dx * 0.05 * spiralEffect);

                    x += vx;
                    y += vy;

                    // Snap to origin when close
                    if (dist < 0.5) {
                        x = originX;
                        y = originY;
                        vx = 0;
                        vy = 0;
                    }
                }

                // Twinkle effect (life oscillation)
                life += 1;
                const opacity = 0.4 + Math.sin(life * 0.1) * 0.6;

                return { ...p, x, y, vx, vy, opacity, life };
            }));

            animationRef.current = requestAnimationFrame(animate);
        };

        if (state !== 'idle') {
            animationRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [state, isInitialized, canvasWidth, canvasHeight]);

    return {
        particles,
        state,
        initializeFromImage,
        explode,
        swirl,
        reform,
        reset,
        isInitialized,
    };
}
