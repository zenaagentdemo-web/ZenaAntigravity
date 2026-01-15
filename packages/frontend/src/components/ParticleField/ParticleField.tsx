/**
 * ParticleField - Three.js WebGL particle system for holographic avatar
 * Creates an immersive particle effect around the avatar
 */
import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { AvatarAnimationState } from '../HolographicAvatar/HolographicAvatar';
import './ParticleField.css';

interface ParticleFieldProps {
    /** Current animation state - affects particle behavior */
    animationState: AvatarAnimationState;
    /** Width of the container */
    width: number;
    /** Height of the container */
    height: number;
    /** Number of particles (default: 500) */
    particleCount?: number;
    /** Whether reduced motion is preferred */
    reducedMotion?: boolean;
}

// Particle behavior configuration per state
const STATE_CONFIG = {
    idle: {
        attractionStrength: 0.002,
        noiseAmplitude: 0.6,
        colorPrimary: new THREE.Color(0x00e5ff),
        colorSecondary: new THREE.Color(0xff00ff),
        rotationSpeed: 0.0008,
        particleSize: 2.8,
        opacity: 0.7,
    },
    listening: {
        attractionStrength: 0.006,
        noiseAmplitude: 0.4,
        colorPrimary: new THREE.Color(0x00ffcc),
        colorSecondary: new THREE.Color(0x00e5ff),
        rotationSpeed: 0.0015,
        particleSize: 3.2,
        opacity: 0.85,
    },
    speaking: {
        attractionStrength: -0.002, // Repulsion - particles emit outward
        noiseAmplitude: 0.8,
        colorPrimary: new THREE.Color(0xff00ff),
        colorSecondary: new THREE.Color(0x00e5ff),
        rotationSpeed: 0.002,
        particleSize: 3.5,
        opacity: 0.9,
    },
    thinking: {
        attractionStrength: 0.005,
        noiseAmplitude: 0.5,
        colorPrimary: new THREE.Color(0x8000ff),
        colorSecondary: new THREE.Color(0x4b0082),
        rotationSpeed: 0.004, // Faster orbital rotation
        particleSize: 2.8,
        opacity: 0.75,
    },
};

// Simple noise function for organic movement
const noise3D = (x: number, y: number, z: number, time: number): number => {
    return Math.sin(x * 2 + time) * Math.cos(y * 2 + time * 0.7) * Math.sin(z * 2 + time * 1.3);
};

// Vertex shader for circle particles
const circleVertexShader = `
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

// Fragment shader for smooth anti-aliased circles
const circleFragmentShader = `
    varying vec3 vColor;
    varying float vOpacity;
    
    void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        
        // Smooth anti-aliased circle edge
        float alpha = 1.0 - smoothstep(0.35, 0.5, dist);
        
        // Add soft glow
        float glow = 1.0 - smoothstep(0.0, 0.5, dist);
        vec3 glowColor = vColor + vec3(0.1, 0.15, 0.2) * glow;
        
        gl_FragColor = vec4(glowColor, alpha * vOpacity);
        
        if (alpha < 0.01) discard;
    }
