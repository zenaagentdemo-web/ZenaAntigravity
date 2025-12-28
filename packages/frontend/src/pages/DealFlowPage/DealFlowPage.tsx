import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PipelineType, PipelineResponse, Deal, NewDealModal, DealQuickActions, ZenaMomentumFlow, StrategySessionContext, STRATEGY_SESSION_KEY } from '../../components/DealFlow';
import { DealDetailPanel } from '../../components/DealFlow/DealDetailPanel';
import '../../components/DealFlow/DealFlow.css';
import './DealFlowPage.css';

// API base URL
const API_BASE = '/api';

// ============================================================
// MOCK DEALS FOR TESTING MOMENTUM RADAR
// ============================================================
const MOCK_DEALS_FOR_TESTING: Deal[] = [
    // CRITICAL - Will show in Momentum Radar
    {
        id: 'deal-critical-001',
        pipelineType: 'buyer',
        stage: 'conditional',
        stageEnteredAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 days ago
        lastContactAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days no contact
        riskLevel: 'critical',
        property: { address: '15 Marine Parade, Herne Bay' },
        dealValue: 3250000,
        contacts: [{ id: 'c1', name: 'Sarah Mitchell', email: 'sarah@example.com', role: 'buyer' }],
        conditions: [
            { id: 'cond1', label: 'Finance Approval', type: 'finance', status: 'pending', dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'cond2', label: 'Building Report', type: 'building_report', status: 'pending', dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
        ],
        estimatedCommission: 97500,
        isConjunctional: true,
        conjunctionalSplit: 0.2,
        settlementDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    },

    // HIGH RISK - Will show in Momentum Radar  
    {
        id: 'deal-warning-002',
        pipelineType: 'buyer',
        stage: 'offer_made',
        stageEnteredAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(), // 18 days
        lastContactAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days no contact
        riskLevel: 'high',
        property: { address: '42 Kohimarama Road, Kohimarama' },
        dealValue: 2800000,
        contacts: [{ id: 'c2', name: 'James Chen', email: 'james@example.com', role: 'buyer' }],
        auctionDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedCommission: 84000,
        activeOffer: {
            id: 'o1',
            amount: 2750000,
            conditions: ['Finance approval', 'Solicitor approval'],
            settlementDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'submitted',
            expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            isMultiOffer: true,
        },
    },

    // WARNING - Will show in Momentum Radar
    {
        id: 'deal-warning-003',
        pipelineType: 'buyer',
        stage: 'conditional',
        stageEnteredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        lastContactAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        riskLevel: 'medium',
        property: { address: '108 Remuera Road, Remuera' },
        dealValue: 1950000,
        contacts: [{ id: 'c3', name: 'Emma Wright', email: 'emma@example.com', role: 'buyer' }],
        conditions: [
            { type: 'building_report', status: 'pending', dueDate: new Date(Date.now() + 0.5 * 24 * 60 * 60 * 1000).toISOString() },
        ],
    },

    // HEALTHY - Will NOT show in Momentum Radar
    {
        id: 'deal-healthy-004',
        pipelineType: 'buyer',
        stage: 'buyer_consult',
        stageEnteredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
        lastContactAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        riskLevel: 'low',
        property: { address: '56 Victoria Avenue, Remuera' },
        dealValue: 2100000,
        contacts: [{ id: 'c4', name: 'Michael Brown', email: 'michael@example.com', role: 'buyer' }],
    },

    // HEALTHY - Will NOT show in Momentum Radar
    {
        id: 'deal-healthy-005',
        pipelineType: 'buyer',
        stage: 'shortlisting',
        stageEnteredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
        lastContactAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        riskLevel: 'low',
        property: { address: '23 Arney Road, Remuera' },
        dealValue: 4500000,
        contacts: [{ id: 'c5', name: 'Lisa Anderson', email: 'lisa@example.com', role: 'buyer' }],
        searchCriteria: {
            propertyType: 'Modern Villa',
            location: ['Remuera', 'Parnell'],
            priceRange: { min: 4000000, max: 6000000 },
            bedrooms: '4+',
            bathrooms: '3+',
            mustHaves: ['Tennis Court', 'Wine Cellar', 'North Facing'],
        },
        propertiesShared: [
            { id: 'p1', address: '12 Arney Crescent, Remuera', feedback: 'like', isFavourite: true },
            { id: 'p2', address: '45 Victoria Ave, Remuera', feedback: 'neutral', isHot: true, auctionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'p3', address: '8 Cliff Road, St Heliers', feedback: 'dislike' },
        ],
    },

    // HEALTHY - Will NOT show in Momentum Radar
    {
        id: 'deal-healthy-006',
        pipelineType: 'buyer',
        stage: 'pre_settlement',
        stageEnteredAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        lastContactAt: new Date().toISOString(), // Today
        riskLevel: 'low',
        property: { address: '8 Cliff Road, St Heliers' },
        dealValue: 1750000,
        contacts: [{ id: 'c6', name: 'David Wilson', email: 'david@example.com', role: 'buyer' }],
        viewings: [
            { id: 'v1', propertyId: 'p8', address: '8 Cliff Road, St Heliers', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), time: '10:00 AM', status: 'completed', feedback: 'Stunning views, but garden is a bit small.' },
            { id: 'v2', propertyId: 'p8', address: '8 Cliff Road, St Heliers (2nd)', date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), time: '2:30 PM', status: 'scheduled' },
        ],
        preSettlementInspection: {
            date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            time: '11:00 AM',
            status: 'pending',
            isFundsReady: false,
            isKeysArranged: false,
        },
    },

    // SELLER DEAL - For testing marketing and offers
    {
        id: 'deal-seller-001',
        pipelineType: 'seller',
        stage: 'marketing',
        stageEnteredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        riskLevel: 'low',
        property: { address: '28 Arney Crescent, Remuera' },
        dealValue: 5250000,
        contacts: [{ id: 's1', name: 'Robert Vance', role: 'seller' }],
        marketingStats: {
            views: 3450,
            watchlist: 124,
            inquiries: 18,
            viewings: 12,
            daysOnMarket: 14,
            trend: 'up',
        },
        estimatedCommission: 157500,
    },
    {
        id: 'deal-seller-002',
        pipelineType: 'seller',
        stage: 'offers_received',
        stageEnteredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        riskLevel: 'medium',
        property: { address: '5 Victoria Avenue, Remuera' },
        dealValue: 0, // TBA
        contacts: [{ id: 's2', name: 'Angela Merkel', role: 'seller' }],
        offers: [
            { id: 'o1', buyerName: 'The Smiths', amount: 4850000, conditions: 2, status: 'countered', date: '2025-12-24' },
            { id: 'o2', buyerName: 'Zhang Family', amount: 5100000, conditions: 1, status: 'pending', date: '2025-12-25' },
        ],
        nextAction: 'Present new offer to Angela',
    },
    // SETTLED DEAL - To show follow-up
    {
        id: 'deal-settled-007',
        pipelineType: 'buyer',
        stage: 'settled',
        stageEnteredAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        riskLevel: 'none',
        property: { address: '112 Victoria Avenue, Remuera' },
        dealValue: 2450000,
        estimatedCommission: 73500,
        contacts: [{ id: 'c7', name: 'Peter Sellers', email: 'peter@example.com', role: 'buyer' }],
    },
];

