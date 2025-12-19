import { useCallback, useEffect, useRef, useState } from 'react';
import type {
    AvatarState,
    GodotMessage,
    GodotEvent,
    UseGodotBridgeOptions,
    VisemeCue,
    AnimationPlan,
} from './types';

/**
 * Hook for communicating with embedded Godot avatar
 *
 * @example
 * const { isReady, setState, setExpression, playVisemes } = useGodotBridge({
 *   onReady: () => console.log('Avatar loaded'),
 *   onSpeakingFinished: () => console.log('Done speaking'),
 * });
 */
export function useGodotBridge(
    iframeRef: React.RefObject<HTMLIFrameElement | null>,
    options: UseGodotBridgeOptions = {}
) {
    const [isReady, setIsReady] = useState(false);
    const [currentState, setCurrentState] = useState<AvatarState>('idle');
    const optionsRef = useRef(options);

    // Keep options ref updated
    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    // Listen for messages from Godot
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Validate origin if needed
            const data = event.data as GodotEvent;
            if (!data || typeof data.type !== 'string') return;

            switch (data.type) {
                case 'GODOT_READY':
                case 'AVATAR_READY':
                    setIsReady(true);
                    optionsRef.current.onReady?.();
                    break;

                case 'STATE_CHANGED':
                    setCurrentState(data.newState);
                    optionsRef.current.onStateChange?.(data.oldState, data.newState);
                    break;

                case 'SPEAKING_FINISHED':
                case 'VISEMES_FINISHED':
                    optionsRef.current.onSpeakingFinished?.();
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Send message to Godot iframe
    const sendMessage = useCallback(
        (message: GodotMessage) => {
            if (!iframeRef.current?.contentWindow) {
                console.warn('Godot iframe not available');
                return;
            }
            iframeRef.current.contentWindow.postMessage(message, '*');
        },
        [iframeRef]
    );

    // Public API methods
    const setState = useCallback(
        (state: AvatarState) => {
            sendMessage({ type: 'SET_STATE', state });
        },
        [sendMessage]
    );

    const setExpression = useCallback(
        (expression: string, intensity: number = 1.0) => {
            sendMessage({ type: 'SET_EXPRESSION', expression, intensity });
        },
        [sendMessage]
    );

    const playVisemes = useCallback(
        (visemes: VisemeCue[]) => {
            sendMessage({ type: 'PLAY_VISEMES', visemes });
        },
        [sendMessage]
    );

    const playAnimationPlan = useCallback(
        (plan: AnimationPlan) => {
            sendMessage({
                type: 'PLAY_ANIMATION_PLAN',
                emotion: plan.emotion,
                intensity: plan.intensity,
                beats: plan.beats,
                visemes: plan.visemes,
            });
        },
        [sendMessage]
    );

    const triggerBlink = useCallback(() => {
        sendMessage({ type: 'TRIGGER_BLINK' });
    }, [sendMessage]);

    const lookAt = useCallback(
        (x: number, y: number) => {
            sendMessage({ type: 'LOOK_AT', x, y });
        },
        [sendMessage]
    );

    const setAmplitude = useCallback(
        (amplitude: number) => {
            sendMessage({ type: 'SET_AMPLITUDE', amplitude });
        },
        [sendMessage]
    );

    // Combined speaking method
    const startSpeaking = useCallback(
        (expression: string, intensity: number = 1.0, visemes?: VisemeCue[]) => {
            sendMessage({
                type: 'SET_STATE',
                state: 'speaking',
                expression,
                intensity,
                visemes,
            });
        },
        [sendMessage]
    );

    const stopSpeaking = useCallback(() => {
        sendMessage({ type: 'SET_STATE', state: 'idle' });
    }, [sendMessage]);

    return {
        isReady,
        currentState,
        setState,
        setExpression,
        playVisemes,
        playAnimationPlan,
        triggerBlink,
        lookAt,
        setAmplitude,
        startSpeaking,
        stopSpeaking,
    };
}
