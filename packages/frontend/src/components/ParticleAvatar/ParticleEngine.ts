/**
 * ParticleEngine - High-Tech WebGL Particle System with Three.js
 * 
 * Features:
 * - 1000 anti-aliased circle particles (mobile-optimized)
 * - Spring physics for organic reassembly (800ms)
 * - Simplex noise for fluid dynamics
 * - Audio-reactive wave effects (subtle)
 * - Dual vortex swirl during thinking
 * - Cinematic flash transitions
 */

import * as THREE from 'three';
import { SimplexNoise } from './noise';

export type CinematicParticleState = 'idle' | 'explode' | 'vortex' | 'waveform' | 'reform';

interface ParticleData {
    positions: Float32Array;      // Current x, y, z positions
    velocities: Float32Array;     // Current vx, vy, vz velocities
    targetPositions: Float32Array; // Original image positions to reform to
    colors: Float32Array;         // RGB colors sampled from image
    sizes: Float32Array;          // Individual particle sizes
    opacities: Float32Array;      // Individual particle opacities
}

interface ParticleEngineConfig {
    particleCount: number;
    canvasWidth: number;
    canvasHeight: number;
    reformDuration?: number;  // Default 800ms
    audioSensitivity?: number; // 0-1, default 0.3 (subtle)
}

// Vertex shader for 3D positioning
const vertexShader = `
    attribute float size;
    attribute float opacity;
    attribute vec3 color;
    
    varying vec3 vColor;
    varying float vOpacity;
    
    void main() {
        vColor = color;
        vOpacity = opacity;
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

// Fragment shader for smooth anti-aliased circles
const fragmentShader = `
    varying vec3 vColor;
    varying float vOpacity;
    
    void main() {
        // Calculate distance from center of point
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        
        // Smooth anti-aliased circle edge
        float alpha = 1.0 - smoothstep(0.35, 0.5, dist);
        
        // Add soft glow to edges
        float glow = 1.0 - smoothstep(0.0, 0.5, dist);
        vec3 glowColor = vColor + vec3(0.1, 0.2, 0.3) * glow;
        
        gl_FragColor = vec4(glowColor, alpha * vOpacity);
        
        // Discard fully transparent fragments
        if (alpha < 0.01) discard;
    }
