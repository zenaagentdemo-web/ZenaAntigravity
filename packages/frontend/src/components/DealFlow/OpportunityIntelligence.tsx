import React from 'react';
import './OpportunityIntelligence.css';

interface OpportunityIntelligenceProps {
    momentum: number;
    topPlays: { id: string; text: string; impact: string }[];
}

export const OpportunityIntelligence: React.FC<OpportunityIntelligenceProps> = ({ momentum, topPlays }) => {
    return (
        <div className="opportunity-intelligence">
            <div className="oi__momentum">
                <div className="oi__momentum-circle">
                    <svg viewBox="0 0 36 36" className="circular-chart">
                        <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="circle" strokeDasharray={`${momentum}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <text x="18" y="20.35" className="percentage">{momentum}%</text>
                    </svg>
                </div>
                <div className="oi__momentum-info">
                    <span className="oi__label">Momentum</span>
                    <span className="oi__status">Strong Velocity</span>
                </div>
            </div>

            <div className="oi__plays">
                <span className="oi__label">Top Plays</span>
                <div className="oi__plays-list">
                    {topPlays.map((play, idx) => (
                        <div key={play.id} className="oi__play-item">
                            <span className="oi__play-rank">{idx + 1}</span>
                            <span className="oi__play-text">{play.text}</span>
                            <span className="oi__play-impact">{play.impact}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="oi__heatmap">
                <span className="oi__label">Pipeline Heatmap</span>
                <div className="oi__heatmap-dots">
                    <div className="oi__heat-dot hot" title="High Conversion"></div>
                    <div className="oi__heat-dot warm"></div>
                    <div className="oi__heat-dot neutral"></div>
                    <div className="oi__heat-dot slow" title="Stuck Deals"></div>
                </div>
            </div>
        </div>
    );
};
