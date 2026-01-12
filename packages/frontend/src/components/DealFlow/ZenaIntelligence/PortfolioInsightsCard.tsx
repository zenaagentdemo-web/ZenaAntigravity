import React, { useState, useEffect } from 'react';
import { LucideIcon, BarChart3, ShieldAlert, Target, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import './PortfolioInsightsCard.css';

interface PortfolioData {
    healthScore: number;
    summary: string;
    totalValue: number;
    activeDealsCount: number;
    topPriority: string;
    macroRisks: string[];
    riskClusters: Array<{
        stage: string;
        count: number;
        commonIssue: string;
    }>;
    opportunities: Array<{
        buyerName: string;
        propertyAddress: string;
        reason: string;
    }>;
}

export const PortfolioInsightsCard: React.FC = () => {
    const [data, setData] = useState<PortfolioData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPortfolioIntelligence = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/deals/portfolio/intelligence`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) throw new Error('Failed to fetch portfolio intelligence');

                const result = await response.json();
                setData(result);
            } catch (err) {
                console.error(err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchPortfolioIntelligence();
    }, []);

    if (loading) {
        return (
            <div className="portfolio-insights-card loading">
                <div className="zena-icon-animated">
                    <Zap className="animate-pulse text-white" size={20} />
                </div>
                <span>Zena is synthesizing your global portfolio intelligence...</span>
            </div>
        );
    }

    if (error || !data) return null;

    return (
        <div className="portfolio-insights-card">
            <div className="insights-header">
                <div className="insights-title">
                    <div className="zena-icon-animated">
                        <TrendingUp className="text-white" size={20} />
                    </div>
                    <h2>Portfolio Intelligence Pulse</h2>
                </div>
                <div className="insights-health">
                    <div className="stat-label">System Health</div>
                    <div className={`stat-value ${data.healthScore > 70 ? 'value-positive' : 'value-neutral'}`}>
                        {data.healthScore}%
                    </div>
                </div>
            </div>

            <div className="insights-stats-grid">
                <div className="stat-item">
                    <div className="stat-label">Pipeline Volume</div>
                    <div className="stat-value">${(data.totalValue / 1000000).toFixed(1)}M</div>
                    <div className="stat-subvalue text-slate-400">{data.activeDealsCount} Active Deals</div>
                </div>
                <div className="stat-item">
                    <div className="stat-label">Top Strategic Priority</div>
                    <div className="stat-value" style={{ fontSize: '1rem' }}>{data.topPriority}</div>
                </div>
            </div>

            <div className="insights-summary">
                {data.summary}
            </div>

            <div className="insights-clusters">
                <div className="cluster-section">
                    <h3><ShieldAlert size={16} /> Systemic Risks</h3>
                    <div className="cluster-list">
                        {data.riskClusters.slice(0, 3).map((cluster, i) => (
                            <div key={i} className="cluster-tag">
                                <AlertTriangle size={14} className="text-amber-400" />
                                <span>{cluster.count} deals in <strong>{cluster.stage}</strong> stalled by {cluster.commonIssue}</span>
                            </div>
                        ))}
                        {data.macroRisks.map((risk, i) => (
                            <div key={`macro-${i}`} className="cluster-tag">
                                <ShieldAlert size={14} className="text-red-400" />
                                <span>{risk}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="cluster-section">
                    <h3><Target size={16} /> Internal Matching</h3>
                    <div className="cluster-list">
                        {data.opportunities.length > 0 ? (
                            data.opportunities.slice(0, 3).map((opp, i) => (
                                <div key={i} className="cluster-tag opportunity-card">
                                    <Zap size={14} className="text-green-400" />
                                    <span>Match: <strong>{opp.buyerName}</strong> → {opp.propertyAddress}</span>
                                </div>
                            ))
                        ) : (
                            <div className="cluster-tag opacity-50">No immediate internal matches detected.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
