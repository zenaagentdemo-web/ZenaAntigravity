import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useGodotBridge } from './useGodotBridge';
import type { AvatarState, AnimationPlan, VisemeCue } from './types';
import './GodotAvatar.css';

interface GodotAvatarProps {
    /** URL to the exported Godot index.html */
    godotUrl?: string;
    /** Width of the avatar container */
    width?: number | string;
    /** Height of the avatar container */
    height?: number | string;
    /** Called when avatar is ready */
    onReady?: () => void;
    /** Called when speaking finishes */
    onSpeakingFinished?: () => void;
    /** Called when state changes */
    onStateChange?: (oldState: AvatarState, newState: AvatarState) => void;
    /** Optional className for styling */
    className?: string;
    /** Show loading state */
    showLoading?: boolean;
}

/**
 * GodotAvatar Component
 *
 * Embeds the Godot-rendered 2D puppet avatar and provides control methods.
 * This is separate from the existing ZenaAvatar (CSS-based) component.
 *
 * @example
 * const avatarRef = useRef<GodotAvatarHandle>(null);
 *
 * <GodotAvatar
 *   ref={avatarRef}
 *   godotUrl="/godot/index.html"
 *   onReady={() => console.log('Ready!')}
 * />
 *
 * // Control the avatar
 * avatarRef.current?.setState('speaking');
 * avatarRef.current?.setExpression('confident', 0.8);
 */

export interface GodotAvatarHandle {
    setState: (state: AvatarState) => void;
    setExpression: (expression: string, intensity?: number) => void;
    playVisemes: (visemes: VisemeCue[]) => void;
    playAnimationPlan: (plan: AnimationPlan) => void;
    triggerBlink: () => void;
    lookAt: (x: number, y: number) => void;
    setAmplitude: (amplitude: number) => void;
    startSpeaking: (expression: string, intensity?: number, visemes?: VisemeCue[]) => void;
    stopSpeaking: () => void;
    isReady: boolean;
    currentState: AvatarState;
}

export const GodotAvatar = React.forwardRef<GodotAvatarHandle, GodotAvatarProps>(
    (
        {
            godotUrl = '/godot/index.html',
            width = 400,
            height = 400,
            onReady,
            onSpeakingFinished,
            onStateChange,
            className = '',
            showLoading = true,
        },
        ref
    ) => {
        const iframeRef = useRef<HTMLIFrameElement>(null);
        const [isLoading, setIsLoading] = useState(true);

        const bridge = useGodotBridge(iframeRef, {
            onReady: () => {
                setIsLoading(false);
                onReady?.();
            },
            onSpeakingFinished,
            onStateChange,
        });

        // Expose methods via ref
        React.useImperativeHandle(
            ref,
            () => ({
                setState: bridge.setState,
                setExpression: bridge.setExpression,
                playVisemes: bridge.playVisemes,
                playAnimationPlan: bridge.playAnimationPlan,
                triggerBlink: bridge.triggerBlink,
                lookAt: bridge.lookAt,
                setAmplitude: bridge.setAmplitude,
                startSpeaking: bridge.startSpeaking,
                stopSpeaking: bridge.stopSpeaking,
                isReady: bridge.isReady,
                currentState: bridge.currentState,
            }),
            [bridge]
        );

        const containerStyle: React.CSSProperties = {
            width: typeof width === 'number' ? `${width}px` : width,
            height: typeof height === 'number' ? `${height}px` : height,
        };

        return (
            <div className={`godot-avatar-container ${className}`} style={containerStyle}>
                {showLoading && isLoading && (
                    <div className="godot-avatar-loading">
                        <div className="godot-avatar-loading-spinner" />
                        <span>Loading Zena...</span>
                    </div>
                )}
                <iframe
                    ref={iframeRef}
                    src={godotUrl}
                    className="godot-avatar-iframe"
                    title="Zena Avatar"
                    allow="autoplay"
                    style={{
                        opacity: isLoading ? 0 : 1,
                        transition: 'opacity 0.3s ease',
                    }}
                />
            </div>
        );
    }
);

GodotAvatar.displayName = 'GodotAvatar';

export default GodotAvatar;
