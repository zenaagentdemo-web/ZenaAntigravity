import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XPEvent, GAME_COLORS } from '../GameSystem';
import './XPPopup.css';

interface XPPopupProps {
    event: XPEvent | null;
    onComplete?: () => void;
}

export const XPPopup: React.FC<XPPopupProps> = ({ event, onComplete }) => {
    if (!event) return null;

    const hasMultiplier = event.multiplier > 1;

    return (
        <AnimatePresence>
            <motion.div
                key={event.id}
                className="xp-popup"
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.8 }}
                onAnimationComplete={() => {
                    setTimeout(() => onComplete?.(), 1500);
                }}
            >
                <div className="xp-popup__content">
                    <span className="xp-popup__amount">
                        +{event.totalXP} XP
                    </span>
                    {hasMultiplier && (
                        <span className="xp-popup__multiplier">
                            ({event.multiplier.toFixed(1)}x)
                        </span>
                    )}
                    {event.description && (
                        <span className="xp-popup__desc">{event.description}</span>
                    )}
                </div>

                {/* Particle effects */}
                <div className="xp-popup__particles">
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="xp-popup__particle"
                            initial={{ x: 0, y: 0, opacity: 1 }}
                            animate={{
                                x: (Math.random() - 0.5) * 100,
                                y: -Math.random() * 60 - 20,
                                opacity: 0
                            }}
                            transition={{ duration: 0.8, delay: i * 0.05 }}
                        />
                    ))}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

// Container for managing multiple popups
interface XPPopupQueueProps {
    events: XPEvent[];
    onEventComplete?: (eventId: string) => void;
}

export const XPPopupQueue: React.FC<XPPopupQueueProps> = ({ events, onEventComplete }) => {
    return (
        <div className="xp-popup-queue">
            <AnimatePresence>
                {events.slice(0, 3).map((event, index) => (
                    <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{
                            opacity: 1,
                            x: 0,
                            y: index * 60
                        }}
                        exit={{ opacity: 0, x: 50 }}
                        transition={{ duration: 0.3 }}
                    >
                        <XPPopup
                            event={event}
                            onComplete={() => onEventComplete?.(event.id)}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default XPPopup;
