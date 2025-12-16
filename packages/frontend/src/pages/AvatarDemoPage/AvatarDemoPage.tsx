import React, { useState, useRef } from 'react';
import { HolographicAvatar, AvatarAnimationState } from '../../components/HolographicAvatar/HolographicAvatar';
import { ZenaAnimated2D, Expression } from '../../components/ZenaAnimated2D';
import './AvatarDemoPage.css';

const STATES: AvatarAnimationState[] = ['idle', 'listening', 'speaking', 'thinking'];
const EXPRESSIONS: Expression[] = ['neutral', 'happy', 'thinking', 'listening', 'laughing'];

// Sample audio URL for testing lip sync
const TEST_AUDIO_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

export const AvatarDemoPage: React.FC = () => {
    const [animationState, setAnimationState] = useState<AvatarAnimationState>('idle');
    const [showNew, setShowNew] = useState(true);
    const [currentExpression, setCurrentExpression] = useState<Expression>('neutral');
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const cycleState = () => {
        const currentIndex = STATES.indexOf(animationState);
        const nextIndex = (currentIndex + 1) % STATES.length;
        setAnimationState(STATES[nextIndex]);
    };

    const toggleAudio = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div className="avatar-demo-page">
            <div className="avatar-demo-content">
                <h1>Avatar Animation Prototype</h1>

                {/* Toggle between old and new avatar */}
                <div className="avatar-toggle">
                    <button
                        className={!showNew ? 'active' : ''}
                        onClick={() => setShowNew(false)}
                    >
                        Old (HolographicAvatar)
                    </button>
                    <button
                        className={showNew ? 'active' : ''}
                        onClick={() => setShowNew(true)}
                    >
                        NEW (ZenaAnimated2D) ✨
                    </button>
                </div>

                <p className="state-label">
                    {showNew ? (
                        <>Expression: <strong>{currentExpression.toUpperCase()}</strong></>
                    ) : (
                        <>Current State: <strong>{animationState.toUpperCase()}</strong></>
                    )}
                </p>

                <div className="avatar-stage">
                    {showNew ? (
                        <ZenaAnimated2D
                            audioSource={audioRef.current}
                            expression={currentExpression}
                            enableLipSync={true}
                            enableBlinking={true}
                            sizePreset="default"
                            size={400}
                        />
                    ) : (
                        <HolographicAvatar
                            animationState={animationState}
                            sizePreset="default"
                            size={400}
                        />
                    )}
                </div>

                <div className="controls">
                    {showNew ? (
                        /* New avatar controls - expressions and audio test */
                        <div className="new-avatar-controls">
                            {/* Expression buttons */}
                            <div className="expression-buttons">
                                <p>Expressions:</p>
                                <div className="button-row">
                                    {EXPRESSIONS.map((expr) => (
                                        <button
                                            key={expr}
                                            className={`expression-button ${currentExpression === expr ? 'active' : ''}`}
                                            onClick={() => setCurrentExpression(expr)}
                                        >
                                            {expr === 'happy' && '😊 '}
                                            {expr === 'laughing' && '😄 '}
                                            {expr === 'thinking' && '🤔 '}
                                            {expr === 'listening' && '👂 '}
                                            {expr === 'neutral' && '😐 '}
                                            {expr.charAt(0).toUpperCase() + expr.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Audio controls */}
                            <div className="audio-controls">
                                <audio ref={audioRef} src={TEST_AUDIO_URL} crossOrigin="anonymous" />
                                <button
                                    className={`audio-button ${isPlaying ? 'playing' : ''}`}
                                    onClick={toggleAudio}
                                >
                                    {isPlaying ? '⏹️ Stop Audio' : '▶️ Play Audio (Test Lip Sync)'}
                                </button>
                                <p className="audio-hint">
                                    Play audio to see the mouth animate in sync!
                                    Eyes blink automatically every 2-6 seconds.
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* Old avatar controls */
                        <>
                            <div className="state-buttons">
                                {STATES.map((state) => (
                                    <button
                                        key={state}
                                        className={`state-button ${animationState === state ? 'active' : ''}`}
                                        onClick={() => setAnimationState(state)}
                                    >
                                        {state.charAt(0).toUpperCase() + state.slice(1)}
                                    </button>
                                ))}
                            </div>

                            <button className="cycle-button" onClick={cycleState}>
                                Cycle States →
                            </button>
                        </>
                    )}

                    <div className="size-demo">
                        <p>Size Presets:</p>
                        <div className="mini-demo">
                            {showNew ? (
                                <ZenaAnimated2D
                                    expression={currentExpression}
                                    sizePreset="mini"
                                    enableBlinking={true}
                                />
                            ) : (
                                <HolographicAvatar
                                    animationState="idle"
                                    sizePreset="mini"
                                />
                            )}
                            <span>Mini (80px)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