`;

export class ParticleEngine {
    private scene: THREE.Scene;
    private camera: THREE.OrthographicCamera;
    private renderer: THREE.WebGLRenderer;
    private particles: THREE.Points | null = null;
    private particleData: ParticleData | null = null;
    private noise: SimplexNoise;
    private animationId: number | null = null;
    private time: number = 0;
    private state: CinematicParticleState = 'idle';
    private stateStartTime: number = 0;
    private amplitude: number = 0;

    private readonly config: Required<ParticleEngineConfig>;
    private readonly PARTICLE_COUNT: number;
    private readonly centerX: number;
    private readonly centerY: number;

    // Physics constants
    private readonly SPRING_STIFFNESS = 0.08;   // Spring constant for reform
    private readonly DAMPING = 0.85;            // Velocity damping
    private readonly EXPLOSION_FORCE = 18;      // Initial explosion velocity
    private readonly VORTEX_STRENGTH = 0.015;   // Swirl force
    private readonly NOISE_SCALE = 0.003;       // Turbulence detail level

    constructor(container: HTMLElement, config: ParticleEngineConfig) {
        this.config = {
            ...config,
            reformDuration: config.reformDuration ?? 800,
            audioSensitivity: config.audioSensitivity ?? 0.3,
        };
        this.PARTICLE_COUNT = config.particleCount;
        this.centerX = config.canvasWidth / 2;
        this.centerY = config.canvasHeight / 2;
        this.noise = new SimplexNoise();

        // Initialize Three.js scene
        this.scene = new THREE.Scene();

        // Orthographic camera for 2D-like rendering
        const aspect = config.canvasWidth / config.canvasHeight;
        const frustumSize = config.canvasHeight;
        this.camera = new THREE.OrthographicCamera(
            (-frustumSize * aspect) / 2,
            (frustumSize * aspect) / 2,
            frustumSize / 2,
            -frustumSize / 2,
            0.1,
            1000
        );
        this.camera.position.z = 500;

        try {
            // WebGL renderer with WebGL 2 context check
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2', {
                alpha: true,
                antialias: true,
                premultipliedAlpha: false,
            });

            if (!gl || !gl.getContextAttributes()) {
                console.warn('[ParticleEngine] WebGL 2 Context unavailable or invalid. Aborting renderer creation.');
                // Create a dummy renderer to avoid null pointer errors
                this.renderer = {
                    setSize: () => { },
                    setPixelRatio: () => { },
                    setClearColor: () => { },
                    render: () => { },
                    dispose: () => { },
                    domElement: document.createElement('div'),
                    getContext: () => null
                } as any;
                return;
            }

            this.renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                context: gl,
                alpha: true,
                antialias: true,
            });
            this.renderer.setSize(config.canvasWidth, config.canvasHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.setClearColor(0x000000, 0);

            container.appendChild(this.renderer.domElement);
        } catch (error) {
            console.error('[ParticleEngine] WebGL 2 initialization failed (Exception):', error);
            // Create a dummy renderer to avoid null pointer errors
            this.renderer = {
                setSize: () => { },
                setPixelRatio: () => { },
                setClearColor: () => { },
                render: () => { },
                dispose: () => { },
                domElement: document.createElement('div'),
                getContext: () => null
            } as any;
            return;
        }

        // Style the canvas
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.pointerEvents = 'none';
    }

    /**
     * Initialize particles by sampling colors from an image
     */
    async initializeFromImage(imageSrc: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                const { canvasWidth, canvasHeight } = this.config;

                // Create temporary canvas to sample image
                const tempCanvas = document.createElement('canvas');
                const ctx = tempCanvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas 2D context not available'));
                    return;
                }

                tempCanvas.width = canvasWidth;
                tempCanvas.height = canvasHeight;
                ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

                const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
                const data = imageData.data;

                // Allocate particle data arrays
                const positions = new Float32Array(this.PARTICLE_COUNT * 3);
                const velocities = new Float32Array(this.PARTICLE_COUNT * 3);
                const targetPositions = new Float32Array(this.PARTICLE_COUNT * 3);
                const colors = new Float32Array(this.PARTICLE_COUNT * 3);
                const sizes = new Float32Array(this.PARTICLE_COUNT);
                const opacities = new Float32Array(this.PARTICLE_COUNT);

                // Sample visible pixels from image
                const visiblePixels: { x: number; y: number; r: number; g: number; b: number; a: number }[] = [];

                for (let i = 0; i < data.length; i += 4) {
                    const a = data[i + 3];
                    if (a > 100) { // Only visible pixels
                        const pixelIndex = i / 4;
                        const x = pixelIndex % canvasWidth;
                        const y = Math.floor(pixelIndex / canvasWidth);
                        visiblePixels.push({
                            x: x - this.centerX,  // Center-relative coordinates
                            y: this.centerY - y,  // Flip Y for Three.js
                            r: data[i] / 255,
                            g: data[i + 1] / 255,
                            b: data[i + 2] / 255,
                            a: a / 255,
                        });
                    }
                }

                // Randomly sample from visible pixels (or distribute evenly)
                const step = Math.max(1, Math.floor(visiblePixels.length / this.PARTICLE_COUNT));

                for (let i = 0; i < this.PARTICLE_COUNT; i++) {
                    const pixelIndex = Math.min((i * step) % visiblePixels.length, visiblePixels.length - 1);
                    const pixel = visiblePixels[pixelIndex] || { x: 0, y: 0, r: 0.5, g: 0.5, b: 0.5, a: 1 };

                    // Add slight randomness to position for organic feel
                    const jitterX = (Math.random() - 0.5) * 3;
                    const jitterY = (Math.random() - 0.5) * 3;

                    const idx = i * 3;
                    positions[idx] = pixel.x + jitterX;
                    positions[idx + 1] = pixel.y + jitterY;
                    positions[idx + 2] = 0;

                    targetPositions[idx] = pixel.x + jitterX;
                    targetPositions[idx + 1] = pixel.y + jitterY;
                    targetPositions[idx + 2] = 0;

                    velocities[idx] = 0;
                    velocities[idx + 1] = 0;
                    velocities[idx + 2] = 0;

                    colors[idx] = pixel.r;
                    colors[idx + 1] = pixel.g;
                    colors[idx + 2] = pixel.b;

                    // Particle size based on luminance (brighter = larger)
                    const luminance = pixel.r * 0.299 + pixel.g * 0.587 + pixel.b * 0.114;
                    sizes[i] = 2.5 + luminance * 4;  // 2.5-6.5px

                    opacities[i] = 0.6 + Math.random() * 0.4;
                }

                this.particleData = {
                    positions,
                    velocities,
                    targetPositions,
                    colors,
                    sizes,
                    opacities,
                };

                this.createParticleSystem();
                this.startAnimation();
                resolve();
            };

            img.onerror = () => reject(new Error(`Failed to load image: ${imageSrc}`));
            img.src = imageSrc;
        });
    }

    private createParticleSystem(): void {
        if (!this.particleData) return;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(this.particleData.positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(this.particleData.colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(this.particleData.sizes, 1));
        geometry.setAttribute('opacity', new THREE.BufferAttribute(this.particleData.opacities, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {},
            vertexShader,
            fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            depthWrite: false,
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    private startAnimation(): void {
        const animate = () => {
            this.time += 0.016; // ~60fps delta time
            this.updatePhysics();
            this.render();
            this.animationId = requestAnimationFrame(animate);
        };
        this.animationId = requestAnimationFrame(animate);
    }

    private updatePhysics(): void {
        if (!this.particleData || !this.particles) return;

        const { positions, velocities, targetPositions, opacities, sizes } = this.particleData;
        const t = this.time;
        const stateTime = t - this.stateStartTime;

        for (let i = 0; i < this.PARTICLE_COUNT; i++) {
            const idx = i * 3;
            let x = positions[idx];
            let y = positions[idx + 1];
            let vx = velocities[idx];
            let vy = velocities[idx + 1];

            const tx = targetPositions[idx];
            const ty = targetPositions[idx + 1];

            switch (this.state) {
                case 'idle':
                    // Subtle breathing displacement using noise
                    const idleNoiseX = this.noise.noise2D(x * 0.01, t * 0.5) * 3;
                    const idleNoiseY = this.noise.noise2D(y * 0.01, t * 0.5 + 100) * 3;

                    // Gently return to target with noise offset
                    vx += (tx + idleNoiseX - x) * 0.02;
                    vy += (ty + idleNoiseY - y) * 0.02;
                    vx *= 0.9;
                    vy *= 0.9;

                    // Subtle twinkle
                    opacities[i] = 0.5 + Math.sin(t * 2 + i * 0.1) * 0.2;
                    break;

                case 'explode':
                    // Apply explosive force in first few frames
                    if (stateTime < 0.1) {
                        const angle = Math.atan2(y, x) + (Math.random() - 0.5) * 0.8;
                        const force = this.EXPLOSION_FORCE + Math.random() * 12;
                        vx += Math.cos(angle) * force;
                        vy += Math.sin(angle) * force;
                    }

                    // Apply turbulent noise
                    const explodeNoise = this.noise.noise2D(x * this.NOISE_SCALE, y * this.NOISE_SCALE + t);
                    vx += Math.cos(explodeNoise * Math.PI * 2) * 0.5;
                    vy += Math.sin(explodeNoise * Math.PI * 2) * 0.5;

                    // Damping
                    vx *= 0.96;
                    vy *= 0.96;

                    opacities[i] = Math.max(0.3, opacities[i] - 0.003);
                    break;

                case 'vortex':
                    // Dual vortex swirl
                    const dist = Math.sqrt(x * x + y * y);
                    const normalizedDist = dist / this.config.canvasWidth;

                    // Tangential (swirl) force
                    const tangentX = -y / (dist + 0.1);
                    const tangentY = x / (dist + 0.1);
                    const swirlForce = this.VORTEX_STRENGTH * (1 + normalizedDist);

                    vx += tangentX * swirlForce * this.config.canvasWidth;
                    vy += tangentY * swirlForce * this.config.canvasWidth;

                    // Curl noise for turbulence
                    const curlNoise = this.noise.noise2D(x * 0.005 + t * 0.3, y * 0.005);
                    vx += Math.cos(curlNoise * Math.PI * 4) * 1.5;
                    vy += Math.sin(curlNoise * Math.PI * 4) * 1.5;

                    // Gentle radial containment
                    const targetRadius = 100 + (i % 80) * 1.5;
                    const radiusDiff = dist - targetRadius;
                    vx -= (x / (dist + 0.1)) * radiusDiff * 0.01;
                    vy -= (y / (dist + 0.1)) * radiusDiff * 0.01;

                    vx *= this.DAMPING;
                    vy *= this.DAMPING;

                    // Color pulsing
                    opacities[i] = 0.5 + Math.sin(t * 3 + i * 0.05) * 0.3;
                    break;

                case 'waveform': {
                    // Audio-reactive concentric wave pulses
                    const waveAmp = this.amplitude * this.config.audioSensitivity * 15;
                    const distFromCenter = Math.sqrt(x * x + y * y);
                    const wavePhase = distFromCenter * 0.03 - t * 6;
                    const waveDisplacement = Math.sin(wavePhase) * waveAmp;

                    // Radial push based on wave
                    if (distFromCenter > 1) {
                        const radialX = x / distFromCenter;
                        const radialY = y / distFromCenter;
                        vx += radialX * waveDisplacement * 0.3;
                        vy += radialY * waveDisplacement * 0.3;
                    }

                    // Gentle swirl pattern (compute tangent locally)
                    const waveDist = Math.max(distFromCenter, 0.1);
                    const waveTangentX = -y / waveDist;
                    const waveTangentY = x / waveDist;
                    vx += waveTangentX * 0.5;
                    vy += waveTangentY * 0.5;

                    vx *= this.DAMPING;
                    vy *= this.DAMPING;

                    // Audio-reactive brightness
                    opacities[i] = 0.4 + this.amplitude * 0.6;
                    sizes[i] = (2.5 + this.amplitude * 4);
                    break;
                }

                case 'reform':
                    // Spring physics for smooth reassembly
                    const dx = tx - x;
                    const dy = ty - y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Normalize progress (0-1 over reformDuration)
                    const reformProgress = Math.min(1, stateTime / (this.config.reformDuration / 1000));

                    // Increase spring stiffness as we progress
                    const stiffness = this.SPRING_STIFFNESS * (1 + reformProgress * 3);

                    // Add spiral effect (perpendicular force that decays)
                    const spiralEffect = Math.max(0, 1 - reformProgress) * 0.03;

                    // Spring force + spiral
                    vx += dx * stiffness + dy * spiralEffect * distance * 0.1;
                    vy += dy * stiffness - dx * spiralEffect * distance * 0.1;

                    // Damping
                    vx *= this.DAMPING;
                    vy *= this.DAMPING;

                    // Snap when very close
                    if (distance < 1 && reformProgress > 0.8) {
                        positions[idx] = tx;
                        positions[idx + 1] = ty;
                        vx = 0;
                        vy = 0;
                    }

                    // Fade back in
                    opacities[i] = 0.3 + reformProgress * 0.7;
                    break;
            }

            // Apply velocity
            x += vx;
            y += vy;

            // Store updated values
            positions[idx] = x;
            positions[idx + 1] = y;
            velocities[idx] = vx;
            velocities[idx + 1] = vy;
        }

        // Mark attributes for update
        (this.particles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        (this.particles.geometry.attributes.opacity as THREE.BufferAttribute).needsUpdate = true;
        (this.particles.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    }

    private render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    // Public state control methods
    setState(newState: CinematicParticleState): void {
        if (this.state !== newState) {
            this.state = newState;
            this.stateStartTime = this.time;
        }
    }

    setAmplitude(amplitude: number): void {
        this.amplitude = Math.max(0, Math.min(1, amplitude));
    }

    getState(): CinematicParticleState {
        return this.state;
    }

    isReformComplete(): boolean {
        if (this.state !== 'reform') return false;
        const stateTime = this.time - this.stateStartTime;
        return stateTime >= this.config.reformDuration / 1000;
    }

    // Explicit state triggers
    triggerExplode(): void {
        this.setState('explode');
    }

    triggerVortex(): void {
        this.setState('vortex');
    }

    triggerWaveform(): void {
        this.setState('waveform');
    }

    triggerReform(): void {
        this.setState('reform');
    }

    triggerIdle(): void {
        this.setState('idle');
    }

    // Cleanup
    dispose(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.particles) {
            this.particles.geometry.dispose();
            (this.particles.material as THREE.Material).dispose();
            this.scene.remove(this.particles);
        }
        this.renderer.dispose();
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
    }

    resize(width: number, height: number): void {
        const aspect = width / height;
        const frustumSize = height;

        this.camera.left = (-frustumSize * aspect) / 2;
        this.camera.right = (frustumSize * aspect) / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = -frustumSize / 2;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }
}

export type { ParticleState } from './useParticleSystem';
