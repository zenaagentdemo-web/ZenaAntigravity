import React, { useRef, useEffect, useMemo, useCallback, useState, memo } from 'react';
import * as THREE from 'three';
import { FluidParticleOverlay } from '../FluidParticleOverlay/FluidParticleOverlay';
import { DissolveParticleSystem, DissolvePhase } from '../DissolveParticleSystem/DissolveParticleSystem';
import './ZenaHighTechAvatar.css';

export type VoiceState = 'idle' | 'listening' | 'processing';

export interface ZenaHighTechAvatarProps {
    /** Path to the avatar image */
    imageSrc?: string;
    /** Size of the avatar in pixels */
    size?: number;
    /** Current voice interaction state */
    voiceState?: VoiceState;
    /** Current dissolve phase for hologram effect */
    dissolvePhase?: DissolvePhase;
    /** Audio level for particle reactivity (0-1) */
    audioLevel?: number;
    /** Maximum number of particles for orbit system */
    particleCount?: number;
    /** Number of fluid overlay particles */
    fluidParticleCount?: number;
    /** Additional CSS class */
    className?: string;
    /** Click handler */
    onClick?: () => void;
    /** Callback when dissolve phase animation completes */
    onDissolvePhaseComplete?: (phase: DissolvePhase) => void;
}

// Particle behavior by voice state
const STATE_CONFIG = {
    idle: {
        noiseAmplitude: 0.35,
        colorPrimary: new THREE.Color(0x00e5ff),
        colorSecondary: new THREE.Color(0xff00ff),
        rotationSpeed: 0.001,
        particleSize: 1.75,     // Reduced 50% from 3.5
        opacity: 0.56,          // Reduced 25% from 0.75
        orbitRadius: 145,
    },
    listening: {
        noiseAmplitude: 0.6,
        colorPrimary: new THREE.Color(0x00ffcc),
        colorSecondary: new THREE.Color(0x00e5ff),
        rotationSpeed: 0.002,
        particleSize: 2.5,
        opacity: 0.7,
        orbitRadius: 160,
    },
    processing: {
        noiseAmplitude: 0.2,
        colorPrimary: new THREE.Color(0x8000ff),
        colorSecondary: new THREE.Color(0x4b0082),
        rotationSpeed: 0.004,
        particleSize: 2.0,
        opacity: 0.6,
        orbitRadius: 150,
    },
};

// Simple noise function for organic movement
const noise3D = (x: number, y: number, z: number, time: number): number => {
    return Math.sin(x * 2 + time) * Math.cos(y * 2 + time * 0.7) * Math.sin(z * 2 + time * 1.3);
};

// Vertex shader for circle particles
const vertexShader = `
    attribute vec3 color;
    varying vec3 vColor;
    uniform float uSize;
    uniform float uOpacity;
    varying float vOpacity;
    
    void main() {
        vColor = color;
        vOpacity = uOpacity;
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

// Fragment shader for glowing circles
const fragmentShader = `
    varying vec3 vColor;
    varying float vOpacity;
    
    void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        
        float alpha = 1.0 - smoothstep(0.35, 0.5, dist);
        float glow = 1.0 - smoothstep(0.0, 0.5, dist);
        vec3 glowColor = vColor + vec3(0.15, 0.2, 0.25) * glow;
        
        gl_FragColor = vec4(glowColor, alpha * vOpacity);
        
        if (alpha < 0.01) discard;
    }
