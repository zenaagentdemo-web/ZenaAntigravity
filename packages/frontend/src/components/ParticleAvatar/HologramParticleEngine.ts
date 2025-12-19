/**
 * HologramParticleEngine - Hollywood-Quality Image-to-Particle Dissolve
 * 
 * Each pixel of the image becomes a particle that carries its color.
 * Features:
 * - Texture sampling: particles sample color from original image texture
 * - Noise-based dissolve: organic holographic disintegration (800ms)  
 * - Double helix vortex: particles swirl in 3D with holographic tint
 * - Dramatic 100px Z-depth movement for 3D hologram effect
 * - Spring-based reform: particles spiral back carrying their colors
 */

import * as THREE from 'three';
import { SimplexNoise } from './noise';

export type HologramState = 'idle' | 'scan' | 'swarm' | 'pulse' | 'reform' | 'vortex' | 'waveform' | 'dissolve' | 'explode';

// Vertex shader with Cinematic Lifecycle V4.0
const hologramVertexShader = `
    // Per-particle attributes
    attribute vec2 aUv;
    attribute float aNoiseValue;
    attribute vec3 aTargetPos;
    
    // Uniforms
    uniform float uProgress;
    uniform float uTime;
    uniform float uZDepth;
    uniform int uState;
    uniform float uAmplitude;
    uniform float uSize;
    uniform float uHelixSpeed;
    uniform float uPulsate;
    uniform float uFlash;
    uniform float uHologramTint;  // 0 = Photo, 1 = Hologram
    
    varying vec2 vUv;
    varying float vDissolveAmount;
    varying float vOpacity;
    varying float vPulsate;
    varying float vFlash;
    varying float vHologramTint;
    
    // Improved 3D Noise helpers
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    vec3 curlNoise(vec3 p) {
        const float e = 0.1;
        float n1 = snoise(vec3(p.x, p.y + e, p.z));
        float n2 = snoise(vec3(p.x, p.y - e, p.z));
        float n3 = snoise(vec3(p.x, p.y, p.z + e));
        float n4 = snoise(vec3(p.x, p.y, p.z - e));
        float n5 = snoise(vec3(p.x + e, p.y, p.z));
        float n6 = snoise(vec3(p.x - e, p.y, p.z));
        return vec3(n1 - n2, n3 - n4, n5 - n6);
    }

    void main() {
        vUv = aUv;
        vec3 pos = position;
        vOpacity = 1.0;
        vPulsate = uPulsate;
        vFlash = uFlash;
        vHologramTint = uHologramTint;
        
        float dissolveThreshold = aNoiseValue;
        vDissolveAmount = smoothstep(dissolveThreshold - 0.05, dissolveThreshold + 0.05, uProgress);
        
        // STATE 0: IDLE (Photo)
        if (uState == 0) {
            // Subtle breathing only
            pos.y += sin(uTime * 0.5 + aNoiseValue * 6.28) * 1.0;
        }
        
        // STATE 1: SCAN (Hologram Build-up)
        else if (uState == 1) {
            // Horizontal line displacement
            float scanLine = sin(aUv.y * 100.0 + uTime * 10.0);
            pos.x += scanLine * uProgress * 5.0;
            // Flicker
            vOpacity = 0.8 + 0.2 * sin(uTime * 50.0);
        }

        // STATE 2: SWARM (Thinking - Persistent dispersion)
        else if (uState == 2 || uState == 3) {
            float time = uTime * 0.3;
            vec3 swarmPos = pos * 0.002 + vec3(time, time * 0.8, time * 1.2);
            vec3 flow = curlNoise(swarmPos);
            pos += flow * 3.0;
            
            // Pulse state specific boost
            if (uState == 3) {
                pos += flow * uPulsate * 2.0;
            }
            
            pos.z += flow.z * uZDepth;
            vOpacity = 0.7 + uPulsate * 0.3;
        }

        // STATE 4: REFORM
        else if (uState == 4) {
            pos = mix(aTargetPos, pos, 1.0 - uProgress);
            vOpacity = uProgress;
        }
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        float sizeBoost = 1.0 + uFlash * 10.0;
        gl_PointSize = (uSize * sizeBoost + uPulsate * 3.0) * (500.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;


const hologramFragmentShader = `
    uniform sampler2D uImageTexture;
    uniform int uState;
    uniform float uTime;
    uniform float uHologramTint;
    
    varying vec2 vUv;
    varying float vOpacity;
    varying float vPulsate;
    varying float vHologramTint;
    
    void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        float alpha = 1.0 - smoothstep(0.35, 0.5, dist);
        
        if (alpha < 0.01) discard;
        
        vec4 imageColor = texture2D(uImageTexture, vUv);
        vec3 color = imageColor.rgb;
        
        // V4.0 Cinematic Tinting
        // 0 = Photo, 1 = Hologram
        float tintAmount = vHologramTint;
        
        // Cyan-white tech tint
        vec3 techColor = vec3(0.1, 0.8, 1.0);
        
        // Pulse state logic (Technical Pulsation)
        if (uState == 3) {
            float pulse = sin(uTime * 4.0 + vUv.x * 5.0) * 0.5 + 0.5;
            techColor = mix(vec3(0.0, 1.0, 1.0), vec3(0.5, 0.0, 1.0), pulse);
            tintAmount = 1.0;
        }
        
        color = mix(color, techColor, tintAmount * 0.6);
        
        // Add glow boost
        float glow = (1.0 - smoothstep(0.0, 0.5, dist)) * (0.2 + vHologramTint * 0.5 + vPulsate * 0.3);
        color += techColor * glow;
        
        gl_FragColor = vec4(color, alpha * vOpacity * imageColor.a);
    }
