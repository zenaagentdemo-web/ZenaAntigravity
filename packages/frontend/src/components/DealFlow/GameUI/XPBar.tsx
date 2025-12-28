import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, GAME_COLORS } from '../GameSystem';
import './XPBar.css';

interface XPBarProps {
    compact?: boolean;
    showSessionXP?: boolean;
}

export const XPBar: React.FC<XPBarProps> = ({ compact = false, showSessionXP = true }) => {
    const {
        level,
        levelTitle,
        xpProgress,
        xpToNextLevel,
        totalXP,
        sessionXP,
        dailyStreak,
        getCurrentMultiplier
    } = useGameStore();

    const [showLevelUp, setShowLevelUp] = useState(false);
    const [displayedXP, setDisplayedXP] = useState(totalXP);
    const prevLevelRef = useRef(level);
    const multiplier = getCurrentMultiplier();

    // Animate XP counter
    useEffect(() => {
        const diff = totalXP - displayedXP;
        if (diff > 0) {
            const steps = Math.min(20, diff);
            const increment = Math.ceil(diff / steps);
            const interval = setInterval(() => {
                setDisplayedXP(prev => Math.min(prev + increment, totalXP));
            }, 50);
            return () => clearInterval(interval);
        }
    }, [totalXP]);

    // Level up detection
    useEffect(() => {
        if (level > prevLevelRef.current) {
            setShowLevelUp(true);
            setTimeout(() => setShowLevelUp(false), 3000);
        }
        prevLevelRef.current = level;
    }, [level]);

    if (compact) {
        return (
            <div className="xp-bar-compact">
                <div className="xp-bar-compact__level">Lv.{level}</div>
                <div className="xp-bar-compact__bar">
                    <motion.div
                        className="xp-bar-compact__fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${xpProgress}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="xp-bar-container">
                {/* Level Badge */}
                <div className="xp-bar__level-badge">
                    <span className="xp-bar__level-number">{level}</span>
                    <span className="xp-bar__level-title">{levelTitle}</span>
                </div>

                {/* Main XP Bar */}
                <div className="xp-bar__main">
                    <div className="xp-bar__track">
                        <motion.div
                            className="xp-bar__fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${xpProgress}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            style={{
                                background: `linear-gradient(90deg, ${GAME_COLORS.xpBar}, #00ffaa)`,
                                boxShadow: `0 0 20px ${GAME_COLORS.xpBarGlow}`
                            }}
                        />
                        <div className="xp-bar__glow" style={{ width: `${xpProgress}%` }} />
                    </div>

                    <div className="xp-bar__info">
                        <span className="xp-bar__xp-text">
                            {displayedXP.toLocaleString()} XP
                        </span>
                        <span className="xp-bar__next-level">
                            {xpToNextLevel.toLocaleString()} to Lv.{level + 1}
                        </span>
                    </div>
                </div>

                {/* Multiplier & Streak */}
                <div className="xp-bar__bonuses">
                    {dailyStreak > 0 && (
                        <div className="xp-bar__streak">
                            🔥 {dailyStreak} Day{dailyStreak > 1 ? 's' : ''}
                        </div>
                    )}
                    {multiplier > 1 && (
                        <div className="xp-bar__multiplier">
                            ⚡ {multiplier.toFixed(1)}x
                        </div>
                    )}
                </div>

                {/* Session XP */}
                {showSessionXP && sessionXP > 0 && (
                    <motion.div
                        className="xp-bar__session"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        +{sessionXP.toLocaleString()} XP today
                    </motion.div>
                )}
            </div>

            {/* Level Up Celebration */}
            <AnimatePresence>
                {showLevelUp && (
                    <motion.div
                        className="level-up-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="level-up-content"
                            initial={{ scale: 0, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 10 }}
                            transition={{ type: 'spring', damping: 15 }}
                        >
                            <div className="level-up-burst" />
                            <div className="level-up-icon">🎉</div>
                            <h2 className="level-up-title">LEVEL UP!</h2>
                            <div className="level-up-level">Level {level}</div>
                            <div className="level-up-title-new">{levelTitle}</div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default XPBar;
