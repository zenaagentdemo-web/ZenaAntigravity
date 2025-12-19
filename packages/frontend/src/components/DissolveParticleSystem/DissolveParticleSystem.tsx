import React, { useRef, useEffect, useCallback, useMemo, memo } from 'react';
import * as THREE from 'three';
import { noise2D } from '../../utils/perlinNoise';
import './DissolveParticleSystem.css';

export type DissolvePhase = 'idle' | 'dissolving' | 'vortex' | 'reforming' | 'speaking';

export interface DissolveParticleSystemProps {
    /** Current phase of the dissolve effect */
    phase: DissolvePhase;
    /** Size of the particle system canvas */
    size: number;
    /** Path to avatar image for color sampling */
    imageSrc: string;
    /** Audio level for speaking phase reactivity (0-1) */
    audioLevel?: number;
    /** Callback when phase animation completes */
    onPhaseComplete?: (phase: DissolvePhase) => void;
}

// Configuration - Ultra HD quality
const GRID_SIZE = 80; // 80x80 grid = ~6400 particles for ultra HD density
const MAX_PARTICLES = GRID_SIZE * GRID_SIZE;
const DISSOLVE_DURATION = 1000; // 1 second
const REFORM_DURATION = 800; // 0.8 seconds
const MAX_VORTEX_RADIUS = 180;
const VORTEX_ROTATION_SPEED = 1.5;

