/**
 * AskZenaImmersive - Immersive full-screen Ask Zena experience
 * Features voice-reactive HolographicAvatar with particle effects
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HolographicAvatar } from '../../components/HolographicAvatar/HolographicAvatar';
import { useAvatarAnimationState } from '../../hooks/useAvatarAnimationState';
import './AskZenaPage.immersive.css';

interface AskZenaImmersiveProps {
    /** Optional: render in embedded mode (no back button, smaller size) */
    embedded?: boolean;
}

export const AskZenaImmersive: React.FC<AskZenaImmersiveProps> = ({ embedded = false }) => {
    const navigate = useNavigate();
    const [inputValue, setInputValue] = useState('');

    // Voice-reactive animation state
    const {
        animationState,
        setAnimationState,
        amplitude,
        isVoiceActive,
        startListening,
        stopListening,
    } = useAvatarAnimationState({
        enableVoiceReactivity: true,
        initialState: 'idle',
    });

    // Get greeting based on time of day
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    }, []);

    // Get status message based on state
    const statusMessage = useMemo(() => {
        switch (animationState) {
            case 'listening':
                return isVoiceActive ? 'I hear you...' : 'Listening...';
            case 'speaking':
                return 'Speaking...';
            case 'thinking':
                return 'Thinking...';
            default:
                return 'How can I help you today?';
        }
    }, [animationState, isVoiceActive]);

    // Handle listen button click
    const handleListenToggle = useCallback(async () => {
        if (animationState === 'listening' || animationState === 'speaking') {
            stopListening();
        } else {
            const success = await startListening();
            if (!success) {
                console.error('Failed to start listening - microphone permission denied?');
            }
        }
    }, [animationState, startListening, stopListening]);

    // Handle text submit
    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        // Simulate thinking state
        setAnimationState('thinking');

        // For demo - reset after 2 seconds
        setTimeout(() => {
            setAnimationState('speaking');
            setTimeout(() => {
                setAnimationState('idle');
            }, 3000);
        }, 2000);

        setInputValue('');
    }, [inputValue, setAnimationState]);

    // Generate audio visualizer bars based on amplitude
    const audioVisualizerBars = useMemo(() => {
        const barCount = 12;
        const bars = [];

        for (let i = 0; i < barCount; i++) {
            // Create natural wave pattern
            const baseHeight = Math.sin((i / barCount) * Math.PI) * 0.5 + 0.5;
            const amplitudeEffect = amplitude * (0.5 + Math.random() * 0.5);
            const height = Math.max(4, baseHeight * amplitudeEffect * 40);

            bars.push(
                <div
                    key={i}
                    className="ask-zena-page__audio-bar"
                    style={{ height: `${height}px` }}
                />
            );
        }

        return bars;
    }, [amplitude]);

    return (
        <div className={`ask-zena-page--immersive ${embedded ? 'ask-zena-page--embedded' : ''}`}>
            {/* Header with back button */}
            {!embedded && (
                <div className="ask-zena-page__immersive-header">
                    <button
                        className="ask-zena-page__back-btn"
                        onClick={() => navigate(-1)}
                    >
                        ← Back
                    </button>
                </div>
            )}

            {/* Avatar Stage */}
            <div className="ask-zena-page__avatar-stage">
                <HolographicAvatar
                    animationState={animationState}
                    sizePreset="fullscreen"
                    size={embedded ? 300 : 450}
                    enableParticles={true}
                />

                {/* Status Text */}
                <div className="ask-zena-page__status">
                    <h2 className="ask-zena-page__greeting">{greeting}</h2>
                    <p className="ask-zena-page__status-text">{statusMessage}</p>

                    {/* Audio Visualizer */}
                    {(animationState === 'listening' || animationState === 'speaking') && (
                        <div className="ask-zena-page__audio-visualizer">
                            {audioVisualizerBars}
                        </div>
                    )}
                </div>
            </div>

            {/* Voice Controls */}
            <div className="ask-zena-page__voice-controls">
                <button
                    className={`ask-zena-page__listen-btn ${animationState === 'listening' || animationState === 'speaking'
                        ? 'ask-zena-page__listen-btn--active'
                        : ''
                        }`}
                    onClick={handleListenToggle}
                    aria-label={animationState === 'listening' ? 'Stop listening' : 'Start listening'}
                >
                    {animationState === 'listening' ? '🎙️' : '🎤'}
                </button>

                <span className="ask-zena-page__listen-hint">
                    {animationState === 'listening'
                        ? 'Tap to stop'
                        : 'Tap to speak'}
                </span>

                {/* Text input fallback */}
                <div className="ask-zena-page__text-input-container">
                    <form onSubmit={handleSubmit}>
                        <div className="ask-zena-page__text-input-wrapper">
                            <input
                                type="text"
                                className="ask-zena-page__text-input"
                                placeholder="Or type your question..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="ask-zena-page__send-btn-immersive"
                                disabled={!inputValue.trim()}
                            >
                                ➤
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AskZenaImmersive;