// Fetch function with auth token
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem('authToken');
    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });
}

export const DealFlowPage: React.FC = () => {
    const navigate = useNavigate();
    const [pipelineType, setPipelineType] = useState<PipelineType>('buyer');
    const [pipelineData, setPipelineData] = useState<PipelineResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showNewDealModal, setShowNewDealModal] = useState(false);
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
    const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
    const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
    const [deals, setDeals] = useState<Deal[]>(MOCK_DEALS_FOR_TESTING);

    // Update specific deal in state
    const handleUpdateDeal = useCallback((updatedDeal: Deal) => {
        setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
        if (selectedDeal?.id === updatedDeal.id) {
            setSelectedDeal(updatedDeal);
        }
    }, [selectedDeal]);

    // Fetch pipeline data
    const fetchPipeline = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetchWithAuth(`${API_BASE}/deals/pipeline/${pipelineType}`);

            if (!response.ok) {
                throw new Error('Failed to fetch pipeline data');
            }

            const data = await response.json();

            // If no deals from API, use mock data for testing Momentum Radar
            const allDeals = data.columns.flatMap((col: { deals: Deal[] }) => col.deals);
            if (allDeals.length === 0) {
                // Inject mock data into the response structure
                const mockPipelineData: PipelineResponse = {
                    ...data,
                    columns: [{ id: 'all', title: 'All Deals', deals: deals }],
                    summary: {
                        ...data.summary,
                        totalDeals: deals.length,
                    }
                };
                setPipelineData(mockPipelineData);
            } else {
                setPipelineData(data);
            }
        } catch (err) {
            console.error('Error fetching pipeline:', err);
            // Fallback to mock data for testing
            const mockPipelineData: PipelineResponse = {
                columns: [{ id: 'all', title: 'All Deals', deals: deals }],
                summary: { totalDeals: deals.length, totalValue: 0 }
            };
            setPipelineData(mockPipelineData);
            setError(null); // Clear error since we have mock data
        } finally {
            setLoading(false);
        }
    }, [pipelineType]);

    useEffect(() => {
        fetchPipeline();
    }, [fetchPipeline]);

    // Handle deal card click - open detail panel
    const handleDealClick = (deal: Deal) => {
        setSelectedDeal(deal);
        setIsDetailPanelOpen(true);
    };

    // Handle close detail panel
    const handleCloseDetailPanel = () => {
        setIsDetailPanelOpen(false);
        // Keep selectedDeal for animation to complete
        setTimeout(() => setSelectedDeal(null), 300);
    };

    // Handle navigate to contact
    const handleNavigateToContact = (contactId: string) => {
        navigate(`/contacts/${contactId}`);
    };

    // Handle new deal button click
    const handleNewDealClick = () => {
        setShowNewDealModal(true);
    };

    // Handle Start Zena Live - store context and navigate to Ask Zena
    const handleStartZenaLive = useCallback((context: StrategySessionContext) => {
        // Store context in sessionStorage for PWA support
        sessionStorage.setItem(STRATEGY_SESSION_KEY, JSON.stringify(context));

        // Navigate to Ask Zena with strategy session mode
        navigate('/ask-zena?mode=strategy-session');
    }, [navigate]);

    return (
        <div className="deal-flow-page">
            <div className="deal-flow-page__header">
                <div className="deal-flow-page__header-left">
                    <h1 className="deal-flow-page__title">Deal Flow</h1>
                    <p className="deal-flow-page__subtitle">Precision pipeline management</p>
                </div>

                <div className="deal-flow__header-actions">
                    <div className="deal-flow__pipeline-tabs">
                        <button
                            className={`deal-flow__pipeline-tab ${pipelineType === 'buyer' ? 'deal-flow__pipeline-tab--active' : ''}`}
                            onClick={() => setPipelineType('buyer')}
                        >
                            Buyers
                        </button>
                        <button
                            className={`deal-flow__pipeline-tab ${pipelineType === 'seller' ? 'deal-flow__pipeline-tab--active' : ''}`}
                            onClick={() => setPipelineType('seller')}
                        >
                            Sellers
                        </button>
                    </div>

                    <button className="deal-flow__new-deal-btn" onClick={handleNewDealClick}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>New Deal</span>
                    </button>
                </div>
            </div>

            <div className="deal-flow-page__content">
                {loading && (
                    <div className="deal-flow__loading">
                        <div className="deal-flow__loading-spinner" />
                        <span>Scanning pipeline...</span>
                    </div>
                )}

                {error && (
                    <div className="deal-flow-page__error">
                        <p>Error: {error}</p>
                        <button onClick={fetchPipeline}>Retry</button>
                    </div>
                )}

                {!loading && !error && pipelineData && (
                    <>
                        <ZenaMomentumFlow
                            deals={deals}
                            pipelineType={pipelineType}
                            onDealSelect={handleDealClick}
                            onStartZenaLive={handleStartZenaLive}
                        />

                        {deals.length === 0 && (
                            <div className="deal-flow-page__empty">
                                <div className="deal-flow-page__empty-icon">🚀</div>
                                <h3>Launch your first deal</h3>
                                <p>No {pipelineType} deals in the pipeline. Ready to close some business?</p>
                                <button className="deal-flow__new-deal-btn" onClick={handleNewDealClick}>
                                    Create Deal
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* New Deal Modal */}
            <NewDealModal
                isOpen={showNewDealModal}
                onClose={() => setShowNewDealModal(false)}
                onDealCreated={fetchPipeline}
                initialPipelineType={pipelineType}
            />

            {/* Quick Actions Drawer */}
            {selectedDeal && isQuickActionsOpen && (
                <DealQuickActions
                    deal={selectedDeal}
                    isOpen={isQuickActionsOpen}
                    onClose={() => setIsQuickActionsOpen(false)}
                    onStageChange={fetchPipeline}
                />
            )}

            {/* Deal Detail Panel */}
            {selectedDeal && isDetailPanelOpen && (
                <DealDetailPanel
                    deal={selectedDeal}
                    onClose={handleCloseDetailPanel}
                    onNavigateToContact={handleNavigateToContact}
                    onDealUpdate={handleUpdateDeal}
                    onStartZenaLive={(dealId) => {
                        const deal = deals.find(d => d.id === dealId);
                        if (deal) {
                            handleStartZenaLive({
                                dealId: deal.id,
                                address: deal.property?.address || 'Unknown',
                                stage: deal.stage,
                                stageLabel: deal.stage,
                                dealValue: deal.dealValue,
                                daysInStage: 0,
                                healthScore: 50,
                                healthStatus: 'warning',
                                primaryRisk: 'Needs attention',
                                riskType: 'general',
                                coachingInsight: 'Review this deal',
                            });
                        }
                    }}
                />
            )}
        </div>
    );
};

export default DealFlowPage;