`;


export class HologramParticleEngine {
    private scene: THREE.Scene;
    private camera: THREE.OrthographicCamera;
    private renderer: THREE.WebGLRenderer;
    private particles: THREE.Points | null = null;
    private imageTexture: THREE.Texture | null = null;
    private noise: SimplexNoise;
    private animationId: number | null = null;
    private time: number = 0;
    private state: HologramState = 'idle';
    private dissolveProgress: number = 0;
    private amplitude: number = 0;
    private stateStartTime: number = 0;

    private readonly PARTICLE_COUNT: number;
    private readonly SIZE: number;
    private readonly Z_DEPTH = 400;  // V2.0: Deeper volume
    private readonly DISSOLVE_DURATION = 800;
    private readonly REFORM_DURATION = 800;

    constructor(container: HTMLElement, particleCount: number = 1500, size: number = 300) {
        this.PARTICLE_COUNT = particleCount;
        this.SIZE = size;
        this.noise = new SimplexNoise();

        // Scene setup
        this.scene = new THREE.Scene();

        // Orthographic camera with depth
        const aspect = 1;
        const frustumSize = size;
        this.camera = new THREE.OrthographicCamera(
            (-frustumSize * aspect) / 2,
            (frustumSize * aspect) / 2,
            frustumSize / 2,
            -frustumSize / 2,
            0.1,
            1000
        );
        this.camera.position.z = 300;

        // WebGL renderer
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            premultipliedAlpha: false,
        });
        this.renderer.setSize(size, size);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);

        container.appendChild(this.renderer.domElement);
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.pointerEvents = 'none';
        this.renderer.domElement.style.zIndex = '10';
    }

    async initializeFromImage(imageSrc: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(
                imageSrc,
                (texture) => {
                    this.imageTexture = texture;
                    this.createParticleSystem(texture);
                    this.startAnimation();
                    resolve();
                },
                undefined,
                (error) => reject(error)
            );
        });
    }

    private createParticleSystem(texture: THREE.Texture): void {
        // Create offscreen canvas to sample image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = this.SIZE;
        canvas.height = this.SIZE;

        const img = texture.image as HTMLImageElement;
        ctx.drawImage(img, 0, 0, this.SIZE, this.SIZE);
        const imageData = ctx.getImageData(0, 0, this.SIZE, this.SIZE);
        const data = imageData.data;

        // Find visible pixels
        const visiblePixels: { x: number; y: number; a: number }[] = [];
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 100) {
                const pixelIndex = i / 4;
                const x = pixelIndex % this.SIZE;
                const y = Math.floor(pixelIndex / this.SIZE);
                visiblePixels.push({ x, y, a: data[i + 3] });
            }
        }

        // Allocate arrays
        const positions = new Float32Array(this.PARTICLE_COUNT * 3);
        const uvs = new Float32Array(this.PARTICLE_COUNT * 2);
        const noiseValues = new Float32Array(this.PARTICLE_COUNT);
        const targetPositions = new Float32Array(this.PARTICLE_COUNT * 3);

        const step = Math.max(1, Math.floor(visiblePixels.length / this.PARTICLE_COUNT));
        const centerX = this.SIZE / 2;
        const centerY = this.SIZE / 2;

        for (let i = 0; i < this.PARTICLE_COUNT; i++) {
            const pixelIdx = Math.min((i * step) % visiblePixels.length, visiblePixels.length - 1);
            const pixel = visiblePixels[pixelIdx] || { x: centerX, y: centerY, a: 255 };

            // Position (centered)
            const x = pixel.x - centerX;
            const y = centerY - pixel.y; // Flip Y for Three.js
            const z = 0;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            targetPositions[i * 3] = x;
            targetPositions[i * 3 + 1] = y;
            targetPositions[i * 3 + 2] = z;

            // UV for texture sampling
            uvs[i * 2] = pixel.x / this.SIZE;
            uvs[i * 2 + 1] = 1.0 - (pixel.y / this.SIZE); // Flip Y

            // Noise value for dissolve timing (0-1)
            noiseValues[i] = this.noise.noise2D(pixel.x * 0.02, pixel.y * 0.02) * 0.5 + 0.5;
        }

        // Create geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('aUv', new THREE.BufferAttribute(uvs, 2));
        geometry.setAttribute('aNoiseValue', new THREE.BufferAttribute(noiseValues, 1));
        geometry.setAttribute('aTargetPos', new THREE.BufferAttribute(targetPositions, 3));

        // Create material
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uImageTexture: { value: texture },
                uProgress: { value: 0.0 },
                uTime: { value: 0.0 },
                uZDepth: { value: this.Z_DEPTH },
                uState: { value: 0 },
                uAmplitude: { value: 0.0 },
                uSize: { value: 4.0 },
                uHelixSpeed: { value: 1.5 },
                uHologramTint: { value: 0.6 },
                uPulsate: { value: 0.0 },
                uFlash: { value: 0.0 },
                uBloom: { value: 0.0 },
            },
            vertexShader: hologramVertexShader,
            fragmentShader: hologramFragmentShader,
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
            this.time += 0.016;
            this.updateProgress();
            this.updateUniforms();
            this.render();
            this.animationId = requestAnimationFrame(animate);
        };
        this.animationId = requestAnimationFrame(animate);
    }

    private updateProgress(): void {
        const elapsed = (this.time - this.stateStartTime) * 1000;

        switch (this.state) {
            case 'dissolve':
                this.dissolveProgress = Math.min(1, elapsed / this.DISSOLVE_DURATION);
                break;
            case 'explode':
                this.dissolveProgress = Math.min(1, elapsed / this.DISSOLVE_DURATION);
                break;
            case 'reform':
                this.dissolveProgress = Math.max(0, 1 - elapsed / this.REFORM_DURATION);
                break;
        }
    }

    private updateUniforms(): void {
        if (!this.particles) return;
        const mat = this.particles.material as THREE.ShaderMaterial;

        mat.uniforms.uTime.value = this.time;
        mat.uniforms.uProgress.value = this.dissolveProgress;
        mat.uniforms.uAmplitude.value = this.amplitude;

        // Periodic pulsation (Heartbeat)
        mat.uniforms.uPulsate.value = 0.5 + Math.sin(this.time * 2.5) * 0.3;

        // V3.0: Flash & Bloom decay
        if (this.state === 'explode') {
            mat.uniforms.uFlash.value = Math.max(0, 1.0 - this.dissolveProgress * 2.0);
            mat.uniforms.uBloom.value = mat.uniforms.uFlash.value * 2.0;
        } else {
            mat.uniforms.uFlash.value = 0;
            mat.uniforms.uBloom.value = 0;
        }

        // Cinematic V4.0 Tinting
        if (this.state === 'idle') {
            mat.uniforms.uHologramTint.value = 0.0;
        } else if (this.state === 'scan' || this.state === 'swarm' || this.state === 'pulse') {
            mat.uniforms.uHologramTint.value = 1.0;
        } else if (this.state === 'reform') {
            mat.uniforms.uHologramTint.value = this.dissolveProgress;
        }

        // Map state to integer
        const stateMap: Record<HologramState, number> = {
            idle: 0,
            scan: 1,
            swarm: 2,
            pulse: 3,
            reform: 4,
            vortex: 10,  // unused in current plan
            waveform: 11, // unused
            dissolve: 12, // unused
            explode: 13,  // unused
        };
        mat.uniforms.uState.value = stateMap[this.state];
    }

    private render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    // Public API
    setState(newState: HologramState): void {
        if (this.state !== newState) {
            this.state = newState;
            this.stateStartTime = this.time;

            if (newState === 'dissolve') {
                this.dissolveProgress = 0;
            } else if (newState === 'reform') {
                this.dissolveProgress = 1;
            }
        }
    }

    setAmplitude(amp: number): void {
        this.amplitude = Math.max(0, Math.min(1, amp));
    }

    triggerScan(): void {
        this.setState('scan');
    }

    triggerSwarm(): void {
        this.setState('swarm');
    }

    triggerPulse(): void {
        this.setState('pulse');
    }

    triggerReform(): void {
        this.setState('reform');
    }

    triggerIdle(): void {
        this.setState('idle');
    }

    triggerDissolve(): void {
        this.setState('dissolve');
    }

    triggerVortex(): void {
        this.setState('vortex');
    }

    triggerWaveform(): void {
        this.setState('waveform');
    }

    getState(): HologramState {
        return this.state;
    }

    isDissolveComplete(): boolean {
        return this.state === 'dissolve' && this.dissolveProgress >= 1;
    }

    isReformComplete(): boolean {
        return this.state === 'reform' && this.dissolveProgress <= 0;
    }

    dispose(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.particles) {
            this.particles.geometry.dispose();
            (this.particles.material as THREE.Material).dispose();
            this.scene.remove(this.particles);
        }
        if (this.imageTexture) {
            this.imageTexture.dispose();
        }
        this.renderer.dispose();
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
    }
}
