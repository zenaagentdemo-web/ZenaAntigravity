import React, { memo, useState, useEffect, useRef } from 'react';
import { ParticleField } from '../ParticleField/ParticleField';
import { ParticleAvatar, ParticleState } from '../ParticleAvatar';
import { useDeviceCapabilities } from '../../hooks/useDeviceCapabilities';
import './HolographicAvatar.css';

export type AvatarAnimationState = 'idle' | 'listening' | 'speaking' | 'thinking';
export type AvatarSize = 'mini' | 'default' | 'fullscreen';

interface HolographicAvatarProps {
    /** Current animation state of the avatar */
    animationState?: AvatarAnimationState;
    /** Size preset: mini (80px), default (300px), fullscreen (responsive) */
    sizePreset?: AvatarSize;
    /** Custom size in pixels (overrides sizePreset if provided) */
    size?: number;
    /** Additional CSS class names */
    className?: string;
    /** Click handler (for mini avatar navigation) */
    onClick?: () => void;
    /** Audio amplitude for particle reactivity (applied when speaking) */
    amplitude?: number;
    /** Legacy prop for backwards compatibility */
    isSpeaking?: boolean;
    /** Enable particle field (default: true for non-mini sizes) */
    enableParticles?: boolean;
    /** Disable gradient/glow background effects (for transparent look like mini avatar) */
    noBackground?: boolean;
    /** Image source for the particle avatar */
    imageSrc?: string;
}

const SIZE_MAP: Record<AvatarSize, number | undefined> = {
    mini: 80,
    default: 300,
    fullscreen: undefined, // Uses CSS responsive sizing
};

/**
 * Map animation state to particle state
 */
const mapToParticleState = (state: AvatarAnimationState): ParticleState => {
    switch (state) {
        case 'listening':
            return 'explode';
        case 'speaking':
        case 'thinking':
            return 'swirl';
        case 'idle':
        default:
            return 'idle';
    }
};

export const HolographicAvatar: React.FC<HolographicAvatarProps> = memo(({
    animationState,
    sizePreset = 'default',
    size,
    amplitude = 0,
    className = '',
    onClick,
    isSpeaking,
    enableParticles,
    noBackground = false,
    imageSrc,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [previousState, setPreviousState] = useState<AvatarAnimationState>('idle');

    // Device capabilities for adaptive performance
    const { prefersReducedMotion, recommendedParticleCount, isLowPower } = useDeviceCapabilities();

    // Backwards compatibility: isSpeaking prop maps to speaking/idle state
    const effectiveState: AvatarAnimationState = animationState ?? (isSpeaking ? 'speaking' : 'idle');

    // Determine size
    const effectiveSize = size ?? SIZE_MAP[sizePreset] ?? 300;

    // Determine if background particles should be enabled (respect device capabilities)
    const showParticles = enableParticles !== undefined
        ? (enableParticles && !prefersReducedMotion)
        : (sizePreset !== 'mini' && !prefersReducedMotion);

    // Calculate particle count based on device and size - reduced by 25%
    const particleCount = sizePreset === 'fullscreen'
        ? Math.min(1125, recommendedParticleCount * 1.875)  // 1500 * 0.75 = 1125
        : Math.min(600, recommendedParticleCount * 1.125);  // 800 * 0.75 = 600

    // Track state transitions to trigger reform
    useEffect(() => {
        if (effectiveState === 'idle' && previousState !== 'idle') {
            // Transition to reform before settling to idle
            // This is handled by ParticleAvatar internally
        }
        setPreviousState(effectiveState);
    }, [effectiveState, previousState]);


    // Build container class names
    const containerClasses = [
        'holographic-avatar-container',
        sizePreset === 'mini' && 'holographic-avatar-container--mini',
        sizePreset === 'fullscreen' && 'holographic-avatar-container--fullscreen',
        noBackground && 'holographic-avatar-container--no-background',
        onClick && 'holographic-avatar-container--clickable',
        isLowPower && 'holographic-avatar-container--low-power',
        className,
    ].filter(Boolean).join(' ');

    // Aria label based on state
    const ariaLabelMap: Record<AvatarAnimationState, string> = {
        idle: 'Zena AI Avatar - Idle',
        listening: 'Zena AI Avatar - Listening',
        speaking: 'Zena AI Avatar - Speaking',
        thinking: 'Zena AI Avatar - Thinking',
    };

    // Map to particle state
    const particleState = mapToParticleState(effectiveState);

    return (
        <div
            ref={containerRef}
            className={containerClasses}
            style={{ width: effectiveSize, height: effectiveSize }}
            role="img"
            aria-label={ariaLabelMap[effectiveState]}
            onClick={onClick}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
        >
            {/* Background particle field - Expanded size for 'whipping' effect */}
            {showParticles && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: effectiveSize * 2.5,
                    height: effectiveSize * 2.5,
                    pointerEvents: 'none',
                    zIndex: 0,
                    // Radial gradient mask to completely fade edges - no visible boundary
                    maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 20%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0) 70%)',
                    WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 20%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0) 70%)',
                }}>
                    <ParticleField
                        animationState={effectiveState}
                        width={effectiveSize * 2.5}
                        height={effectiveSize * 2.5}
                        particleCount={particleCount}
                        reducedMotion={prefersReducedMotion}
                    />
                </div>
            )}

            {/* Particle Avatar (static image + particle explosion) */}
            <ParticleAvatar
                state={particleState}
                amplitude={amplitude}
                size={effectiveSize}
                particleCount={prefersReducedMotion ? 200 : 500}
                imageSrc={imageSrc}
            />
        </div>
    );
});

HolographicAvatar.displayName = 'HolographicAvatar';
