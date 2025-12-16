import React, { memo, useState, useEffect, useRef } from 'react';
import { ParticleField } from '../ParticleField/ParticleField';
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
    /** Legacy prop for backwards compatibility */
    isSpeaking?: boolean;
    /** Enable particle field (default: true for non-mini sizes) */
    enableParticles?: boolean;
    /** Disable gradient/glow background effects (for transparent look like mini avatar) */
    noBackground?: boolean;
}

const SIZE_MAP: Record<AvatarSize, number | undefined> = {
    mini: 80,
    default: 300,
    fullscreen: undefined, // Uses CSS responsive sizing
};

export const HolographicAvatar: React.FC<HolographicAvatarProps> = memo(({
    animationState,
    sizePreset = 'default',
    size,
    className = '',
    onClick,
    isSpeaking,
    enableParticles,
    noBackground = false,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    // Device capabilities for adaptive performance
    const { prefersReducedMotion, recommendedParticleCount, isLowPower } = useDeviceCapabilities();

    // Backwards compatibility: isSpeaking prop maps to speaking/idle state
    const effectiveState: AvatarAnimationState = animationState ?? (isSpeaking ? 'speaking' : 'idle');

    // Determine size
    const effectiveSize = size ?? SIZE_MAP[sizePreset];

    // Determine if particles should be enabled (respect device capabilities)
    const showParticles = enableParticles !== undefined
        ? (enableParticles && !prefersReducedMotion)
        : (sizePreset !== 'mini' && !prefersReducedMotion);

    // Calculate particle count based on device and size
    const particleCount = sizePreset === 'fullscreen'
        ? Math.min(800, recommendedParticleCount * 1.5)
        : Math.min(400, recommendedParticleCount);

    // Track container dimensions for particle field
    useEffect(() => {
        if (!containerRef.current || !showParticles) return;

        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDimensions({ width: rect.width, height: rect.height });
            }
        };

        updateDimensions();

        const resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, [showParticles]);

    // Handle image load
    const handleImageLoad = () => {
        setImageLoaded(true);
        setImageError(false);
    };

    const handleImageError = () => {
        setImageError(true);
        setImageLoaded(false);
    };

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

    // Build avatar class names
    const avatarClasses = [
        'holographic-avatar',
        `holographic-avatar--${effectiveState}`,
        !imageLoaded && 'holographic-avatar--loading',
    ].filter(Boolean).join(' ');

    // Aria label based on state
    const ariaLabelMap: Record<AvatarAnimationState, string> = {
        idle: 'Zena AI Avatar - Idle',
        listening: 'Zena AI Avatar - Listening',
        speaking: 'Zena AI Avatar - Speaking',
        thinking: 'Zena AI Avatar - Thinking',
    };

    return (
        <div
            ref={containerRef}
            className={containerClasses}
            style={effectiveSize ? { width: effectiveSize, height: effectiveSize } : undefined}
            role="img"
            aria-label={ariaLabelMap[effectiveState]}
            onClick={onClick}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
        >
            {/* SVG Filter for subtle shimmer/waviness effect */}
            <svg className="holographic-avatar__svg-filters" aria-hidden="true">
                <defs>
                    <filter id="hair-shimmer-filter" x="-10%" y="-10%" width="120%" height="120%">
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.015"
                            numOctaves="2"
                            seed="5"
                            result="noise"
                        >
                            <animate
                                attributeName="baseFrequency"
                                values="0.015;0.02;0.015"
                                dur="8s"
                                repeatCount="indefinite"
                            />
                        </feTurbulence>
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="noise"
                            scale="3"
                            xChannelSelector="R"
                            yChannelSelector="G"
                        />
                    </filter>
                </defs>
            </svg>

            {/* Loading skeleton */}
            {!imageLoaded && !imageError && (
                <div className="holographic-avatar__loading-skeleton" aria-hidden="true">
                    <div className="holographic-avatar__loading-pulse" />
                </div>
            )}

            {/* Error fallback */}
            {imageError && (
                <div className="holographic-avatar__error" aria-hidden="true">
                    <span className="holographic-avatar__error-icon">🤖</span>
                </div>
            )}

            {/* Particle field behind avatar */}
            {showParticles && dimensions.width > 0 && imageLoaded && (
                <ParticleField
                    animationState={effectiveState}
                    width={dimensions.width}
                    height={dimensions.height}
                    particleCount={particleCount}
                    reducedMotion={prefersReducedMotion}
                />
            )}

            {/* Avatar image */}
            <img
                src="/assets/zena-avatar-v2.png"
                alt="Zena AI Avatar"
                className={avatarClasses}
                draggable={false}
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{
                    position: 'relative',
                    zIndex: 2,
                    opacity: imageLoaded ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                }}
            />
        </div>
    );
});

HolographicAvatar.displayName = 'HolographicAvatar';
