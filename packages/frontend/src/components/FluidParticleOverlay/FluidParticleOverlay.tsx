import React, { useRef, useEffect, useMemo, useCallback, memo } from 'react';
import * as THREE from 'three';
import { flowFieldVelocity } from '../../utils/perlinNoise';
import './FluidParticleOverlay.css';

export type VoiceState = 'idle' | 'listening' | 'processing';

export interface FluidParticleOverlayProps {
    /** Width of the overlay canvas */
    width: number;
    /** Height of the overlay canvas */
    height: number;
    /** Current voice interaction state */
    voiceState?: VoiceState;
    /** Audio level for reactivity (0-1) */
    audioLevel?: number;
    /** Cursor position relative to container */
    cursorPosition?: { x: number; y: number } | null;
    /** Total particle count (distributed across layers) */
    particleCount?: number;
    /** Whether to show in reduced motion mode */
    reducedMotion?: boolean;
    /** Layer mode: 'all' | 'foreground' | 'background' */
    layerMode?: 'all' | 'foreground' | 'background';
}

// Physics constants
const MAX_SPEED = 12;
const ATTRACTION_RADIUS = 120;
const ATTRACTION_STRENGTH = 8.0;
const DAMPING = 0.92;
const RETURN_RATE = 0.03;
const CANVAS_BUFFER = 50;

// Layer configurations
interface LayerConfig {
    count: number;
    size: { min: number; max: number };
    opacity: { min: number; max: number };
    speedMultiplier: number;
    colorPrimary: THREE.Color;
    colorSecondary: THREE.Color;
    blur: number;
    zIndex: number;
}

const LAYER_CONFIGS: Record<string, LayerConfig> = {
    background: {
        count: 0.3,  // 30% of particles
        size: { min: 2, max: 3.5 },     // 50% smaller
        opacity: { min: 0.26, max: 0.41 },  // 25% less bright
        speedMultiplier: 0.7,
        colorPrimary: new THREE.Color(0x2a2a5e),
        colorSecondary: new THREE.Color(0x3d3d8a),
        blur: 0,
        zIndex: 2,
    },
    mid: {
        count: 0.5,  // 50% of particles
        size: { min: 2.5, max: 4.5 },   // 50% smaller
        opacity: { min: 0.45, max: 0.68 },  // 25% less bright
        speedMultiplier: 1.0,
        colorPrimary: new THREE.Color(0x00e5ff),
        colorSecondary: new THREE.Color(0x8000ff),
        blur: 0,
        zIndex: 7,
    },
    foreground: {
        count: 0.2,  // 20% of particles  
        size: { min: 3.5, max: 7 },     // 50% smaller
        opacity: { min: 0.6, max: 0.75 },  // 25% less bright
        speedMultiplier: 1.2,
        colorPrimary: new THREE.Color(0x00ffcc),
        colorSecondary: new THREE.Color(0xff00ff),
        blur: 1,
        zIndex: 10,
    },
};

// State-specific modifications
const STATE_MODS = {
    idle: {
        flowSpeed: 1.0,
        attractionMult: 1.0,
        colorShift: 0,
    },
    listening: {
        flowSpeed: 2.0,
        attractionMult: 1.5,
        colorShift: 0.3,  // Shift toward cyan
    },
    processing: {
        flowSpeed: 1.5,
        attractionMult: 0.5,
        colorShift: -0.3,  // Shift toward purple
    },
};

// Vertex shader for rounded particles
const vertexShader = `
    attribute float size;
    attribute float opacity;
    attribute vec3 color;
    
    varying float vOpacity;
    varying vec3 vColor;
    
    void main() {
        vOpacity = opacity;
        vColor = color;
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

// Fragment shader for CRISP glowing circles - HD quality
const fragmentShader = `
    varying float vOpacity;
    varying vec3 vColor;
    
    void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        
        // SHARP circle with minimal blur for crisp edges
        float alpha = 1.0 - smoothstep(0.35, 0.45, dist);
        float core = 1.0 - smoothstep(0.0, 0.4, dist);
        
        vec3 finalColor = vColor * (core * 1.2 + 0.15);
        
        gl_FragColor = vec4(finalColor, alpha * vOpacity);
        
        if (alpha < 0.02) discard;
    }
