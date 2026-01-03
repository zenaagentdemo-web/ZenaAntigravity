/**
 * OracleBadge Component
 * 
 * Displays personality prediction and maturity level on contact cards.
 * Shows DISC type with confidence, communication tips, and propensity indicators.
 */

import React, { useState } from 'react';
import { Brain, TrendingUp, TrendingDown, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import './OracleBadge.css';

interface OraclePrediction {
    maturityLevel: number;
    maturityLabel: string;
    personalityType: string | null;
    personalityConfidence: number | null;
    communicationTips: string[];
    sellProbability: number | null;
    buyProbability: number | null;
    churnRisk: number | null;
    dataPoints: {
        emailsAnalyzed: number;
        eventsCount: number;
        monthsActive: number;
    };
}

interface OracleBadgeProps {
    contactId: string;
    prediction?: OraclePrediction | null;
    compact?: boolean;
    onAnalyze?: () => void;
}

const PERSONALITY_INFO: Record<string, {
    name: string;
    emoji: string;
    color: string;
    description: string;
}> = {
    D: {
        name: 'Dominance',
        emoji: '🎯',
        color: '#ef4444',
        description: 'Direct, results-oriented'
    },
    I: {
        name: 'Influence',
        emoji: '✨',
        color: '#f59e0b',
        description: 'Enthusiastic, people-focused'
    },
    S: {
        name: 'Steadiness',
        emoji: '🤝',
        color: '#10b981',
        description: 'Patient, supportive'
    },
    C: {
        name: 'Conscientiousness',
        emoji: '📊',
        color: '#3b82f6',
        description: 'Analytical, detail-oriented'
    }
};

const MATURITY_INFO: Record<number, {
    label: string;
    emoji: string;
    color: string;
}> = {
    0: { label: 'Learning', emoji: '🔍', color: '#6b7280' },
    1: { label: 'Observing', emoji: '📡', color: '#8b5cf6' },
    2: { label: 'Profiling', emoji: '🧠', color: '#06b6d4' },
    3: { label: 'Predicting', emoji: '🔮', color: '#10b981' }
};

export const OracleBadge: React.FC<OracleBadgeProps> = ({
    contactId,
    prediction,
    compact = false,
    onAnalyze
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleAnalyze = async () => {
        if (onAnalyze) {
            setIsAnalyzing(true);
            try {
                await onAnalyze();
            } finally {
                setIsAnalyzing(false);
            }
        }
    };

    // If no prediction, show learning state
    if (!prediction) {
        return (
            <div className="oracle-badge oracle-badge--learning">
                <div className="oracle-badge__icon">
                    <Loader2 className="animate-spin" size={14} />
                </div>
                {!compact && (
                    <span className="oracle-badge__text">Learning...</span>
                )}
            </div>
        );
    }

    const maturityInfo = MATURITY_INFO[prediction.maturityLevel] || MATURITY_INFO[0];
    const personalityInfo = prediction.personalityType
        ? PERSONALITY_INFO[prediction.personalityType]
        : null;

    // Compact mode: just show personality type or maturity
    if (compact) {
        if (personalityInfo) {
            return (
                <div
                    className="oracle-badge oracle-badge--compact"
                    style={{ '--badge-color': personalityInfo.color } as React.CSSProperties}
                    title={`${personalityInfo.name} (${Math.round((prediction.personalityConfidence || 0) * 100)}%)`}
                >
                    <span className="oracle-badge__emoji">{personalityInfo.emoji}</span>
                    <span className="oracle-badge__type">{prediction.personalityType}</span>
                </div>
            );
        }
        // Hide the "learning" badge in compact mode (the magnifying glass icon)
        return null;
    }

    // Full mode: show complete prediction info
    return (
        <div
            className="oracle-badge oracle-badge--full"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            {/* Maturity Level */}
            <div
                className="oracle-badge__maturity"
                style={{ '--badge-color': maturityInfo.color } as React.CSSProperties}
            >
                <span className="oracle-badge__emoji">{maturityInfo.emoji}</span>
                <span className="oracle-badge__label">{maturityInfo.label}</span>
            </div>

            {/* Personality Type */}
            {personalityInfo && (
                <div
                    className="oracle-badge__personality"
                    style={{ '--badge-color': personalityInfo.color } as React.CSSProperties}
                >
                    <Brain size={14} />
                    <span className="oracle-badge__type">{prediction.personalityType}</span>
                    <span className="oracle-badge__confidence">
                        {Math.round((prediction.personalityConfidence || 0) * 100)}%
                    </span>
                </div>
            )}

            {/* Propensity Indicators */}
            {(prediction.sellProbability || prediction.buyProbability) && (
                <div className="oracle-badge__propensity">
                    {prediction.sellProbability && (
                        <div className="oracle-badge__signal oracle-badge__signal--sell">
                            <TrendingUp size={12} />
                            <span>{Math.round(prediction.sellProbability * 100)}% sell</span>
                        </div>
                    )}
                    {prediction.buyProbability && (
                        <div className="oracle-badge__signal oracle-badge__signal--buy">
                            <TrendingDown size={12} />
                            <span>{Math.round(prediction.buyProbability * 100)}% buy</span>
                        </div>
                    )}
                </div>
            )}

            {/* Churn Warning */}
            {prediction.churnRisk && prediction.churnRisk > 0.5 && (
                <div className="oracle-badge__churn">
                    <AlertCircle size={12} />
                    <span>Churn risk</span>
                </div>
            )}

            {/* Tooltip with details */}
            {showTooltip && (
                <div className="oracle-badge__tooltip">
                    <div className="oracle-badge__tooltip-header">
                        <Sparkles size={14} />
                        <span>Oracle Insights</span>
                    </div>

                    {personalityInfo && (
                        <div className="oracle-badge__tooltip-section">
                            <strong>{personalityInfo.emoji} {personalityInfo.name}</strong>
                            <p>{personalityInfo.description}</p>
                            {prediction.communicationTips.length > 0 && (
                                <ul className="oracle-badge__tips">
                                    {prediction.communicationTips.slice(0, 3).map((tip, i) => (
                                        <li key={i}>💡 {tip}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    <div className="oracle-badge__tooltip-section oracle-badge__tooltip-data">
                        <span>📧 {prediction.dataPoints.emailsAnalyzed} emails analyzed</span>
                        <span>📅 {prediction.dataPoints.monthsActive} months active</span>
                    </div>

                    {onAnalyze && (
                        <button
                            className="oracle-badge__analyze-btn"
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                        >
                            {isAnalyzing ? <Loader2 className="animate-spin" size={12} /> : <Brain size={12} />}
                            Re-analyze
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default OracleBadge;
