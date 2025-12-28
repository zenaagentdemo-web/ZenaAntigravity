/**
 * PowerPulse - Visual health indicator for deals
 * 
 * Displays a pulsing glow effect based on deal health score.
 * No numbers shown - agents "feel" the health through visual feedback.
 */

import React from 'react';
import { motion } from 'framer-motion';
import './PowerPulse.css';

interface PowerPulseProps {
    healthScore: number; // 0-100
    size?: 'small' | 'medium' | 'large';
    showBar?: boolean;
    className?: string;
}

/**
 * Get colour based on health score
 */
function getHealthColour(score: number): string {
    if (score >= 80) return '#00ff41'; // Bright green - healthy
    if (score >= 60) return '#00f3ff'; // Cyan - good
    if (score >= 40) return '#ffd700'; // Gold - warning
    if (score >= 20) return '#ff9500'; // Orange - concerning
    return '#ff003c'; // Red - critical
}

/**
 * Get pulse intensity based on health
 */
function getPulseIntensity(score: number): number {
    if (score >= 80) return 0.3;
    if (score >= 60) return 0.4;
    if (score >= 40) return 0.5;
    if (score >= 20) return 0.7;
    return 1.0; // Maximum pulse for critical deals
}

export const PowerPulse: React.FC<PowerPulseProps> = ({
    healthScore,
    size = 'medium',
    showBar = true,
    className = '',
}) => {
    const colour = getHealthColour(healthScore);
    const intensity = getPulseIntensity(healthScore);
    const fillPercent = Math.max(5, healthScore);

    // Determine animation speed - faster for critical deals
    const pulseDuration = healthScore >= 60 ? 2 : healthScore >= 40 ? 1.5 : 1;

    return (
        <div className={`power-pulse power-pulse--${size} ${className}`}>
            {showBar && (
                <div className="power-pulse__bar">
                    <motion.div
                        className="power-pulse__fill"
                        style={{
                            background: `linear-gradient(90deg, ${colour}40, ${colour})`,
                            boxShadow: `0 0 ${10 * intensity}px ${colour}`,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${fillPercent}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                    <motion.div
                        className="power-pulse__glow"
                        style={{
                            background: colour,
                            left: `${fillPercent}%`,
                        }}
                        animate={{
                            opacity: [0.4, 1, 0.4],
                            scale: [0.8, 1.2, 0.8],
                        }}
                        transition={{
                            duration: pulseDuration,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                </div>
            )}

            {/* Ambient glow effect for the whole card */}
            <motion.div
                className="power-pulse__ambient"
                style={{
                    background: `radial-gradient(circle, ${colour}20 0%, transparent 70%)`,
                }}
                animate={{
                    opacity: [0.3 * intensity, 0.6 * intensity, 0.3 * intensity],
                }}
                transition={{
                    duration: pulseDuration * 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
        </div>
    );
};

export default PowerPulse;
