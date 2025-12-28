import React, { useState, useEffect, useCallback } from 'react';
import { KanbanBoard, FilterChips, FilterType, PipelineType, PipelineResponse, Deal, PipelineColumn, NewDealModal, RevenueForecast, DealQuickActions } from '../../components/DealFlow';
import '../../components/DealFlow/DealFlow.css';
import './DealFlowPage.css';

// API base URL
const API_BASE = '/api';

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
    // const navigate = useNavigate();
    const [pipelineType, setPipelineType] = useState<PipelineType>('buyer');
    const [pipelineData, setPipelineData] = useState<PipelineResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);
    const [showNewDealModal, setShowNewDealModal] = useState(false);
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
    const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
    const [currentMobileStage, setCurrentMobileStage] = useState(0);

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
            setPipelineData(data);
        } catch (err) {
            console.error('Error fetching pipeline:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [pipelineType]);

    useEffect(() => {
        fetchPipeline();
    }, [fetchPipeline]);

    // Handle deal stage change via drag-drop
    const handleDealMove = async (dealId: string, fromStage: string, toStage: string) => {
        if (!pipelineData) return;

        // Save current state for rollback
        const previousData = { ...pipelineData };

        // Optimistic UI update
        const updatedColumns = pipelineData.columns.map(column => {
            if (column.stage === fromStage) {
                // Remove deal from source column
                const filteredDeals = column.deals.filter(d => d.id !== dealId);
                return {
                    ...column,
                    deals: filteredDeals,
                    count: filteredDeals.length,
                    totalValue: filteredDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0)
                };
            }
            if (column.stage === toStage) {
                // Add deal to target column
                const dealToMove = previousData.columns
                    .find(c => c.stage === fromStage)
                    ?.deals.find(d => d.id === dealId);

                if (dealToMove) {
                    const newDeal = { ...dealToMove, stage: toStage as any, stageEnteredAt: new Date().toISOString() };
                    const updatedDeals = [...column.deals, newDeal];
                    return {
                        ...column,
                        deals: updatedDeals,
                        count: updatedDeals.length,
                        totalValue: updatedDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0)
                    };
                }
            }
            return column;
        });

        setPipelineData({
            ...pipelineData,
            columns: updatedColumns
        });

        try {
            const response = await fetchWithAuth(`${API_BASE}/deals/${dealId}/stage`, {
                method: 'PUT',
                body: JSON.stringify({ stage: toStage })
            });

            if (!response.ok) {
                throw new Error('Failed to update deal stage');
            }

            // Refresh to ensure server-side consistency
            fetchPipeline();
        } catch (err) {
            console.error('Error moving deal:', err);
            // Rollback on error
            setPipelineData(previousData);
        }
    };

    // Handle deal card click - open quick actions
    const handleDealClick = (deal: Deal) => {
        setSelectedDeal(deal);
        setIsQuickActionsOpen(true);
    };

    // Filter deals based on active filter
    const getFilteredColumns = (): PipelineColumn[] => {
        if (!pipelineData) return [];

        let cols = pipelineData.columns;

        if (activeFilter) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            cols = pipelineData.columns.map(column => {
                const filteredDeals = column.deals.filter(deal => {
                    switch (activeFilter) {
                        case 'today': {
                            const conditions = deal.conditions || [];
                            for (const condition of conditions) {
                                if (condition.status === 'pending') {
                                    const dueDate = new Date(condition.dueDate);
                                    const diff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                    if (diff === 0) return true;
                                }
                            }
                            return false;
                        }
                        case 'overdue': {
                            const conditions = deal.conditions || [];
                            for (const condition of conditions) {
                                if (condition.status === 'pending') {
                                    const dueDate = new Date(condition.dueDate);
                                    const diff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                    if (diff < 0) return true;
                                }
                            }
                            return false;
                        }
                        case 'at-risk':
                            return deal.riskLevel === 'high' || deal.riskLevel === 'critical';
                        default:
                            return true;
                    }
                });

                return {
                    ...column,
                    deals: filteredDeals,
                    count: filteredDeals.length,
                    totalValue: filteredDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0)
                };
            });
        }

        return cols;
    };

    // Handle new deal button click
    const handleNewDealClick = () => {
        setShowNewDealModal(true);
    };

    const filteredColumns = getFilteredColumns();
    const todayDeals = pipelineData?.columns.flatMap(c => c.deals).filter(d =>
        d.conditions?.some(c => {
            const dueDate = new Date(c.dueDate);
            const now = new Date();
            return c.status === 'pending' && dueDate.toDateString() === now.toDateString();
        })
    ) || [];

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
                            onClick={() => { setPipelineType('buyer'); setCurrentMobileStage(0); }}
                        >
                            Buyers
                        </button>
                        <button
                            className={`deal-flow__pipeline-tab ${pipelineType === 'seller' ? 'deal-flow__pipeline-tab--active' : ''}`}
                            onClick={() => { setPipelineType('seller'); setCurrentMobileStage(0); }}
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
                {todayDeals.length > 0 && (
                    <div className="deal-flow-page__today-focus">
                        <h4 className="deal-flow-page__section-title">✦ Today's Focus</h4>
                        <div className="deal-flow-page__focus-grid">
                            {todayDeals.slice(0, 3).map(deal => (
                                <div key={deal.id} className="deal-flow-page__focus-item" onClick={() => handleDealClick(deal)}>
                                    <span className="deal-flow-page__focus-icon">🔥</span>
                                    <div className="deal-flow-page__focus-info">
                                        <div className="deal-flow-page__focus-address">{deal.property?.address}</div>
                                        <div className="deal-flow-page__focus-action">{deal.nextAction || 'Follow up required'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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
                        <FilterChips
                            todayCount={pipelineData.summary.todayCount}
                            overdueCount={pipelineData.summary.overdueCount}
                            atRiskCount={pipelineData.summary.atRiskCount}
                            activeFilter={activeFilter}
                            onFilterChange={setActiveFilter}
                        />

                        {/* Mobile Stage Switcher */}
                        <div className="deal-flow__mobile-switcher">
                            {pipelineData.columns.map((col, idx) => (
                                <button
                                    key={col.stage}
                                    className={`deal-flow__mobile-tab ${currentMobileStage === idx ? 'active' : ''}`}
                                    onClick={() => setCurrentMobileStage(idx)}
                                >
                                    {col.label}
                                </button>
                            ))}
                        </div>

                        <KanbanBoard
                            columns={window.innerWidth < 768 ? [filteredColumns[currentMobileStage]] : filteredColumns}
                            onDealClick={handleDealClick}
                            onDealMove={handleDealMove}
                        />

                        {pipelineData.summary.totalDeals === 0 && (
                            <div className="deal-flow-page__empty">
                                <div className="deal-flow-page__empty-icon">🚀</div>
                                <h3>Launch your first deal</h3>
                                <p>No {pipelineType} deals in the pipeline. Ready to close some business?</p>
                                <button className="deal-flow__new-deal-btn" onClick={handleNewDealClick}>
                                    Create Deal
                                </button>
                            </div>
                        )}

                        <div className="deal-flow-page__footer-widgets">
                            <RevenueForecast authToken={localStorage.getItem('authToken') || ''} />
                        </div>
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
            {selectedDeal && (
                <DealQuickActions
                    deal={selectedDeal}
                    isOpen={isQuickActionsOpen}
                    onClose={() => setIsQuickActionsOpen(false)}
                    onStageChange={fetchPipeline}
                />
            )}
        </div>
    );
};
export default DealFlowPage;
