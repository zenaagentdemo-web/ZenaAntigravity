/**
 * ZenaCoachingPanel - AI coaching insight with Power Move suggestion
 */

import React from 'react';
import { Deal } from '../../types';
import { DealIntelligence } from '../../ZenaIntelligence/ZenaIntelligenceEngine';
import { BrainCircuit } from 'lucide-react';
import './sections.css';

interface ZenaCoachingPanelProps {
    intelligence: DealIntelligence;
    deal: Deal;
    onStartZenaLive?: (dealId: string) => void;
}

export const ZenaCoachingPanel: React.FC<ZenaCoachingPanelProps> = ({
    intelligence,
    deal,
    onStartZenaLive,
}) => {
    const { coachingInsight, suggestedPowerMove, needsLiveSession } = intelligence;

    // Don't show if no coaching insight
    if (!coachingInsight && !suggestedPowerMove) {
        return null;
    }

    const handleStartZenaLive = () => {
        if (onStartZenaLive) {
            onStartZenaLive(deal.id);
        }
    };

    return (
        <div className="section-card section-card--zena">
            <div className="section-card__header">
                <BrainCircuit className="zena-icon-tech" strokeWidth={1.5} />
                <span className="section-card__title">Zena Intelligence</span>
            </div>

            {coachingInsight && (
                <div className="zena-coaching__insight">
                    <img src="/assets/icons/lightbulb_premium.png" alt="Insight" className="zena-coaching__premium-icon" />
                    <p className="zena-coaching__insight-text">
                        "{coachingInsight}"
                    </p>
                </div>
            )}

            {suggestedPowerMove && (
                <div className="zena-coaching__power-move">
                    <div className="zena-coaching__power-move-header">
                        <img src="/assets/icons/lightning_bolt_premium.png" alt="Power Move" className="zena-coaching__premium-icon--bolt" />
                        <span className="zena-coaching__power-move-label">Power Move</span>
                    </div>
                    <div className="zena-coaching__power-move-headline">
                        {suggestedPowerMove.headline}
                    </div>
                </div>
            )}

            <div className="zena-coaching__actions">
                {needsLiveSession && onStartZenaLive && (
                    <button
                        className="zena-coaching__live-btn"
                        onClick={handleStartZenaLive}
                    >
                        <span>🧠</span>
                        <span>Start Zena Live Session</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default ZenaCoachingPanel;
