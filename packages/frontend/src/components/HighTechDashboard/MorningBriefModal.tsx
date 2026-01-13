import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    X,
    Calendar,
    MessageSquare,
    AlertTriangle,
    ArrowRight,
    Play
} from 'lucide-react';
import './MorningBriefModal.css';

interface MorningBriefModalProps {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
    metrics: {
        focusThreads: number;
        waitingThreads: number;
        atRiskDeals: number;
    };
    topAppointment?: {
        time: string;
        title: string;
        location?: string;
    };
    onStartLive?: () => void;
}

export const MorningBriefModal: React.FC<MorningBriefModalProps> = ({
    isOpen,
    onClose,
    userName,
    metrics,
    topAppointment,
    onStartLive
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setIsVisible(true), 100);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            <div className="morning-brief-overlay">
                <motion.div
                    className="morning-brief-modal"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                    {/* Futuristic Border/glow */}
                    <div className="morning-brief-modal__glow" />

                    <header className="morning-brief-modal__header">
                        <div className="morning-brief-modal__title-row">
                            <Sparkles className="morning-brief-modal__icon" size={24} />
                            <div>
                                <h2 className="morning-brief-modal__title">Chief of Staff Brief</h2>
                                <p className="morning-brief-modal__greeting">Good morning, {userName}</p>
                            </div>
                        </div>
                        <button className="morning-brief-modal__close" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </header>

                    <div className="morning-brief-modal__content">
                        {/* Summary Metrics */}
                        <div className="morning-brief-modal__metrics-grid">
                            <div className="morning-brief-metric-card">
                                <MessageSquare size={18} className="metric-icon--cyan" />
                                <div className="morning-brief-metric-value">{metrics.focusThreads}</div>
                                <div className="morning-brief-metric-label">Focus Threads</div>
                            </div>
                            <div className="morning-brief-metric-card">
                                <AlertTriangle size={18} className="metric-icon--magenta" />
                                <div className="morning-brief-metric-value">{metrics.atRiskDeals}</div>
                                <div className="morning-brief-metric-label">At-Risk Deals</div>
                            </div>
                        </div>

                        {/* Top Priority */}
                        {topAppointment && (
                            <div className="morning-brief-priority-card">
                                <div className="priority-card__header">
                                    <Calendar size={16} />
                                    <span>NEXT PRIORITY</span>
                                </div>
                                <div className="priority-card__body">
                                    <div className="priority-time">{topAppointment.time}</div>
                                    <div className="priority-title">{topAppointment.title}</div>
                                    {topAppointment.location && (
                                        <div className="priority-location">{topAppointment.location}</div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="morning-brief-modal__coaching">
                            <p>Zena has audited your pipeline. You have {metrics.focusThreads} urgent replies and {metrics.atRiskDeals} stalled deals needing immediate strategy.</p>
                        </div>
                    </div>

                    <footer className="morning-brief-modal__footer">
                        <button className="morning-brief-btn--secondary" onClick={onClose}>
                            Dismiss
                        </button>
                        <button className="morning-brief-btn--primary" onClick={() => {
                            const prompt = encodeURIComponent("Give me my morning brief. I want a high-energy, proactive update. Tell me about my new emails, at-risk deals, and today's priorities. I know you've already prepared some drafts for me—let's hear your plan!");
                            window.location.href = `/ask-zena?mode=handsfree&prompt=${prompt}&context=morning_brief&t=${Date.now()}`;
                        }}>
                            <Play size={14} fill="currentColor" />
                            Start Zena Live
                        </button>
                    </footer>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};