`;

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    baseOpacity: number;
    opacity: number;
    layer: 'background' | 'mid' | 'foreground';
    colorT: number;  // 0-1 for color interpolation
}

/**
 * FluidParticleOverlay - Multi-layer particle system with fluid dynamics
 * 
 * Features:
 * - Perlin noise flow field for organic movement
 * - Cursor attraction physics
 * - Three layers creating depth illusion
 * - State-reactive behavior
 */
export const FluidParticleOverlay: React.FC<FluidParticleOverlayProps> = memo(({
    width,
    height,
    voiceState = 'idle',
    audioLevel = 0,
    cursorPosition = null,
    particleCount = 400,
    reducedMotion = false,
    layerMode = 'all',
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const particlesRef = useRef<THREE.Points | null>(null);
    const animationFrameRef = useRef<number>(0);
    const timeRef = useRef<number>(0);
    const particleDataRef = useRef<Particle[]>([]);

    // Refs for reactive values
    const voiceStateRef = useRef(voiceState);
    const audioLevelRef = useRef(audioLevel);
    const cursorRef = useRef(cursorPosition);

    // Clamp and memoize particle count
    const clampedCount = useMemo(() =>
        reducedMotion ? 50 : Math.max(50, Math.min(500, particleCount)),
        [particleCount, reducedMotion]
    );

    // Initialize particles
    const initParticles = useCallback((): Particle[] => {
        const particles: Particle[] = [];
        const layerNames = layerMode === 'all'
            ? ['background', 'mid', 'foreground'] as const
            : [layerMode] as const;

        layerNames.forEach(layerName => {
            const config = LAYER_CONFIGS[layerName];
            const count = Math.floor(clampedCount * (layerMode === 'all' ? config.count : 1));

            for (let i = 0; i < count; i++) {
                const size = config.size.min + Math.random() * (config.size.max - config.size.min);
                const opacity = config.opacity.min + Math.random() * (config.opacity.max - config.opacity.min);

                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: 0,
                    vy: 0,
                    size,
                    baseOpacity: opacity,
                    opacity,
                    layer: layerName as 'background' | 'mid' | 'foreground',
                    colorT: Math.random(),
                });
            }
        });

        return particles;
    }, [width, height, clampedCount, layerMode]);

    // Initialize Three.js scene
    const initScene = useCallback(() => {
        if (!canvasRef.current) return;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Orthographic camera for 2D
        const camera = new THREE.OrthographicCamera(
            0, width, 0, height, 0.1, 1000
        );
        camera.position.z = 100;
        cameraRef.current = camera;

        try {
            // PRE-FLIGHT CHECK: Explicitly check for context availability before Three.js tries to initialize.
            // Three.js crashes (TypeError on 'precision') if it gets a null context during its internal capabilities check.
            const gl = canvasRef.current.getContext('webgl', {
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance'
            });

            if (!gl) {
                console.warn('[FluidParticleOverlay] WebGL Context unavailable (Exhausted?). Aborting renderer creation.');
                rendererRef.current = null;
                return;
            }

            // If we have a context, we can safely allow Three.js to initialize
            const renderer = new THREE.WebGLRenderer({
                canvas: canvasRef.current,
                context: gl, // Pass the existing context we just verified
                alpha: true,
                antialias: true,
            });

            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.max(window.devicePixelRatio, 3));  // 3x for crisp particles
            rendererRef.current = renderer;
        } catch (error) {
            console.error('[FluidParticleOverlay] WebGL initialization failed (Exception):', error);
            rendererRef.current = null;
            return; // Exit early if renderer creation fails
        }

        // Initialize particle data with integer count
        const validatedParticleCount = Math.floor(particleCount || 0);
        particleDataRef.current = initParticles(validatedParticleCount);
        const particles = particleDataRef.current;
        const count = particles.length;

        // Create geometry
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const opacities = new Float32Array(count);
        const colors = new Float32Array(count * 3);

        particles.forEach((p, i) => {
            positions[i * 3] = p.x;
            positions[i * 3 + 1] = p.y;
            positions[i * 3 + 2] = 0;
            sizes[i] = p.size;
            opacities[i] = p.opacity;

            const config = LAYER_CONFIGS[p.layer];
            const color = new THREE.Color().lerpColors(config.colorPrimary, config.colorSecondary, p.colorT);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        });

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.ShaderMaterial({
            uniforms: {},
            vertexShader,
            fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            depthWrite: false,
        });

        const points = new THREE.Points(geometry, material);
        particlesRef.current = points;
        scene.add(points);

    }, [width, height, initParticles]);

    // Clamp velocity magnitude
    const clampVelocity = (vx: number, vy: number): { vx: number; vy: number } => {
        const mag = Math.sqrt(vx * vx + vy * vy);
        if (mag > MAX_SPEED) {
            const scale = MAX_SPEED / mag;
            return { vx: vx * scale, vy: vy * scale };
        }
        return { vx, vy };
    };

    // Wrap position for seamless edges
    const wrapPosition = (pos: number, size: number): number => {
        const min = -CANVAS_BUFFER;
        const max = size + CANVAS_BUFFER;
        const range = max - min;

        if (pos < min) return max - ((min - pos) % range);
        if (pos > max) return min + ((pos - max) % range);
        return pos;
    };

    // Calculate edge fade opacity
    const edgeFade = (x: number, y: number, w: number, h: number): number => {
        const fadeZone = 50;
        let fade = 1;

        if (x < fadeZone) fade = Math.min(fade, x / fadeZone);
        if (x > w - fadeZone) fade = Math.min(fade, (w - x) / fadeZone);
        if (y < fadeZone) fade = Math.min(fade, y / fadeZone);
        if (y > h - fadeZone) fade = Math.min(fade, (h - y) / fadeZone);

        return Math.max(0, Math.min(1, fade));
    };

    // Animation loop
    const animate = useCallback(() => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !particlesRef.current) return;
        if (reducedMotion) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
            return;
        }

        const particles = particleDataRef.current;
        const points = particlesRef.current;
        const positions = points.geometry.attributes.position.array as Float32Array;
        const opacities = points.geometry.attributes.opacity.array as Float32Array;
        const colors = points.geometry.attributes.color.array as Float32Array;
        const sizes = points.geometry.attributes.size.array as Float32Array;

        timeRef.current += 16;  // ~60fps
        const time = timeRef.current;
        const state = voiceStateRef.current;
        const audio = audioLevelRef.current;
        const cursor = cursorRef.current;
        const stateMod = STATE_MODS[state];

        particles.forEach((p, i) => {
            const config = LAYER_CONFIGS[p.layer];

            // Flow field velocity
            const flow = flowFieldVelocity(
                p.x, p.y, time,
                0.003,
                0.8 * config.speedMultiplier * stateMod.flowSpeed * (1 + audio * 0.5)
            );

            // Cursor attraction
            let attractX = 0;
            let attractY = 0;
            if (cursor) {
                const dx = cursor.x - p.x;
                const dy = cursor.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < ATTRACTION_RADIUS * stateMod.attractionMult) {
                    const force = ATTRACTION_STRENGTH * Math.pow(1 - dist / (ATTRACTION_RADIUS * stateMod.attractionMult), 2);
                    const dirX = dx / Math.max(dist, 1);
                    const dirY = dy / Math.max(dist, 1);
                    attractX = dirX * force;
                    attractY = dirY * force;
                }
            }

            // Apply forces
            p.vx += attractX;
            p.vy += attractY;

            // Return to flow field
            p.vx = p.vx * (1 - RETURN_RATE) + flow.vx * RETURN_RATE;
            p.vy = p.vy * (1 - RETURN_RATE) + flow.vy * RETURN_RATE;

            // Damping
            p.vx *= DAMPING;
            p.vy *= DAMPING;

            // Clamp velocity
            const clamped = clampVelocity(p.vx, p.vy);
            p.vx = clamped.vx;
            p.vy = clamped.vy;

            // Update position
            p.x += p.vx;
            p.y += p.vy;

            // Wrap at edges
            p.x = wrapPosition(p.x, width);
            p.y = wrapPosition(p.y, height);

            // Update opacity with edge fade and audio reactivity
            const fade = edgeFade(p.x, p.y, width, height);
            p.opacity = p.baseOpacity * fade * (1 + audio * 0.08); // Further reduced from 0.15

            // Update color animation
            p.colorT = (p.colorT + 0.001 + audio * 0.01) % 1;
            const color = new THREE.Color().lerpColors(
                config.colorPrimary,
                config.colorSecondary,
                p.colorT + stateMod.colorShift
            );

            // Update geometry buffers
            positions[i * 3] = p.x;
            positions[i * 3 + 1] = p.y;
            opacities[i] = Math.max(0, Math.min(1, p.opacity));
            sizes[i] = p.size * (1 + audio * 0.1); // Further reduced from 0.2
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        });

        points.geometry.attributes.position.needsUpdate = true;
        points.geometry.attributes.opacity.needsUpdate = true;
        points.geometry.attributes.size.needsUpdate = true;
        points.geometry.attributes.color.needsUpdate = true;

        rendererRef.current.render(sceneRef.current, cameraRef.current);
        animationFrameRef.current = requestAnimationFrame(animate);
    }, [width, height, reducedMotion]);

    // Update refs when props change
    useEffect(() => { voiceStateRef.current = voiceState; }, [voiceState]);
    useEffect(() => { audioLevelRef.current = Math.max(0, Math.min(1, audioLevel)); }, [audioLevel]);
    useEffect(() => { cursorRef.current = cursorPosition; }, [cursorPosition]);

    // Initialize and start animation
    useEffect(() => {
        initScene();
        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameRef.current);
            if (rendererRef.current) {
                const renderer = rendererRef.current;
                renderer.dispose();
                // Explicitly lose context to free up hardware resources
                const extension = renderer.getContext().getExtension('WEBGL_lose_context');
                if (extension) extension.loseContext();
            }
        };
    }, [initScene, animate]);

    // Handle resize
    useEffect(() => {
        if (rendererRef.current && cameraRef.current) {
            rendererRef.current.setSize(width, height);
            cameraRef.current.right = width;
            cameraRef.current.top = height;
            cameraRef.current.updateProjectionMatrix();
        }
    }, [width, height]);

    return (
        <canvas
            ref={canvasRef}
            className="fluid-particle-overlay"
            style={{
                width,
                height,
                display: rendererRef.current ? 'block' : 'none'
            }}
            aria-hidden="true"
        />
    );
});

FluidParticleOverlay.displayName = 'FluidParticleOverlay';

export default FluidParticleOverlay;