// Vertex shader - HD quality
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
        gl_PointSize = size * (400.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

// Fragment shader - ULTRA HD crisp particles with sharp edges
const fragmentShader = `
    varying float vOpacity;
    varying vec3 vColor;
    
    void main() {
        // Create perfectly round, CRISP particle with sharp edge
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center) * 2.0;
        
        // VERY SHARP circular edge - almost no blur
        float circle = 1.0 - smoothstep(0.75, 0.85, dist);
        
        // Solid bright core with subtle falloff
        float core = 1.0 - smoothstep(0.0, 0.6, dist);
        
        // Sharp, crisp color
        vec3 finalColor = vColor * (core * 1.3 + 0.2);
        float alpha = circle * vOpacity;
        
        // Bright center highlight
        finalColor += vec3(0.15) * core * core;
        
        gl_FragColor = vec4(finalColor, alpha);
        
        if (alpha < 0.02) discard;
    }
`;

interface Particle {
    originalX: number;
    originalY: number;
    currentX: number;
    currentY: number;
    vx: number;
    vy: number;
    color: THREE.Color;
    size: number;
    opacity: number;
    attached: boolean;
    noiseOffset: number;
    distanceFromCenter: number;
}



/**
 * DissolveParticleSystem - Hologram dissolve/reform effect
 * 
 * Phases:
 * - idle: No particles visible, avatar shown normally
 * - dissolving: Avatar breaks into particles from edges inward
 * - vortex: Particles form swirling thinking cloud
 * - reforming: Particles rush back to recreate avatar
 * - speaking: Voice-reactive wave pulses
 */
export const DissolveParticleSystem: React.FC<DissolveParticleSystemProps> = memo(({
    phase,
    size,
    imageSrc,
    audioLevel = 0,
    onPhaseComplete,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const particlesRef = useRef<THREE.Points | null>(null);
    const particleDataRef = useRef<Particle[]>([]);
    const animationFrameRef = useRef<number>(0);
    const phaseStartTimeRef = useRef<number>(0);
    const currentPhaseRef = useRef<DissolvePhase>(phase);
    const imageDataRef = useRef<ImageData | null>(null);
    const lastAudioPeakRef = useRef<number>(0);
    const lastLightningRef = useRef<number>(0);
    const lastFlareRef = useRef<number>(0);
    const transitionStartRef = useRef<number>(0); // For smooth vortex→speaking transition

    // Visual effect states
    const [lightningArcs, setLightningArcs] = React.useState<{ id: number; path: string; delay: number }[]>([]);
    const lightningIdRef = useRef<number>(0);

    // Dissolve phase effects
    const [showGlitchFlash, setShowGlitchFlash] = React.useState(false);
    const [showShockwave, setShowShockwave] = React.useState(false);

    // Vortex phase effects
    const [showCoreFlare, setShowCoreFlare] = React.useState(false);
    const [scannerRings, setScannerRings] = React.useState<{ id: number; createdAt: number }[]>([]);
    const scannerRingIdRef = useRef<number>(0);

    // Reform phase effects
    const [showConvergenceLines, setShowConvergenceLines] = React.useState(false);
    const [showFinalFlash, setShowFinalFlash] = React.useState(false);
    const [showHoloFlicker, setShowHoloFlicker] = React.useState(false);

    // Implosion flash for dissolve phase
    const [showImplosionFlash, setShowImplosionFlash] = React.useState(false);

    // Generate random lightning path with realistic branching
    const generateLightningPath = useCallback((centerX: number, centerY: number, radius: number): string => {
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = angle1 + Math.PI * 0.4 + Math.random() * Math.PI * 0.8;

        const startX = centerX + Math.cos(angle1) * radius * 0.9;
        const startY = centerY + Math.sin(angle1) * radius * 0.9;
        const endX = centerX + Math.cos(angle2) * radius * 0.9;
        const endY = centerY + Math.sin(angle2) * radius * 0.9;

        // Create realistic jagged lightning path with more segments
        let path = `M ${startX} ${startY}`;
        const segments = 8 + Math.floor(Math.random() * 5); // More segments for detail

        let lastX = startX;
        let lastY = startY;

        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            // Base position along the arc
            const baseX = startX + (endX - startX) * t;
            const baseY = startY + (endY - startY) * t;

            // Sharp angular jitter that decreases toward the end
            const jitterScale = (1 - t * 0.5) * 30;
            const offsetX = (Math.random() - 0.5) * jitterScale;
            const offsetY = (Math.random() - 0.5) * jitterScale;

            // Sometimes add a sharp direction change for realistic lightning
            const sharpTurn = Math.random() > 0.7 ? (Math.random() - 0.5) * 25 : 0;

            const newX = baseX + offsetX + sharpTurn;
            const newY = baseY + offsetY + (Math.random() - 0.5) * 15;

            path += ` L ${newX} ${newY}`;
            lastX = newX;
            lastY = newY;
        }

        path += ` L ${endX} ${endY}`;
        return path;
    }, []);

    // Sample colors from image
    const sampleImageColors = useCallback((img: HTMLImageElement): ImageData | null => {
        const canvas = document.createElement('canvas');
        canvas.width = GRID_SIZE;
        canvas.height = GRID_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(img, 0, 0, GRID_SIZE, GRID_SIZE);
        return ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE);
    }, []);

    // Initialize particles from image
    const initParticles = useCallback((imageData: ImageData): Particle[] => {
        const particles: Particle[] = [];
        const centerX = size / 2;
        const centerY = size / 2;
        const particleSpacing = size / GRID_SIZE;

        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const pixelIndex = (y * GRID_SIZE + x) * 4;
                const r = imageData.data[pixelIndex] / 255;
                const g = imageData.data[pixelIndex + 1] / 255;
                const b = imageData.data[pixelIndex + 2] / 255;
                const a = imageData.data[pixelIndex + 3] / 255;

                // Skip transparent pixels
                if (a < 0.1) continue;

                const posX = x * particleSpacing + particleSpacing / 2;
                const posY = y * particleSpacing + particleSpacing / 2;
                const distFromCenter = Math.sqrt(
                    Math.pow(posX - centerX, 2) + Math.pow(posY - centerY, 2)
                );

                // Create circular mask
                if (distFromCenter > size / 2 - 5) continue;

                particles.push({
                    originalX: posX,
                    originalY: posY,
                    currentX: posX,
                    currentY: posY,
                    vx: 0,
                    vy: 0,
                    color: new THREE.Color(r, g, b),
                    size: 6 + Math.random() * 3, // Ultra HD particle size
                    opacity: 1,
                    attached: true,
                    noiseOffset: Math.random() * 1000,
                    distanceFromCenter: distFromCenter,
                });
            }
        }

        return particles;
    }, [size]);

    // Initialize Three.js scene
    const initScene = useCallback(() => {
        if (!canvasRef.current || particleDataRef.current.length === 0) return;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.OrthographicCamera(0, size, 0, size, 0.1, 1000);
        camera.position.z = 100;
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
        });
        renderer.setSize(size, size);
        // Use FULL device pixel ratio for ultra HD quality (3x minimum for crisp particles)
        renderer.setPixelRatio(Math.max(window.devicePixelRatio, 3));
        rendererRef.current = renderer;

        const particles = particleDataRef.current;
        const count = particles.length;

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const opacities = new Float32Array(count);
        const colors = new Float32Array(count * 3);

        particles.forEach((p, i) => {
            positions[i * 3] = p.currentX;
            positions[i * 3 + 1] = p.currentY;
            positions[i * 3 + 2] = 0;
            sizes[i] = p.size;
            opacities[i] = p.opacity;
            colors[i * 3] = p.color.r;
            colors[i * 3 + 1] = p.color.g;
            colors[i * 3 + 2] = p.color.b;
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
    }, [size]);

    // Load image and initialize
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const imageData = sampleImageColors(img);
            if (imageData) {
                imageDataRef.current = imageData;
                particleDataRef.current = initParticles(imageData);
                initScene();
            }
        };
        img.src = imageSrc;

        return () => {
            cancelAnimationFrame(animationFrameRef.current);
            if (rendererRef.current) {
                rendererRef.current.dispose();
            }
        };
    }, [imageSrc, sampleImageColors, initParticles, initScene]);

    // Handle phase changes and trigger effects
    useEffect(() => {
        if (phase !== currentPhaseRef.current) {
            phaseStartTimeRef.current = Date.now();
            const prevPhase = currentPhaseRef.current;
            currentPhaseRef.current = phase;

            // Dissolve phase effects
            if (phase === 'dissolving') {
                // Reset particle positions to original for the implosion
                particleDataRef.current.forEach(p => {
                    p.currentX = p.originalX;
                    p.currentY = p.originalY;
                    p.vx = 0;
                    p.vy = 0;
                    p.opacity = 1;
                });
            }

            // Vortex phase - scatter particles into swirl
            if (phase === 'vortex') {
                const centerX = size / 2;
                const centerY = size / 2;

                // Scatter all particles into random circular positions
                particleDataRef.current.forEach((p, i) => {
                    const angle = (i / particleDataRef.current.length) * Math.PI * 2 + Math.random() * 0.5;
                    const radius = 80 + Math.random() * 80;
                    p.currentX = centerX + Math.cos(angle) * radius;
                    p.currentY = centerY + Math.sin(angle) * radius;
                    p.vx = 0;
                    p.vy = 0;
                    p.opacity = 0.8;
                });
            }

            // Reform phase effects
            if (phase === 'reforming') {
                // Convergence lines
                setShowConvergenceLines(true);

                // Hologram flicker near end
                setTimeout(() => {
                    setShowHoloFlicker(true);
                    setTimeout(() => setShowHoloFlicker(false), 400);
                }, 500);

                // Final flash at completion
                setTimeout(() => {
                    setShowFinalFlash(true);
                    setShowConvergenceLines(false);
                    setTimeout(() => setShowFinalFlash(false), 200);
                }, 750);
            }

            // Speaking phase - store positions for smooth transition from vortex
            if (phase === 'speaking' && prevPhase === 'vortex') {
                // Mark that we're transitioning - particles will blend from current positions
                transitionStartRef.current = performance.now();
            }

            // Clear reform effects when leaving
            if (prevPhase === 'reforming') {
                setShowConvergenceLines(false);
                setShowHoloFlicker(false);
            }
        }
    }, [phase]);

    // Easing functions
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // Animation loop
    const animate = useCallback(() => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !particlesRef.current) {
            animationFrameRef.current = requestAnimationFrame(animate);
            return;
        }

        const particles = particleDataRef.current;
        const points = particlesRef.current;
        const positions = points.geometry.attributes.position.array as Float32Array;
        const opacities = points.geometry.attributes.opacity.array as Float32Array;
        const sizes = points.geometry.attributes.size.array as Float32Array;

        const now = Date.now();
        const elapsed = now - phaseStartTimeRef.current;
        const centerX = size / 2;
        const centerY = size / 2;
        const maxDistance = size / 2;

        const currentPhase = currentPhaseRef.current;

        if (currentPhase === 'idle') {
            // No particles visible in idle
            particles.forEach((p, i) => {
                opacities[i] = 0;
            });
        } else if (currentPhase === 'dissolving') {
            const progress = Math.min(1, elapsed / DISSOLVE_DURATION);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

            // Trigger implosion flash at start
            if (elapsed < 100 && !showImplosionFlash) {
                setShowImplosionFlash(true);
                setTimeout(() => setShowImplosionFlash(false), 300);
            }

            particles.forEach((p, i) => {
                // IMPLOSION: All particles rush toward center
                const distToCenter = Math.sqrt(
                    Math.pow(p.currentX - centerX, 2) + Math.pow(p.currentY - centerY, 2)
                );

                // Pull toward center with acceleration
                const angleToCenter = Math.atan2(centerY - p.currentY, centerX - p.currentX);
                const pullStrength = 3 + easeProgress * 5; // Accelerates over time

                p.vx += Math.cos(angleToCenter) * pullStrength * 0.1;
                p.vy += Math.sin(angleToCenter) * pullStrength * 0.1;

                // Add slight spiral
                p.vx += Math.cos(angleToCenter + Math.PI / 2) * 0.3;
                p.vy += Math.sin(angleToCenter + Math.PI / 2) * 0.3;

                // Damping
                p.vx *= 0.95;
                p.vy *= 0.95;

                p.currentX += p.vx;
                p.currentY += p.vy;

                // Particles that reach center become invisible
                if (distToCenter < 30) {
                    p.opacity = Math.max(0, p.opacity - 0.1);
                } else {
                    p.opacity = 0.9;
                }

                positions[i * 3] = p.currentX;
                positions[i * 3 + 1] = p.currentY;
                opacities[i] = p.opacity;
                sizes[i] = p.size * (1 + easeProgress * 0.5); // Slightly grow as they converge
            });

            if (progress >= 1) {
                particles.forEach(p => { p.attached = false; });
                onPhaseComplete?.('dissolving');
            }
        } else if (currentPhase === 'vortex') {
            const time = elapsed * 0.001;
            const maxRadius = size / 2 - 10; // Circular boundary

            particles.forEach((p, i) => {
                // Fluid swirling motion - DRASTICALLY SLOWER
                const angle = Math.atan2(p.currentY - centerY, p.currentX - centerX);
                const currentDist = Math.sqrt(
                    Math.pow(p.currentX - centerX, 2) + Math.pow(p.currentY - centerY, 2)
                );

                // Very slow orbital drift
                const orbitSpeed = 0.003 + (i % 10) * 0.0004;
                const newAngle = angle + orbitSpeed;

                // Gentle wave motion - target radius within circular bounds
                const wave = Math.sin(time * 0.25 + p.noiseOffset * 0.01) * 25;
                const targetRadius = Math.min(70 + (i % 50) * 1.2 + wave, maxRadius);

                // Smooth transition to target radius
                const radiusDiff = targetRadius - currentDist;
                const newRadius = Math.min(currentDist + radiusDiff * 0.02, maxRadius);

                // Very subtle noise for organic feel
                const noiseX = Math.sin(time * 0.2 + p.noiseOffset) * 2;
                const noiseY = Math.cos(time * 0.15 + p.noiseOffset * 0.7) * 2;

                // Calculate new position
                let newX = centerX + Math.cos(newAngle) * newRadius + noiseX;
                let newY = centerY + Math.sin(newAngle) * newRadius + noiseY;

                // CIRCULAR MASK - constrain to circular bounds
                const distFromCenter = Math.sqrt(Math.pow(newX - centerX, 2) + Math.pow(newY - centerY, 2));
                if (distFromCenter > maxRadius) {
                    const scale = maxRadius / distFromCenter;
                    newX = centerX + (newX - centerX) * scale;
                    newY = centerY + (newY - centerY) * scale;
                }

                p.currentX = newX;
                p.currentY = newY;

                // EDGE FADE: Calculate fade based on distance from center
                // Particles near outer edge become nearly invisible (90% reduction)
                const edgeRatio = distFromCenter / maxRadius;
                const edgeFade = edgeRatio > 0.75 ? Math.max(0.1, 1 - (edgeRatio - 0.75) / 0.25 * 0.9) : 1;

                // Gentle opacity pulse with edge fade applied
                p.opacity = (0.7 + Math.sin(time * 0.3 + p.noiseOffset * 0.1) * 0.15) * edgeFade;

                positions[i * 3] = p.currentX;
                positions[i * 3 + 1] = p.currentY;
                opacities[i] = p.opacity;
                sizes[i] = p.size * (0.85 + Math.sin(time * 0.4 + i * 0.05) * 0.15) * edgeFade;
            });

            // Spawn lightning arcs every 0.8-1.5 seconds
            const lightningInterval = 800 + Math.random() * 700;
            if (now - lastLightningRef.current > lightningInterval) {
                lastLightningRef.current = now;
                const newArc = {
                    id: lightningIdRef.current++,
                    path: generateLightningPath(centerX, centerY, 100),
                    delay: 0,
                };
                setLightningArcs(prev => [...prev.slice(-2), newArc]);

                setTimeout(() => {
                    setLightningArcs(prev => prev.filter(a => a.id !== newArc.id));
                }, 200);
            }
        } else if (currentPhase === 'reforming') {
            const progress = Math.min(1, elapsed / REFORM_DURATION);
            const easedProgress = easeOutCubic(progress);

            particles.forEach((p, i) => {
                // Reform from center outward (opposite of dissolve)
                const normalizedDist = p.distanceFromCenter / maxDistance;
                const reformThreshold = progress;

                if (normalizedDist < reformThreshold) {
                    // This particle should be reforming/reformed
                    const localProgress = Math.min(1, (reformThreshold - normalizedDist) * 3);
                    p.currentX = p.currentX + (p.originalX - p.currentX) * localProgress * 0.2;
                    p.currentY = p.currentY + (p.originalY - p.currentY) * localProgress * 0.2;
                    p.opacity = 0.6 + localProgress * 0.4;
                } else {
                    // Still in vortex motion
                    const angle = Math.atan2(p.currentY - centerY, p.currentX - centerX);
                    const newAngle = angle + VORTEX_ROTATION_SPEED * 0.016 * (1 - easedProgress);
                    const dist = Math.sqrt(
                        Math.pow(p.currentX - centerX, 2) + Math.pow(p.currentY - centerY, 2)
                    );
                    p.currentX = centerX + Math.cos(newAngle) * dist * (1 - easedProgress * 0.3);
                    p.currentY = centerY + Math.sin(newAngle) * dist * (1 - easedProgress * 0.3);
                }

                positions[i * 3] = p.currentX;
                positions[i * 3 + 1] = p.currentY;
                opacities[i] = p.opacity;
            });

            if (progress >= 1) {
                // Snap all particles to final positions
                particles.forEach((p, i) => {
                    p.currentX = p.originalX;
                    p.currentY = p.originalY;
                    p.opacity = 1;
                    p.attached = true;
                    positions[i * 3] = p.originalX;
                    positions[i * 3 + 1] = p.originalY;
                    opacities[i] = 1;
                });
                onPhaseComplete?.('reforming');
            }
        } else if (currentPhase === 'speaking') {
            // SPEAKING: Blue Fluid Plasma - HOLLOW sphere with flowing particles
            // ENHANCED: Smoother, more elegant motion with floating orbital particles
            const time = elapsed * 0.001;
            const centerX = size / 2;
            const centerY = size / 2;

            // SMOOTH TRANSITION: Blend from vortex positions over 800ms
            const transitionDuration = 800; // ms
            const timeSinceTransition = now - transitionStartRef.current;
            const transitionProgress = Math.min(1, timeSinceTransition / transitionDuration);
            // Smooth easing function for elegant transition
            const easeProgress = transitionProgress < 0.5
                ? 4 * transitionProgress * transitionProgress * transitionProgress
                : 1 - Math.pow(-2 * transitionProgress + 2, 3) / 2;

            // Sphere is a SHELL (hollow center)
            const innerRadius = size * 0.25;  // Dark hollow center
            const outerRadius = size * 0.38;  // Outer boundary

            // SMOOTHED audio response - gentler, less aggressive
            const smoothedAudio = audioLevel * 0.6; // Reduced sensitivity
            const flowSpeed = 0.15 + smoothedAudio * 0.25; // SLOWER flow
            const glowIntensity = 0.6 + smoothedAudio * 0.3;

            // Split particles: 70% on sphere, 30% floating orbitals for dramatic effect
            const sphereParticleCount = Math.floor(particles.length * 0.7);

            particles.forEach((p, i) => {
                // Store current position for blending (from vortex)
                const prevX = p.currentX;
                const prevY = p.currentY;

                if (i < sphereParticleCount) {
                    // MAIN SPHERE PARTICLES - fluid motion on sphere surface
                    const k = i + 0.5;
                    const phi = Math.acos(1 - 2 * k / sphereParticleCount);
                    const theta = Math.PI * (1 + Math.sqrt(5)) * k;

                    // 3D sphere coordinates
                    const baseX = Math.sin(phi) * Math.cos(theta);
                    const baseY = Math.sin(phi) * Math.sin(theta);
                    const baseZ = Math.cos(phi);

                    // FASTER rotation around Y axis for visible motion
                    const rotAngle = time * 0.15;
                    const rotX = baseX * Math.cos(rotAngle) + baseZ * Math.sin(rotAngle);
                    const rotZ = -baseX * Math.sin(rotAngle) + baseZ * Math.cos(rotAngle);

                    // Individual particle wander - each particle drifts on its own
                    const particleWander = Math.sin(time * 0.4 + i * 0.1) * 0.05;
                    const wanderX = Math.sin(time * 0.3 + i * 0.15) * 3;
                    const wanderY = Math.cos(time * 0.25 + i * 0.12) * 3;

                    // Flowing noise - creates the "liquid" effect
                    const noiseFreq = 2.0;
                    const flow1 = Math.sin(baseX * noiseFreq + time * flowSpeed * 1.5) *
                        Math.cos(baseY * noiseFreq - time * flowSpeed);
                    const flow2 = Math.sin(baseZ * noiseFreq * 1.3 + time * flowSpeed * 0.8) *
                        Math.cos(baseX * noiseFreq + time * flowSpeed * 0.5);
                    const organicNoise = (flow1 + flow2) * 0.5;

                    // Radius varies for depth + breathing effect
                    const shellThickness = outerRadius - innerRadius;
                    const breathe = Math.sin(time * 0.3) * 0.1; // Sphere breathes
                    const radiusOffset = (organicNoise * 0.5 + 0.5 + particleWander + breathe) * shellThickness * 0.6;
                    const particleRadius = innerRadius + shellThickness * 0.5 + radiusOffset;

                    // Project to 2D with individual wander
                    p.currentX = centerX + rotX * particleRadius + wanderX;
                    p.currentY = centerY + baseY * particleRadius + wanderY;

                    // Edge fade
                    const dist2D = Math.sqrt(Math.pow(p.currentX - centerX, 2) + Math.pow(p.currentY - centerY, 2));
                    const maxDist = outerRadius;
                    const edgeRatio = dist2D / maxDist;
                    const edgeFade = edgeRatio > 0.85 ? Math.max(0, 1 - (edgeRatio - 0.85) / 0.15) : 1;

                    // Depth-based opacity with pulse
                    const depthFactor = (rotZ + 1) * 0.5;
                    const opacityPulse = Math.sin(time * 0.5 + i * 0.05) * 0.1;
                    p.opacity = (0.25 + depthFactor * 0.55 * glowIntensity + opacityPulse) * edgeFade;

                    // Size with subtle pulse
                    const sizePulse = Math.sin(time * 0.4 + i * 0.08) * 0.3;
                    const baseSize = 1.5 + sizePulse;
                    const depthSize = 0.4 + depthFactor * 0.6;
                    sizes[i] = baseSize * depthSize * (1 + smoothedAudio * 0.2) * edgeFade;

                    // Blue color palette with shimmer
                    const colors = points.geometry.attributes.color.array as Float32Array;
                    const noiseBrightness = Math.abs(organicNoise);
                    const shimmer = Math.sin(time * 0.6 + i * 0.1) * 0.15;
                    const isHotSpot = noiseBrightness > 0.5;
                    colors[i * 3] = isHotSpot ? 0.4 + shimmer : 0.05;
                    colors[i * 3 + 1] = 0.35 + noiseBrightness * 0.35 + (depthFactor * 0.25) + shimmer;
                    colors[i * 3 + 2] = 0.75 + noiseBrightness * 0.25;
                } else {
                    // FLOATING ORBITAL PARTICLES - ENHANCED dramatic swirling wisps
                    const orbitalIndex = i - sphereParticleCount;
                    const totalOrbitals = particles.length - sphereParticleCount;

                    // Multiple orbit layers at varying distances
                    const orbitLayer = orbitalIndex % 5;
                    const baseOrbitRadius = outerRadius * (1.2 + orbitLayer * 0.3); // More spread

                    // FASTER orbital motion - 2.5x speed increase
                    const orbitSpeed = 0.12 + (orbitLayer % 3) * 0.05;
                    const baseAngle = (orbitalIndex / totalOrbitals) * Math.PI * 2;
                    const orbitAngle = baseAngle + time * orbitSpeed;

                    // ENHANCED wave motion - doubled amplitudes for more floating action
                    const wave1 = Math.sin(time * 0.5 + orbitalIndex * 0.2) * 40;  // Doubled
                    const wave2 = Math.cos(time * 0.35 + orbitalIndex * 0.12) * 25; // Doubled
                    const wave3 = Math.sin(time * 0.25 + baseAngle * 2) * 18;       // Doubled

                    // More dramatic breathing in and out
                    const radiusPulse = Math.sin(time * 0.35 + orbitalIndex * 0.08) * 30; // Doubled

                    // Elliptical orbit with more vertical drift
                    const orbitRadiusX = baseOrbitRadius + radiusPulse + wave3;
                    const orbitRadiusY = (baseOrbitRadius * 0.6) + wave1;

                    // Add extra wandering motion
                    const extraWanderX = Math.sin(time * 0.4 + orbitalIndex * 0.3) * 15;
                    const extraWanderY = Math.cos(time * 0.5 + orbitalIndex * 0.25) * 12;

                    p.currentX = centerX + Math.cos(orbitAngle) * orbitRadiusX + extraWanderX;
                    p.currentY = centerY + Math.sin(orbitAngle) * orbitRadiusY + wave2 + extraWanderY;

                    // BRIGHTER floating particles - more visible
                    const pulseOpacity = 0.55 + Math.sin(time * 0.5 + orbitalIndex * 0.12) * 0.25;
                    p.opacity = pulseOpacity;

                    // 20% LARGER particles for visibility
                    sizes[i] = (3.0 + Math.sin(time * 0.4 + orbitalIndex) * 1.0) * 1.2;

                    // Cyan-white color for magical feel
                    const colors = points.geometry.attributes.color.array as Float32Array;
                    const colorPulse = Math.sin(time * 0.3 + orbitalIndex * 0.06) * 0.5 + 0.5;
                    colors[i * 3] = 0.25 + colorPulse * 0.35; // More white
                    colors[i * 3 + 1] = 0.65 + colorPulse * 0.3; // Bright cyan
                    colors[i * 3 + 2] = 0.95; // Strong blue
                }

                // SMOOTH TRANSITION BLEND: During first 800ms, blend from vortex to sphere positions
                if (easeProgress < 1) {
                    p.currentX = prevX + (p.currentX - prevX) * easeProgress;
                    p.currentY = prevY + (p.currentY - prevY) * easeProgress;
                }

                positions[i * 3] = p.currentX;
                positions[i * 3 + 1] = p.currentY;
                opacities[i] = p.opacity;
            });

            // Mark color buffer for update
            points.geometry.attributes.color.needsUpdate = true;
        }

        points.geometry.attributes.position.needsUpdate = true;
        points.geometry.attributes.opacity.needsUpdate = true;
        points.geometry.attributes.size.needsUpdate = true;

        rendererRef.current.render(sceneRef.current, cameraRef.current);
        animationFrameRef.current = requestAnimationFrame(animate);
    }, [size, onPhaseComplete, audioLevel]);

    // Start animation loop
    useEffect(() => {
        animationFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameRef.current);
    }, [animate]);

    // Only show when not idle
    if (phase === 'idle') {
        return null;
    }

    return (
        <div className={`dissolve-particle-system ${showHoloFlicker ? 'dissolve-particle-system--flickering' : ''}`}>
            {/* Implosion Flash - bright white/cyan flash at dissolve start */}
            {showImplosionFlash && (
                <div
                    className="dissolve-particle-system__implosion-flash"
                    style={{ width: size, height: size }}
                />
            )}

            {/* Main particle canvas */}
            <canvas
                ref={canvasRef}
                className="dissolve-particle-system__canvas"
                style={{ width: size, height: size }}
                aria-hidden="true"
            />

            {/* Vortex phase effects */}
            {phase === 'vortex' && (
                <>
                    {/* Hex grid overlay - holographic pattern */}
                    <div
                        className="dissolve-particle-system__hex-grid"
                        style={{ width: size, height: size }}
                    />

                    {/* Concentric scanner rings */}
                    <div className="dissolve-particle-system__scanner-rings">
                        {scannerRings.map(ring => (
                            <div
                                key={ring.id}
                                className="scanner-ring"
                                style={{ left: size / 2, top: size / 2 }}
                            />
                        ))}
                        {/* Always show pulsing rings */}
                        <div className="scanner-ring scanner-ring--pulse" style={{ left: size / 2, top: size / 2 }} />
                        <div className="scanner-ring scanner-ring--pulse scanner-ring--delayed" style={{ left: size / 2, top: size / 2 }} />
                    </div>

                    {/* Energy core with flare */}
                    <div
                        className={`dissolve-particle-system__core ${showCoreFlare ? 'dissolve-particle-system__core--flare' : ''}`}
                        style={{
                            width: 40,
                            height: 40,
                            left: size / 2 - 20,
                            top: size / 2 - 20,
                        }}
                    />

                    {/* Lightning arcs */}
                    <svg
                        className="dissolve-particle-system__lightning"
                        style={{ width: size, height: size }}
                        viewBox={`0 0 ${size} ${size}`}
                    >
                        {lightningArcs.map(arc => (
                            <path
                                key={arc.id}
                                d={arc.path}
                                className="lightning-arc"
                            />
                        ))}
                    </svg>
                </>
            )}

            {/* Reform phase effects */}
            {phase === 'reforming' && (
                <>
                    {/* Convergence lines - light beams pulling inward */}
                    {showConvergenceLines && (
                        <div className="dissolve-particle-system__convergence">
                            {[...Array(12)].map((_, i) => (
                                <div
                                    key={i}
                                    className="convergence-line"
                                    style={{
                                        transform: `rotate(${i * 30}deg)`,
                                        left: size / 2,
                                        top: size / 2,
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Final flash - bright white at completion */}
            {showFinalFlash && (
                <div
                    className="dissolve-particle-system__final-flash"
                    style={{ left: size / 2, top: size / 2 }}
                />
            )}

            {/* Speaking phase effects */}
            {phase === 'speaking' && (
                <>
                    {/* Voice wave rings - expand based on audio */}
                    <div className="dissolve-particle-system__voice-waves">
                        {[0, 1, 2].map(i => (
                            <div
                                key={i}
                                className="voice-wave-ring"
                                style={{
                                    left: size / 2,
                                    top: size / 2,
                                    animationDelay: `${i * 0.3}s`,
                                    transform: `translate(-50%, -50%) scale(${1 + audioLevel * 0.5})`,
                                }}
                            />
                        ))}
                    </div>

                    {/* Equalizer bars - bounce around avatar */}
                    <div className="dissolve-particle-system__equalizer">
                        {[...Array(8)].map((_, i) => (
                            <div
                                key={i}
                                className="equalizer-bar"
                                style={{
                                    transform: `rotate(${i * 45}deg) translateY(-${size / 2 - 30}px)`,
                                    height: `${20 + audioLevel * 40}px`,
                                    left: size / 2,
                                    top: size / 2,
                                }}
                            />
                        ))}
                    </div>

                    {/* Glow sync overlay */}
                    <div
                        className="dissolve-particle-system__glow-sync"
                        style={{
                            opacity: 0.3 + audioLevel * 0.4,
                            boxShadow: `0 0 ${40 + audioLevel * 60}px ${10 + audioLevel * 30}px rgba(0, 229, 255, ${0.3 + audioLevel * 0.3})`
                        }}
                    />

                    {/* Sound ripples */}
                    <div className="dissolve-particle-system__ripples">
                        {[0, 1, 2, 3].map(i => (
                            <div
                                key={i}
                                className="sound-ripple"
                                style={{
                                    left: size / 2,
                                    top: size / 2,
                                    animationDelay: `${i * 0.4}s`,
                                }}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
});

DissolveParticleSystem.displayName = 'DissolveParticleSystem';

export default DissolveParticleSystem;