`;

// Glitch interval in ms
const GLITCH_INTERVAL = 5000;
const GLITCH_DURATION = 200;

/**
 * ZenaHighTechAvatar - Living, breathing holographic avatar
 * 
 * Features:
 * - Organic head sway, breathing zoom, and rotation
 * - WebGL particle system orbiting around and through avatar
 * - Fluid dynamics particle overlay with cursor attraction
 * - Holographic glitch effects every 5 seconds
 * - Audio-reactive animations
 */
export const ZenaHighTechAvatar: React.FC<ZenaHighTechAvatarProps> = memo(({
    imageSrc = '/assets/zena-avatar.jpg',
    size = 280,
    voiceState = 'idle',
    dissolvePhase = 'idle',
    audioLevel = 0,
    particleCount = 450,           // Increased from 300
    fluidParticleCount = 900,      // Increased from 600
    className = '',
    onClick,
    onDissolvePhaseComplete,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const particlesRef = useRef<THREE.Points | null>(null);
    const animationFrameRef = useRef<number>(0);
    const timeRef = useRef<number>(0);
    const currentStateRef = useRef<VoiceState>(voiceState);
    const audioLevelRef = useRef<number>(audioLevel);

    // Cursor position state for fluid particles
    const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

    // Glitch effect state
    const [isGlitching, setIsGlitching] = useState(false);
    const glitchIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Overlay size (larger than avatar to show particles around it)
    const overlaySize = size * 1.6;

    // Clamp particle count
    const clampedParticleCount = useMemo(() =>
        Math.floor(Math.max(0, Math.min(500, particleCount))),
        [particleCount]
    );

    // Generate initial particle positions
    const initialPositions = useMemo(() => {
        const positions = new Float32Array(clampedParticleCount * 3);
        const radius = 140;

        for (let i = 0; i < clampedParticleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = radius * (0.4 + Math.random() * 0.6);

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
        }

        return positions;
    }, [clampedParticleCount]);

    // Mouse tracking for cursor attraction
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        // Convert to overlay coordinate space (centered)
        const offsetX = (overlaySize - size) / 2;
        const offsetY = (overlaySize - size) / 2;
        setCursorPosition({
            x: e.clientX - rect.left + offsetX,
            y: e.clientY - rect.top + offsetY,
        });
    }, [overlaySize, size]);

    const handleMouseLeave = useCallback(() => {
        setCursorPosition(null);
    }, []);

    // Initialize Three.js scene for orbit particles
    const initScene = useCallback(() => {
        if (!canvasRef.current) return;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.z = 250;
        cameraRef.current = camera;

        try {
            // PRE-FLIGHT CHECK: Explicitly check for context availability before Three.js tries to initialize.
            const gl = canvasRef.current.getContext('webgl', {
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance'
            });

            if (!gl) {
                console.warn('[ZenaHighTechAvatar] WebGL Context unavailable (Exhausted?). Aborting renderer creation.');
                rendererRef.current = null;
                return;
            }

            const renderer = new THREE.WebGLRenderer({
                canvas: canvasRef.current,
                context: gl,
                alpha: true,
                antialias: true,
            });

            renderer.setSize(size * 1.4, size * 1.4);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            rendererRef.current = renderer;
        } catch (error) {
            console.error('[ZenaHighTechAvatar] WebGL initialization failed (Exception):', error);
            rendererRef.current = null;
            return; // Exit early if renderer creation fails
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(initialPositions.slice(), 3));

        const colors = new Float32Array(clampedParticleCount * 3);
        const config = STATE_CONFIG[voiceState];

        for (let i = 0; i < clampedParticleCount; i++) {
            const t = Math.random();
            const color = new THREE.Color().lerpColors(config.colorPrimary, config.colorSecondary, t);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uSize: { value: config.particleSize },
                uOpacity: { value: config.opacity },
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            depthWrite: false,
        });

        const particles = new THREE.Points(geometry, material);
        particlesRef.current = particles;
        scene.add(particles);

    }, [size, clampedParticleCount, initialPositions]); // Removed voiceState dependency

    // Animation loop for orbit particles
    const animate = useCallback(() => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !particlesRef.current) return;

        const particles = particlesRef.current;
        const positions = particles.geometry.attributes.position.array as Float32Array;
        const colors = particles.geometry.attributes.color.array as Float32Array;
        const config = STATE_CONFIG[currentStateRef.current];

        timeRef.current += 0.016;
        const time = timeRef.current;

        const audioFactor = currentStateRef.current === 'listening' ? audioLevelRef.current : 0;

        for (let i = 0; i < clampedParticleCount; i++) {
            const ix = i * 3;
            const iy = i * 3 + 1;
            const iz = i * 3 + 2;

            const x = positions[ix];
            const y = positions[iy];
            const z = positions[iz];

            const dist = Math.sqrt(x * x + y * y + z * z);

            const orbitSpeed = 0.003 + (i % 10) * 0.0002;
            const orbitX = -y * orbitSpeed;
            const orbitY = x * orbitSpeed;

            const targetDist = config.orbitRadius + (audioFactor * 30) + (i % 30);
            const distDiff = dist - targetDist;
            const springForce = -distDiff * 0.002;

            const dx = (x / Math.max(dist, 1)) * springForce + orbitX;
            const dy = (y / Math.max(dist, 1)) * springForce + orbitY;
            const dz = (z / Math.max(dist, 1)) * springForce * 0.5;

            const noiseVal = noise3D(x * 0.01, y * 0.01, z * 0.01, time);
            const noiseAmp = config.noiseAmplitude * (1 + audioFactor * 2);
            const noiseX = Math.cos(noiseVal * Math.PI * 2) * noiseAmp;
            const noiseY = Math.sin(noiseVal * Math.PI * 2) * noiseAmp;
            const noiseZ = Math.sin(noiseVal * Math.PI) * noiseAmp * 0.5;

            positions[ix] += dx + noiseX;
            positions[iy] += dy + noiseY;
            positions[iz] += dz + noiseZ;

            if (isNaN(dist) || dist > 220 || dist < 50) {
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const r = 100 + Math.random() * 60;
                positions[ix] = r * Math.sin(phi) * Math.cos(theta);
                positions[iy] = r * Math.sin(phi) * Math.sin(theta);
                positions[iz] = r * Math.cos(phi);
            }

            const colorT = (Math.sin(time * 0.5 + i * 0.02) + 1) / 2;
            const color = new THREE.Color().lerpColors(config.colorPrimary, config.colorSecondary, colorT);
            colors[ix] = color.r;
            colors[iy] = color.g;
            colors[iz] = color.b;
        }

        particles.geometry.attributes.position.needsUpdate = true;
        particles.geometry.attributes.color.needsUpdate = true;

        particles.rotation.y += config.rotationSpeed;
        particles.rotation.x = Math.sin(time * 0.2) * 0.1;

        const mat = particles.material as THREE.ShaderMaterial;
        mat.uniforms.uSize.value = config.particleSize + audioFactor * 1.5;
        mat.uniforms.uOpacity.value = config.opacity + audioFactor * 0.2;

        rendererRef.current.render(sceneRef.current, cameraRef.current);
        animationFrameRef.current = requestAnimationFrame(animate);
    }, [clampedParticleCount]);

    // Update refs when props change
    useEffect(() => { currentStateRef.current = voiceState; }, [voiceState]);
    useEffect(() => { audioLevelRef.current = Math.max(0, Math.min(1, audioLevel)); }, [audioLevel]);

    // Initialize orbit particles
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
        if (rendererRef.current) {
            rendererRef.current.setSize(size * 1.4, size * 1.4);
        }
    }, [size]);

    // Glitch effect timer (every 5 seconds)
    useEffect(() => {
        glitchIntervalRef.current = setInterval(() => {
            setIsGlitching(true);
            setTimeout(() => setIsGlitching(false), GLITCH_DURATION);
        }, GLITCH_INTERVAL);

        return () => {
            if (glitchIntervalRef.current) {
                clearInterval(glitchIntervalRef.current);
            }
        };
    }, []);

    const containerClasses = [
        'zena-hightech-avatar',
        `zena-hightech-avatar--${voiceState}`,
        isGlitching ? 'zena-hightech-avatar--glitching' : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div
            ref={containerRef}
            className={containerClasses}
            style={{ width: size, height: size }}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            role={onClick ? 'button' : 'img'}
            tabIndex={onClick ? 0 : undefined}
            aria-label="Zena AI Avatar"
        >
            {/* Ambient Glow */}
            <div className="zena-hightech-avatar__glow" />

            {/* Pulsing Ring */}
            <div className="zena-hightech-avatar__ring" />

            {/* Emanating Rings - Ripple Effect */}
            <div className="zena-hightech-avatar__emanating-rings">
                <div className="emanating-ring emanating-ring--1" />
                <div className="emanating-ring emanating-ring--2" />
                <div className="emanating-ring emanating-ring--3" />
            </div>

            {/* Background Fluid Particles */}
            <div className="zena-hightech-avatar__fluid-bg">
                {(size > 100) && (
                    <FluidParticleOverlay
                        width={overlaySize}
                        height={overlaySize}
                        voiceState={voiceState}
                        audioLevel={audioLevel}
                        cursorPosition={cursorPosition}
                        particleCount={Math.floor(fluidParticleCount * 0.3)}
                        layerMode="background"
                    />
                )}
            </div>

            {/* Orbit Particle Canvas - fades during dissolve but stays mounted */}
            <canvas
                ref={canvasRef}
                className="zena-hightech-avatar__particles"
                style={{
                    opacity: dissolvePhase === 'idle' ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: dissolvePhase === 'idle' ? 'auto' : 'none',
                    display: rendererRef.current ? 'block' : 'none',
                    width: size * 1.4,
                    height: size * 1.4
                }}
                aria-hidden="true"
            />

            {/* Dissolve Particle System - shows during transformation */}
            {dissolvePhase !== 'idle' && (
                <DissolveParticleSystem
                    phase={dissolvePhase}
                    size={size}
                    imageSrc={imageSrc}
                    audioLevel={audioLevel}
                    onPhaseComplete={onDissolvePhaseComplete}
                />
            )}

            {/* Circular Avatar Image - fades during dissolve, hidden during speaking */}
            <div
                className="zena-hightech-avatar__image-wrapper"
                style={{
                    opacity: dissolvePhase === 'idle' ? 1 :
                        dissolvePhase === 'reforming' ? 0.3 : 0,
                    transition: 'opacity 0.3s ease'
                }}
            >
                <img
                    src={imageSrc}
                    alt="Zena AI"
                    className="zena-hightech-avatar__image"
                />
            </div>

            {/* Foreground Fluid Particles (over avatar) */}
            <div className="zena-hightech-avatar__fluid-fg">
                <FluidParticleOverlay
                    width={overlaySize}
                    height={overlaySize}
                    voiceState={voiceState}
                    audioLevel={audioLevel}
                    cursorPosition={cursorPosition}
                    particleCount={Math.floor(fluidParticleCount * 0.7)}
                    layerMode="foreground"
                />
            </div>

            {/* Scanline Shimmer */}
            <div className="zena-hightech-avatar__shimmer" />

            {/* Glitch Overlay */}
            {isGlitching && (
                <div className="zena-hightech-avatar__glitch-slice" />
            )}
        </div>
    );
});

ZenaHighTechAvatar.displayName = 'ZenaHighTechAvatar';

export default ZenaHighTechAvatar;
