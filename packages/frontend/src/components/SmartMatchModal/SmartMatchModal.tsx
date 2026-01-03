import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Sparkles, X, Users, TrendingUp, AlertCircle, Clock,
    Mail, Phone, ChevronRight, Target, Brain, UserX
} from 'lucide-react';
import './SmartMatchModal.css';
import { api } from '../../utils/apiClient';

interface Property {
    id: string;
    address: string;
    buyerMatchCount?: number;
    momentumScore?: number;
    listingPrice?: number;
    heatLevel?: 'hot' | 'active' | 'cold';
    heatReasoning?: string;
    suggestedActions?: any[];
}

interface SmartMatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    insightType: 'buyerMatches' | 'hot' | 'stale' | 'vendorOverdue';
    properties: Property[];
}

export const SmartMatchModal: React.FC<SmartMatchModalProps> = ({
    isOpen,
    onClose,
    insightType,
    properties
}) => {

    const [activeTab, setActiveTab] = useState<'buyerMatches' | 'hot' | 'stale' | 'vendorOverdue'>(insightType);
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch matches when modal opens, based on valid scope
    React.useEffect(() => {
        if (isOpen && activeTab === 'buyerMatches') {
            loadMatches();
        }
    }, [isOpen, activeTab]);

    const loadMatches = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch global matches for portfolio
            const response = await api.get<{ matches: any[] }>('/api/properties/smart-matches');
            if (response.data && response.data.matches) {
                setMatches(response.data.matches);
            }
        } catch (err) {
            console.error("Failed to load smart matches", err);
            setError('Unable to fetch matches');
        } finally {
            setLoading(false);
        }
    };

    // Use loaded matches for display
    const buyerMatches = useMemo(() => {
        return matches.map(m => ({
            id: m.contactId,
            name: m.name,
            score: m.matchScore,
            reason: m.matchReason,
            property: m.matchReason?.includes('Matched to') ? m.matchReason.split('Matched to')[1]?.replace(')', '').trim() : 'General Interest'
        }));
    }, [matches]);

    // Compute dynamic insights from properties data
    const hotProperties = useMemo(() => {
        return properties.filter(p => p.heatLevel === 'hot' || (p.momentumScore && p.momentumScore >= 75));
    }, [properties]);

    const staleProperties = useMemo(() => {
        return properties.filter(p => p.heatLevel === 'cold' || (p.momentumScore && p.momentumScore < 40));
    }, [properties]);

    const vendorOverdueProperties = useMemo(() => {
        // Properties that likely need vendor contact (based on momentum or availability)
        return properties.filter(p => p.momentumScore && p.momentumScore < 60);
    }, [properties]);

    if (!isOpen) return null;

    const formatPrice = (price?: number) => {
        if (!price) return 'POA';
        if (price >= 1000000) return `$${(price / 1000000).toFixed(1)}M`;
        return `$${(price / 1000).toFixed(0)}K`;
    };

    return createPortal(
        <div className="zena-modal-overlay">
            <div className="smart-match-modal">
                <header className="zena-modal-header">
                    <div className="modal-title-group">
                        <Brain className="zena-sparkle-icon" size={20} />
                        <h2>Smart Match Intelligence</h2>
                    </div>
                    <button className="zena-modal-close" onClick={onClose}><X size={20} /></button>
                </header>

                <div className="modal-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'buyerMatches' ? 'active' : ''}`}
                        onClick={() => setActiveTab('buyerMatches')}
                    >
                        <Users size={16} /> Buyer Matches
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'hot' ? 'active' : ''}`}
                        onClick={() => setActiveTab('hot')}
                    >
                        <TrendingUp size={16} /> Hot Properties
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'stale' ? 'active' : ''}`}
                        onClick={() => setActiveTab('stale')}
                    >
                        <Target size={16} /> Stale Analysis
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'vendorOverdue' ? 'active' : ''}`}
                        onClick={() => setActiveTab('vendorOverdue')}
                    >
                        <Clock size={16} /> Strategy
                    </button>
                </div>

                <div className="intelligence-summary">
                    <Sparkles size={18} className="zena-sparkle-icon" />
                    <div className="intelligence-summary__text">
                        {activeTab === 'buyerMatches' && (loading ? "Zena is scanning your database for matches..." : `Zena has identified ${matches.length} ${matches.length === 1 ? 'buyer' : 'buyers'} matching your active listings.`)}
                        {activeTab === 'hot' && `${hotProperties.length} ${hotProperties.length === 1 ? 'property is' : 'properties are'} showing strong momentum.`}
                        {activeTab === 'stale' && `${staleProperties.length} ${staleProperties.length === 1 ? 'listing needs' : 'listings need'} strategic attention.`}
                        {activeTab === 'vendorOverdue' && `${vendorOverdueProperties.length} vendor ${vendorOverdueProperties.length === 1 ? 'conversation' : 'conversations'} may need attention.`}
                    </div>
                </div>

                <div className="matches-list">
                    {activeTab === 'buyerMatches' && (
                        loading ? (
                            <div className="loading-state" style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                                <Sparkles className="spin" size={24} style={{ marginBottom: '10px' }} />
                                <p>Finding perfect matches...</p>
                            </div>
                        ) : buyerMatches.length === 0 ? (
                            <div className="empty-state" style={{ padding: '50px 30px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                                <UserX size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                                <h4 style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.8)' }}>No buyer matches found</h4>
                                <p style={{ margin: 0, fontSize: '14px' }}>
                                    Zena couldn't find any buyers in your database matching your active listings.
                                    <br />Add buyer contacts with preferences to unlock smart matching.
                                </p>
                            </div>
                        ) : (
                            buyerMatches.map(match => (
                                <div key={match.id} className="match-card">
                                    <div className="match-card__info">
                                        <div className="match-card__avatar">
                                            {match.name.split(' ').map((n: string) => n[0]).join('')}
                                        </div>
                                        <div className="match-card__details">
                                            <h4>{match.name}</h4>
                                            <p className="match-card__reason">
                                                <Target size={12} /> {match.reason}
                                            </p>
                                            <p className="match-card__reason" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                                Matched to: {match.property}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="match-card__actions">
                                        <div className="match-card__score">
                                            <span className="score-value">{match.score}%</span>
                                            <span className="score-label">Match</span>
                                        </div>
                                        <div style={{ width: '12px' }} />
                                        <button className="action-btn-small"><Mail size={14} /></button>
                                        <button className="action-btn-small"><Phone size={14} /></button>
                                        <button className="action-btn-small" title="Deep Profile"><ChevronRight size={14} /></button>
                                    </div>
                                </div>
                            ))
                        )
                    )}

                    {activeTab === 'hot' && (
                        hotProperties.length === 0 ? (
                            <div className="empty-state" style={{ padding: '50px 30px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                                <TrendingUp size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                                <h4 style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.8)' }}>No hot properties detected</h4>
                                <p style={{ margin: 0, fontSize: '14px' }}>
                                    When listings show high momentum, Zena will surface strategic opportunities here.
                                </p>
                            </div>
                        ) : (
                            <div className="detail-view">
                                <TrendingUp size={48} color="#FF6B35" className="detail-view__icon" />
                                <h3>Viral Momentum Analysis</h3>
                                <p>Your property at <strong>{hotProperties[0]?.address?.split(',')[0] || 'Your top listing'}</strong> is receiving above-average market attention.</p>

                                {hotProperties.map(prop => (
                                    <div key={prop.id} className="strategy-box" style={{ marginBottom: '12px' }}>
                                        <h5><Brain size={16} /> {prop.address.split(',')[0]}</h5>
                                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                                            Momentum: {prop.momentumScore || 80}% • {formatPrice(prop.listingPrice)}
                                        </p>
                                        <p>{prop.heatReasoning || 'Strong buyer interest detected. Consider capitalizing on current momentum with a competitive pricing strategy.'}</p>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {activeTab === 'stale' && (
                        staleProperties.length === 0 ? (
                            <div className="empty-state" style={{ padding: '50px 30px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                                <AlertCircle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                                <h4 style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.8)' }}>All listings are performing well</h4>
                                <p style={{ margin: 0, fontSize: '14px' }}>
                                    No stale listings detected. Keep up the momentum!
                                </p>
                            </div>
                        ) : (
                            <div className="detail-view">
                                <AlertCircle size={48} color="#FFD700" className="detail-view__icon" />
                                <h3>Stale Listing Strategy</h3>
                                <p><strong>{staleProperties[0]?.address?.split(',')[0] || 'Your listing'}</strong> may need attention.</p>

                                {staleProperties.map(prop => (
                                    <div key={prop.id} className="strategy-box" style={{ marginBottom: '12px' }}>
                                        <h5><Brain size={16} /> {prop.address.split(',')[0]}</h5>
                                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                                            Momentum: {prop.momentumScore || 30}% • {formatPrice(prop.listingPrice)}
                                        </p>
                                        <p>{prop.heatReasoning || 'Price fatigue may be setting in. Consider refreshing marketing materials or discussing pricing strategy with vendor.'}</p>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {activeTab === 'vendorOverdue' && (
                        vendorOverdueProperties.length === 0 ? (
                            <div className="empty-state" style={{ padding: '50px 30px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                                <Clock size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                                <h4 style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.8)' }}>All vendors are up to date</h4>
                                <p style={{ margin: 0, fontSize: '14px' }}>
                                    No overdue vendor conversations detected.
                                </p>
                            </div>
                        ) : (
                            <div className="detail-view">
                                <Clock size={48} color="#8B5CF6" className="detail-view__icon" />
                                <h3>Execution Strategy</h3>
                                <p>Focus your attention on these {vendorOverdueProperties.length} vendor check-ins.</p>

                                {vendorOverdueProperties.slice(0, 3).map(prop => (
                                    <div key={prop.id} className="strategy-box" style={{ marginBottom: '12px' }}>
                                        <h5><Brain size={16} /> {prop.address.split(',')[0]}</h5>
                                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                                            Momentum: {prop.momentumScore || 50}%
                                        </p>
                                        <p>Consider scheduling a vendor update call to maintain confidence during the campaign.</p>
                                    </div>
                                ))}

                                <div className="strategy-box" style={{ background: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.4)' }}>
                                    <h5><Brain size={16} /> Zena Recommendation</h5>
                                    <p>Draft personalized Weekly Vendor Reports for {vendorOverdueProperties.length} properties. Use "Batch Compose" to send efficiently.</p>
                                </div>
                            </div>
                        )
                    )}
                </div>

                <footer className="zena-modal-footer">
                    <button className="zena-secondary-btn" onClick={onClose}>Close</button>
                    <button className="zena-primary-btn" onClick={() => setActiveTab('buyerMatches')}>
                        <Sparkles size={16} /> Generate Campaign
                    </button>
                </footer>
            </div>
        </div>,
        document.body
    );
};
