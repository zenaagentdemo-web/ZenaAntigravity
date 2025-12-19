import React, { useRef, useEffect, useState, memo } from 'react';
import { HologramParticleEngine, HologramState } from './HologramParticleEngine';
import './ParticleAvatar.css';

// Re-export for backward compatibility
export type ParticleState = 'idle' | 'explode' | 'swirl' | 'reform';

export interface ParticleAvatarProps {
    imageSrc?: string;
    state?: ParticleState;
    amplitude?: number;
    particleCount?: number;
    size?: number;
    className?: string;
    onClick?: () => void;
}

/**
 * Map legacy particle states to new hologram states
 */
const mapToHologramState = (state: ParticleState, amplitude: number): HologramState => {
    switch (state) {
        case 'explode':
            return 'dissolve';
        case 'swirl':
            return amplitude > 0.1 ? 'waveform' : 'vortex';
        case 'reform':
            return 'reform';
        case 'idle':
        default:
            return 'idle';
    }
};

/**
 * Hollywood-Quality Hologram Particle Avatar
 * 
 * Features:
 * - True image-to-particle dissolve (each particle carries image color)
 * - Noise-based holographic disintegration (800ms)
 * - Double helix vortex with holographic tint
 * - Dramatic 100px 3D depth movement
 * - Spring-based spiral reform (800ms)
 */
export const ParticleAvatar: React.FC<ParticleAvatarProps> = memo(({
    imageSrc = '/assets/zena-particle-base.jpg',
    state = 'idle',
    amplitude = 0,
    particleCount = 1500,
    size = 300,
    className = '',
    onClick,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<HologramParticleEngine | null>(null);
    const [showFlash, setShowFlash] = useState(false);
    const [engineReady, setEngineReady] = useState(false);
    const [isDissolving, setIsDissolving] = useState(false);
    const [isGlitching, setIsGlitching] = useState(false);
    const prevStateRef = useRef<ParticleState>('idle');

    // Random glitch effect (like ZenaHighTechAvatar)
    useEffect(() => {
        const triggerGlitch = () => {
            if (state === 'idle') {
                setIsGlitching(true);
                setTimeout(() => setIsGlitching(false), 150 + Math.random() * 150);
            }
        };

        const interval = setInterval(triggerGlitch, 5000);
        return () => clearInterval(interval);
    }, [state]);

    // Initialize Hologram Engine
    useEffect(() => {
        if (!containerRef.current) return;

        const engine = new HologramParticleEngine(
            containerRef.current,
            particleCount,
            size
        );

        engineRef.current = engine;

        engine.initializeFromImage(imageSrc)
            .then(() => {
                setEngineReady(true);
            })
            .catch(console.error);

        return () => {
            engine.dispose();
            engineRef.current = null;
        };
    }, [imageSrc, particleCount, size]);

    // Handle state transitions
    useEffect(() => {
        if (!engineReady || !engineRef.current) return;
        const engine = engineRef.current;

        // Trigger dissolve with flash
        if (state === 'explode' && prevStateRef.current !== 'explode') {
            setShowFlash(true);
            setIsDissolving(true);
            engine.triggerDissolve();

            // Flash animation
            const flashTimer = setTimeout(() => setShowFlash(false), 400);

            // Auto-transition to vortex after dissolve completes
            const vortexTimer = setTimeout(() => {
                if (engineRef.current) {
                    engineRef.current.triggerVortex();
                }
            }, 850); // 800ms dissolve + small buffer

            prevStateRef.current = state;
            return () => {
                clearTimeout(flashTimer);
                clearTimeout(vortexTimer);
            };
        }

        // Swirl state - vortex or waveform based on amplitude
        if (state === 'swirl') {
            const hologramState = mapToHologramState(state, amplitude);
            if (hologramState === 'waveform') {
                engine.triggerWaveform();
            } else {
                engine.triggerVortex();
            }
        }

        // Reform state
        if (state === 'reform') {
            engine.triggerReform();

            // After reform completes, mark as no longer dissolving
            const reformTimer = setTimeout(() => {
                setIsDissolving(false);
            }, 850);

            prevStateRef.current = state;
            return () => clearTimeout(reformTimer);
        }

        // Idle state
        if (state === 'idle') {
            if (prevStateRef.current !== 'idle' && prevStateRef.current !== 'reform') {
                // Need to reform first
                engine.triggerReform();
                const idleTimer = setTimeout(() => {
                    if (engineRef.current) {
                        engineRef.current.triggerIdle();
                        setIsDissolving(false);
                    }
                }, 850);
                prevStateRef.current = state;
                return () => clearTimeout(idleTimer);
            } else {
                engine.triggerIdle();
                setIsDissolving(false);
            }
        }

        prevStateRef.current = state;
    }, [state, engineReady]);

    // Update amplitude for audio reactivity
    useEffect(() => {
        if (engineRef.current && engineReady) {
            engineRef.current.setAmplitude(amplitude);
        }
    }, [amplitude, engineReady]);

    const containerClasses = [
        'particle-avatar',
        `particle-avatar--${state}`,
        showFlash ? 'particle-avatar--flashing' : '',
        engineReady ? 'particle-avatar--hologram-active' : '',
        isDissolving ? 'particle-avatar--dissolved' : '',
        isGlitching ? 'particle-avatar--glitching' : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div
            ref={containerRef}
            className={containerClasses}
            style={{ width: size, height: size }}
            onClick={onClick}
            role={onClick ? 'button' : 'img'}
            tabIndex={onClick ? 0 : undefined}
            aria-label="Zena AI Hologram Avatar"
        >
            {/* Holographic Glow Layer */}
            <div className="particle-avatar__ambient-glow" />

            {/* Static Image Layer - Only visible when idle and not dissolved */}
            <div className="particle-avatar__image-wrapper">
                <img
                    src={imageSrc}
                    alt="Zena AI"
                    className="particle-avatar__image"
                />
            </div>

            {/* WebGL canvas is injected by HologramParticleEngine into containerRef */}

            {/* Cinematic Flash Overlay */}
            <div className="particle-avatar__flash-overlay" />

            {/* Holographic Energy Ripple */}
            <div className="particle-avatar__energy-ripple" />

            {/* Scanline Shimmer */}
            <div className="particle-avatar__shimmer" />

            {/* Hologram Grid Overlay (during vortex) */}
            <div className="particle-avatar__hologram-grid" />

            {/* Glitch Slice Overlay */}
            <div className="particle-avatar__glitch-slice" />
        </div>
    );
});

ParticleAvatar.displayName = 'ParticleAvatar';
