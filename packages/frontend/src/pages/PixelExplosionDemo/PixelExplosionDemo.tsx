import React, { useEffect, useRef, useState, useCallback } from 'react';
import { HologramParticleEngine } from '../../components/ParticleAvatar/HologramParticleEngine';
import './PixelExplosionDemo.css';

const PixelExplosionDemo: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<HologramParticleEngine | null>(null);
    const [isThinking, setIsThinking] = useState(false);
    const [isResponding, setIsResponding] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showFlash, setShowFlash] = useState(false);

    const IMAGE_SRC = '/assets/pixel-explosion-demo.jpg';
    const PARTICLE_COUNT = 25000;
    const SIZE = 600;

    useEffect(() => {
        if (!containerRef.current) return;

        console.log('Initializing Pixel Explosion Engine V4.0...');
        const engine = new HologramParticleEngine(
            containerRef.current,
            PARTICLE_COUNT,
            SIZE
        );
        engineRef.current = engine;

        engine.initializeFromImage(IMAGE_SRC)
            .then(() => {
                setLoading(false);
                console.log('Engine initialized with image');
            })
            .catch(err => {
                console.error('Failed to initialize engine:', err);
                setLoading(false);
            });

        return () => {
            engine.dispose();
            engineRef.current = null;
        };
    }, []);

    const handleIgnite = useCallback(() => {
        if (!engineRef.current || isThinking) return;

        setIsThinking(true);

        // 1. Start SCAN (0.5s holographic Build-up)
        engineRef.current.triggerScan();

        // 2. Explode into SWARM after 0.5s
        setTimeout(() => {
            if (engineRef.current) {
                setShowFlash(true);
                setTimeout(() => setShowFlash(false), 800);
                engineRef.current.triggerSwarm();
            }
        }, 500);
    }, [isThinking]);

    const handleSpeechStart = useCallback(() => {
        if (engineRef.current) {
            setIsResponding(true);
            engineRef.current.triggerPulse();
        }
    }, []);

    const handleReset = useCallback(() => {
        if (!engineRef.current) return;

        setIsResponding(false);
        engineRef.current.triggerReform();

        setTimeout(() => {
            if (engineRef.current) {
                setShowFlash(true);
                setTimeout(() => setShowFlash(false), 500);
                engineRef.current.triggerIdle();
                setIsThinking(false);
            }
        }, 1200);
    }, []);

    return (
        <div className={`pixel-demo ${showFlash ? 'pixel-demo--flash' : ''}`}>
            <div className="pixel-demo__background" />

            {showFlash && <div className="pixel-demo__flash-overlay" />}

            <div className="pixel-demo__container">
                <header className="pixel-demo__header">
                    <h1 className="pixel-demo__title">ZENA CORE <span>V4.0</span></h1>
                    <p className="pixel-demo__subtitle">Cinematic Neural Lifecycle</p>
                </header>

                <div className="pixel-demo__stage">
                    <div ref={containerRef} className="pixel-demo__canvas-container" />

                    {loading && (
                        <div className="pixel-demo__loader">
                            <div className="pixel-demo__spinner" />
                            <span>CONNECTING TO ZENA...</span>
                        </div>
                    )}

                    {!isThinking && !loading && (
                        <div className="pixel-demo__image-overlay">
                            <img src={IMAGE_SRC} alt="Zena" />
                        </div>
                    )}
                </div>

                <footer className="pixel-demo__controls">
                    {!isThinking ? (
                        <button
                            className="pixel-demo__enter-btn"
                            onClick={handleIgnite}
                            disabled={loading}
                        >
                            <span className="pixel-demo__enter-btn-text">INITIALIZE SYSTEM</span>
                        </button>
                    ) : (
                        <div className="pixel-demo__action-group">
                            {!isResponding ? (
                                <button
                                    className="pixel-demo__enter-btn"
                                    onClick={handleSpeechStart}
                                >
                                    <span className="pixel-demo__enter-btn-text">START SPEECH</span>
                                </button>
                            ) : (
                                <button
                                    className="pixel-demo__reset-btn"
                                    onClick={handleReset}
                                >
                                    FINISH & RESTORE
                                </button>
                            )}
                        </div>
                    )}
                </footer>

                <div className="pixel-demo__stats">
                    <div className="pixel-demo__stat">
                        <label>NEURAL STATE</label>
                        <span>{isThinking ? (isResponding ? 'RESPONDING' : 'THINKING') : 'IDLE'}</span>
                    </div>
                    <div className="pixel-demo__stat">
                        <label>CORE SYNC</label>
                        <span>{isThinking ? 'Holographic' : 'Standard'}</span>
                    </div>
                </div>
            </div>

            <div className="pixel-demo__grid" />
        </div>
    );
};

export default PixelExplosionDemo;
