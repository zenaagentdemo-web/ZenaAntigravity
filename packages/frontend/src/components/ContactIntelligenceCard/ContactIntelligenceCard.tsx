import React, { useEffect, useState } from 'react';
import { Users, Zap, MessageSquare, ArrowRight, Shield, AlertTriangle } from 'lucide-react';
import { useContactIntelligence } from '../DealFlow/ZenaIntelligence/ZenaIntelligenceEngine';
import './ContactIntelligenceCard.css';

interface ContactIntelligenceCardProps {
    contactId: string;
    contactName: string;
    compact?: boolean;
}

export const ContactIntelligenceCard: React.FC<ContactIntelligenceCardProps> = ({
    contactId,
    contactName,
    compact = false
}) => {
    const { intelligence, loading, refresh } = useContactIntelligence(contactId);

    // Auto-refresh when mounted
    useEffect(() => {
        refresh();
    }, [contactId]);

    if (loading) {
        return (
            <div className="contact-intel-card contact-intel-card--loading">
                <Zap size={16} className="zena-zap-pulse" />
                <span>Analyzing relationship dynamics...</span>
            </div>
        );
    }

    if (!intelligence) return null;

    const hasRisk = intelligence.relationshipHealth < 50;
    const isInsufficient = intelligence.motivation.includes('Insufficient data') || intelligence.motivation === 'Unknown';

    if (isInsufficient) {
        return (
            <div className={`contact-intel-card contact-intel-card--empty ${compact ? 'contact-intel-card--compact' : ''}`}>
                <div className="contact-intel-card__header">
                    <div className="contact-intel-card__title">
                        <Shield size={14} className="intel-icon" />
                        <span>Intelligence Status</span>
                    </div>
                </div>

                <div className="contact-intel-card__body">
                    <div className="contact-intel-card__insight">
                        <span className="label">AWAITING DATA</span>
                        <p className="value">Insufficient history to generate insights.</p>
                    </div>

                    <div className="contact-intel-card__action action--prompt">
                        <div className="action-header">
                            <span>SUGGESTED ACTION</span>
                        </div>
                        <p className="action-text">Log a call, add a note, or link an email to activate Zena.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`contact-intel-card ${hasRisk ? 'contact-intel-card--risk' : ''} ${compact ? 'contact-intel-card--compact' : ''}`}>
            <div className="contact-intel-card__header">
                <div className="contact-intel-card__title">
                    <Users size={14} className="intel-icon" />
                    <span>Relationship Intelligence</span>
                </div>
                <div className="contact-intel-card__score" data-score={intelligence.relationshipHealth}>
                    {intelligence.relationshipHealth}% Strength
                </div>
            </div>

            <div className="contact-intel-card__body">
                <div className="contact-intel-card__insight">
                    <span className="label">CORE MOTIVATION</span>
                    <p className="value">{intelligence.motivation}</p>
                </div>

                {intelligence.recommendedNextStep && (
                    <div className="contact-intel-card__action">
                        <div className="action-header">
                            <Zap size={12} fill="#38bdf8" color="#38bdf8" />
                            <span>RECOMMENDED POWER MOVE</span>
                        </div>
                        <p className="action-text">{intelligence.recommendedNextStep}</p>
                        <div className="action-footer">
                            <span className="reasoning">Why: {intelligence.strategicAdvice?.split('.')[0] || 'Build momentum'}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
