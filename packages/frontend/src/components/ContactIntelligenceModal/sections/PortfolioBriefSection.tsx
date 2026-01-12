import React, { useState, useEffect } from 'react';
import { Briefcase, Link2, AlertTriangle, ArrowRight, Zap } from 'lucide-react';
import './PortfolioBriefSection.css';

export interface Dependency {
    fromDealId: string;
    toDealId: string;
    description: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface PortfolioBrief {
    contactId: string;
    strategyType: string;
    summary: string;
    dependencies: Dependency[];
    overallNextStep: string;
    analyzedAt: string;
}

interface PortfolioBriefSectionProps {
    contactId: string;
}

export const PortfolioBriefSection: React.FC<PortfolioBriefSectionProps> = ({ contactId }) => {
    const [brief, setBrief] = useState<PortfolioBrief | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPortfolio = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/contacts/${contactId}/portfolio`);
                if (response.ok) {
                    const data = await response.json();
                    setBrief(data);
                }
            } catch (err) {
                console.error('Failed to fetch portfolio brief:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPortfolio();
    }, [contactId]);

    if (loading) {
        return (
            <div className="portfolio-brief-section loading">
                <Zap size={24} className="zena-zap-pulse" />
                <p>Synthesizing portfolio strategy...</p>
            </div>
        );
    }

    if (!brief) {
        return null; // Don't show if no portfolio detected
    }

    return (
        <div className="portfolio-brief-section">
            <div className="portfolio-brief-header">
                <Briefcase size={18} className="header-icon" />
                <div className="header-text">
                    <h3>PORTFOLIO INTELLIGENCE</h3>
                    <span className="strategy-badge">{brief.strategyType}</span>
                </div>
            </div>

            <div className="portfolio-brief-content">
                <p className="portfolio-summary">{brief.summary}</p>

                {brief.dependencies.length > 0 && (
                    <div className="portfolio-dependencies">
                        <div className="section-label">CROSS-DEAL DEPENDENCIES</div>
                        {brief.dependencies.map((dep, idx) => (
                            <div key={idx} className={`dependency-card risk-${dep.riskLevel.toLowerCase()}`}>
                                <div className="dependency-header">
                                    <Link2 size={14} />
                                    <span className="dependency-risk">{dep.riskLevel} RISK</span>
                                </div>
                                <p>{dep.description}</p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="portfolio-next-step">
                    <div className="section-label">PORTFOLIO NEXT STEP</div>
                    <div className="next-step-card">
                        <Zap size={14} />
                        <p>{brief.overallNextStep}</p>
                        <ArrowRight size={14} className="arrow" />
                    </div>
                </div>
            </div>
        </div>
    );
};