`;

export const ParticleField: React.FC<ParticleFieldProps> = ({
    animationState,
    width,
    height,
    particleCount = 500,
    reducedMotion = false,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const particlesRef = useRef<THREE.Points | null>(null);
    const animationFrameRef = useRef<number>(0);
    const timeRef = useRef<number>(0);
    const currentStateRef = useRef<AvatarAnimationState>(animationState);

    // Memoize particle positions
    const initialPositions = useMemo(() => {
        const validatedCount = Math.floor(particleCount || 0);
        const positions = new Float32Array(validatedCount * 3);
        const radius = width * 0.4; // Initial spread relative to field size

        for (let i = 0; i < validatedCount; i++) {
            // Spherical distribution
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = radius * (0.3 + Math.random() * 0.7);

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
        }

        return positions;
    }, [particleCount, width]);

    // Initialize Three.js scene
    const initScene = useCallback(() => {
        if (!containerRef.current) return;

        // Scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 300;
        cameraRef.current = camera;

        try {
            // PRE-FLIGHT CHECK: Explicitly check for context availability before Three.js tries to initialize.
            // Using webgl2 to avoid deprecation warnings and improve performance/stability.
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2', {
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance'
            });

            if (!gl || !gl.getContextAttributes()) {
                console.warn('[ParticleField] WebGL 2 Context unavailable or invalid. Aborting renderer creation.');
                rendererRef.current = null;
                return;
            }

            // Renderer
            const renderer = new THREE.WebGLRenderer({
                context: gl,
                canvas: canvas,
                alpha: true,
                antialias: true,
            });

            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            rendererRef.current = renderer;
            containerRef.current.appendChild(renderer.domElement);
        } catch (error) {
            console.error('[ParticleField] WebGL 2 initialization failed (Exception):', error);
            rendererRef.current = null;
            return; // Exit early if renderer creation fails
        }

        // Particle geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(initialPositions.slice(), 3));

        // Colors
        const colors = new Float32Array(particleCount * 3);
        const config = STATE_CONFIG[animationState];

        for (let i = 0; i < particleCount; i++) {
            const t = Math.random();
            const color = new THREE.Color().lerpColors(config.colorPrimary, config.colorSecondary, t);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // ShaderMaterial for circular particles (not squares)
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uSize: { value: config.particleSize },
                uOpacity: { value: config.opacity },
            },
            vertexShader: circleVertexShader,
            fragmentShader: circleFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            depthWrite: false,
        });

        // Particles
        const particles = new THREE.Points(geometry, material);
        particlesRef.current = particles;
        scene.add(particles);

    }, [width, height, particleCount, initialPositions, animationState]);

    // Animation loop
    const animate = useCallback(() => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !particlesRef.current) return;
        if (reducedMotion) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
            return;
        }

        const particles = particlesRef.current;
        const positions = particles.geometry.attributes.position.array as Float32Array;
        const colors = particles.geometry.attributes.color.array as Float32Array;
        const config = STATE_CONFIG[currentStateRef.current];

        timeRef.current += 0.016; // ~60fps
        const time = timeRef.current;

        // Update particle positions
        for (let i = 0; i < particleCount; i++) {
            const ix = i * 3;
            const iy = i * 3 + 1;
            const iz = i * 3 + 2;

            const x = positions[ix];
            const y = positions[iy];
            const z = positions[iz];

            // Distance from center
            const dist = Math.sqrt(x * x + y * y + z * z);

            // Add orbital motion to prevent convergence (particles orbit around center)
            const orbitSpeed = 0.005 + (i % 10) * 0.0012;
            const orbitX = -y * orbitSpeed;
            const orbitY = x * orbitSpeed;

            // Gentle attraction/repulsion toward target orbital distance (150px)
            const targetDist = 120 + (i % 50) * 2; // Varied target distances for natural spread
            const distDiff = dist - targetDist;
            const normalizedDiff = distDiff / Math.max(dist, 1);
            const springForce = -normalizedDiff * config.attractionStrength * 30;

            const dx = (x / Math.max(dist, 1)) * springForce + orbitX;
            const dy = (y / Math.max(dist, 1)) * springForce + orbitY;
            const dz = (z / Math.max(dist, 1)) * springForce;

            // Noise-based drift for organic movement
            const noiseVal = noise3D(x * 0.01, y * 0.01, z * 0.01, time);
            const noiseX = Math.cos(noiseVal * Math.PI * 2) * config.noiseAmplitude;
            const noiseY = Math.sin(noiseVal * Math.PI * 2) * config.noiseAmplitude;
            const noiseZ = Math.sin(noiseVal * Math.PI) * config.noiseAmplitude;

            positions[ix] += dx + noiseX;
            positions[iy] += dy + noiseY;
            positions[iz] += dz + noiseZ;

            // Hard bounds - respawn particles that go too far or too close
            // Radius of field is width/2
            const fieldRadius = width / 2;
            if (dist > fieldRadius || dist < 60) {
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                // Respawn at a random point in the active band
                const r = 80 + Math.random() * (fieldRadius * 0.8 - 80);
                positions[ix] = r * Math.sin(phi) * Math.cos(theta);
                positions[iy] = r * Math.sin(phi) * Math.sin(theta);
                positions[iz] = r * Math.cos(phi);
            }

            // Color interpolation over time
            const colorT = (Math.sin(time * 0.5 + i * 0.01) + 1) / 2;
            const color = new THREE.Color().lerpColors(config.colorPrimary, config.colorSecondary, colorT);
            colors[ix] = color.r;
            colors[iy] = color.g;
            colors[iz] = color.b;
        }

        particles.geometry.attributes.position.needsUpdate = true;
        particles.geometry.attributes.color.needsUpdate = true;

        // Rotate entire particle system
        particles.rotation.y += config.rotationSpeed;
        particles.rotation.x = Math.sin(time * 0.2) * 0.1;

        // Update material uniforms (for ShaderMaterial)
        const mat = particles.material as THREE.ShaderMaterial;
        mat.uniforms.uSize.value = config.particleSize;
        mat.uniforms.uOpacity.value = config.opacity;

        rendererRef.current.render(sceneRef.current, cameraRef.current);
        animationFrameRef.current = requestAnimationFrame(animate);
    }, [particleCount, reducedMotion]);

    // Update state ref when animationState changes
    useEffect(() => {
        currentStateRef.current = animationState;
    }, [animationState]);

    // Initialize and start animation
    useEffect(() => {
        initScene();
        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameRef.current);
            if (rendererRef.current && containerRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
        };
    }, [initScene, animate]);

    // Handle resize
    useEffect(() => {
        if (rendererRef.current && cameraRef.current) {
            rendererRef.current.setSize(width, height);
            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();
        }
    }, [width, height]);

    return (
        <div
            ref={containerRef}
            className="particle-field"
            style={{ display: rendererRef.current ? 'block' : 'none' }}
            aria-hidden="true"
        />
    );
};

ParticleField.displayName = 'ParticleField';
