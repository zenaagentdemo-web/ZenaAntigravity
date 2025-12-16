import React, { useEffect, useState } from 'react';
import { useLipSync } from './useLipSync';
import { useBlinking } from './useBlinking';
import { useExpressions, getExpressionClasses } from './useExpressions';
import { Expression, Viseme, VISEME_ASSETS, EXPRESSION_ASSETS, EYE_ASSETS } from './constants';
import './ZenaAnimated2D.css';

export interface ZenaAnimated2DProps {
    /** Audio element to sync lip movements with */
    audioSource?: HTMLAudioElement | null;
    /** Current expression state */
    expression?: Expression;
    /** Enable lip sync animation */
    enableLipSync?: boolean;
    /** Enable automatic blinking */
    enableBlinking?: boolean;
    /** Size preset */
    sizePreset?: 'mini' | 'default' | 'fullscreen';
    /** Custom size in pixels */
    size?: number;
    /** Additional CSS class */
    className?: string;
    /** Click handler */
    onClick?: () => void;
    /** Show holographic glow effect */
    showGlow?: boolean;
}

/**
 * 2D Animated Zena Avatar with real-time lip sync
 * 
 * Features:
 * - Real-time lip sync based on audio amplitude (6 viseme mouth shapes)
 * - Automatic eye blinking with image overlay
 * - Expression support (neutral, happy, thinking, listening, laughing)
 * - Idle breathing and floating animations
 */
export const ZenaAnimated2D: React.FC<ZenaAnimated2DProps> = ({
    audioSource = null,
    expression = 'neutral',
    enableLipSync = true,
    enableBlinking = true,
    sizePreset = 'default',
    size,
    className = '',
    onClick,
    showGlow = true,
}) => {
    // Hooks for animation states
    const { currentViseme, isActive } = useLipSync({
        audioElement: audioSource,
        enabled: enableLipSync
    });
    const { eyeState } = useBlinking({ enabled: enableBlinking });
    const { currentExpression } = useExpressions({ initialExpression: expression });

    // Preload all images
    const [imagesLoaded, setImagesLoaded] = useState(false);

    useEffect(() => {
        const allVisemes: Viseme[] = ['rest', 'aa', 'oh', 'ee', 'mm', 'ff'];
        const allExpressions: Expression[] = ['neutral', 'happy', 'thinking', 'listening', 'laughing'];

        const visemePromises = allVisemes.map(v => {
            return new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => resolve();
                img.src = VISEME_ASSETS[v];
            });
        });

        const expressionPromises = allExpressions.map(e => {
            return new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => resolve();
                img.src = EXPRESSION_ASSETS[e];
            });
        });

        // Preload eyes closed image
        const eyesClosedPromise = new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = EYE_ASSETS.closed;
        });

        Promise.all([...visemePromises, ...expressionPromises, eyesClosedPromise])
            .then(() => setImagesLoaded(true));
    }, []);

    // Sync expression changes from props
    useEffect(() => {
        // Expression is handled via useExpressions hook
    }, [expression]);

    // Build class names
    const containerClasses = [
        'zena-animated',
        `zena-animated--${sizePreset}`,
        getExpressionClasses(currentExpression),
        isActive ? 'zena-animated--speaking' : '',
        className,
    ].filter(Boolean).join(' ');

    // Custom size style
    const customStyle = size ? {
        width: `${size}px`,
        height: `${size}px`
    } : undefined;

    // Get current expression image (full face) 
    const expressionSrc = EXPRESSION_ASSETS[currentExpression] || EXPRESSION_ASSETS.neutral;

    return (
        <div
            className={containerClasses}
            style={customStyle}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {/* Holographic glow background */}
            {showGlow && <div className="zena-animated__glow" />}

            {/* Expression face layer - switches based on current expression */}
            <img
                src={expressionSrc}
                alt="Zena AI Avatar"
                className="zena-animated__layer zena-animated__base"
                draggable={false}
            />

            {/* Mouth layers - only one visible based on current viseme */}
            {imagesLoaded && (
                <>
                    {Object.entries(VISEME_ASSETS).map(([viseme, src]) => (
                        <img
                            key={viseme}
                            src={src}
                            alt=""
                            className={`zena-animated__layer zena-animated__mouth ${currentViseme === viseme ? 'zena-animated__mouth--active' : ''
                                }`}
                            draggable={false}
                        />
                    ))}
                </>
            )}

            {/* Eye blink overlay - shows eyes closed image when blinking */}
            {imagesLoaded && eyeState === 'closed' && (
                <img
                    src={EYE_ASSETS.closed}
                    alt=""
                    className="zena-animated__layer zena-animated__eyes-overlay"
                    draggable={false}
                />
            )}
        </div>
    );
};

export default ZenaAnimated2D;
