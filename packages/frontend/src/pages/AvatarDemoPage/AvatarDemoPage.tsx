import React, { useState, useRef } from 'react';
import { HolographicAvatar, AvatarAnimationState } from '../../components/HolographicAvatar/HolographicAvatar';
import { ZenaAnimated2D } from '../../components/ZenaAnimated2D';
import { EXPRESSION_CATEGORIES, HeadPose } from '../../components/ZenaAnimated2D/constants';
import './AvatarDemoPage.css';

const STATES: AvatarAnimationState[] = ['idle', 'listening', 'speaking', 'thinking'];

// Sample audio URL for testing lip sync
const TEST_AUDIO_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

// Head pose options
const HEAD_POSES: { value: HeadPose; label: string; emoji: string }[] = [
    { value: 'straight', label: 'Straight', emoji: '⬆️' },
    { value: 'tilt-left', label: 'Tilt Left', emoji: '↖️' },
    { value: 'tilt-right', label: 'Tilt Right', emoji: '↗️' },
    { value: 'look-up', label: 'Look Up', emoji: '👆' },
];

// Expression category emojis
const CATEGORY_EMOJIS: Record<string, string> = {
    playful: '😏',
    confident: '😎',
    analytical: '🤔',
    empathy: '🥺',
    stress: '😰',
    reaction: '😮',
    positive: '😊',
    vulnerable: '💔',
};

export const AvatarDemoPage: React.FC = () => {
    const [animationState, setAnimationState] = useState<AvatarAnimationState>('idle');
    const [showNew, setShowNew] = useState(true);
    const [currentExpression, setCurrentExpression] = useState<string>('neutral');
    const [currentPose, setCurrentPose] = useState<HeadPose>('straight');
    const [selectedCategory, setSelectedCategory] = useState<string>('playful');
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

    // Cycle through expressions automatically
    const cycleExpressions = () => {
        const allExpressions = Object.values(EXPRESSION_CATEGORIES).flat();
        const currentIndex = allExpressions.indexOf(currentExpression);
        const nextIndex = (currentIndex + 1) % allExpressions.length;
        setCurrentExpression(allExpressions[nextIndex]);
    };

    return (
        <div className="avatar-demo-page">
            <div className="avatar-demo-content">
                <h1>🎭 Zena Expression Gallery</h1>
                <p className="subtitle">62 expressions • 4 head poses • Cortana-inspired personality</p>

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
                        <>
                            Expression: <strong>{currentExpression}</strong>
                            {currentPose !== 'straight' && <> • Pose: <strong>{currentPose}</strong></>}
                        </>
                    ) : (
                        <>Current State: <strong>{animationState.toUpperCase()}</strong></>
                    )}
                </p>

                <div className="avatar-stage">
                    {showNew ? (
                        <ZenaAnimated2D
                            audioSource={audioRef.current}
                            expression={currentExpression}
                            headPose={currentPose}
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
                        <div className="new-avatar-controls">
                            {/* Head Pose Selector */}
                            <div className="pose-selector">
                                <p>Head Pose:</p>
                                <div className="button-row">
                                    {HEAD_POSES.map((pose) => (
                                        <button
                                            key={pose.value}
                                            className={`pose-button ${currentPose === pose.value ? 'active' : ''}`}
                                            onClick={() => setCurrentPose(pose.value)}
                                        >
                                            {pose.emoji} {pose.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Category Tabs */}
                            <div className="category-tabs">
                                <p>Expression Category:</p>
                                <div className="button-row category-row">
                                    {Object.keys(EXPRESSION_CATEGORIES).map((category) => (
                                        <button
                                            key={category}
                                            className={`category-button ${selectedCategory === category ? 'active' : ''}`}
                                            onClick={() => setSelectedCategory(category)}
                                        >
                                            {CATEGORY_EMOJIS[category]} {category}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Expressions in selected category */}
                            <div className="expression-buttons">
                                <p>{CATEGORY_EMOJIS[selectedCategory]} {selectedCategory} expressions:</p>
                                <div className="button-row expression-row">
                                    {EXPRESSION_CATEGORIES[selectedCategory as keyof typeof EXPRESSION_CATEGORIES]?.map((expr) => (
                                        <button
                                            key={expr}
                                            className={`expression-button ${currentExpression === expr ? 'active' : ''}`}
                                            onClick={() => setCurrentExpression(expr)}
                                        >
                                            {expr.replace(/-/g, ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="quick-actions">
                                <button className="cycle-button" onClick={cycleExpressions}>
                                    ⏭️ Cycle All Expressions
                                </button>
                                <button
                                    className="random-button"
                                    onClick={() => {
                                        const allExpressions = Object.values(EXPRESSION_CATEGORIES).flat();
                                        const randomExpr = allExpressions[Math.floor(Math.random() * allExpressions.length)];
                                        const poses: HeadPose[] = ['straight', 'tilt-left', 'tilt-right', 'look-up'];
                                        const randomPose = poses[Math.floor(Math.random() * poses.length)];
                                        setCurrentExpression(randomExpr);
                                        setCurrentPose(randomPose);
                                    }}
                                >
                                    🎲 Random Expression + Pose
                                </button>
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
                            </div>
                        </div>
                    ) : (
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
                                    headPose={currentPose}
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
