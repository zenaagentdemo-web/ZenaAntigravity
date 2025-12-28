/**
 * InboxPage - Unified Inbox with Tab-Switched Content
 * 
 * Consolidates "New" (emails needing reply) and "Awaiting" (waiting for response)
 * into a single page with tab toggle that shows ONE page at a time.
 * 
 * Option A design: Simple tabs, full page content switch (no side-by-side panels)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NewPage } from '../NewPage/NewPage';
import { WaitingPage } from '../WaitingPage/WaitingPage';
import './InboxPage.css';

type TabType = 'new' | 'awaiting';

interface TabCounts {
    new: number;
    awaiting: number;
}

export const InboxPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = (searchParams.get('tab') as TabType) || 'new';
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);

    // TODO: These counts would come from real data/context
    const [tabCounts] = useState<TabCounts>({ new: 3, awaiting: 10 });

    // Update URL when tab changes
    const handleTabChange = useCallback((tab: TabType) => {
        setActiveTab(tab);
        setSearchParams({ tab }, { replace: true });
    }, [setSearchParams]);

    // Sync tab from URL on mount/navigation
    useEffect(() => {
        const urlTab = searchParams.get('tab') as TabType;
        if (urlTab && (urlTab === 'new' || urlTab === 'awaiting') && urlTab !== activeTab) {
            setActiveTab(urlTab);
        }
    }, [searchParams, activeTab]);

    return (
        <div className="inbox-page" data-theme="high-tech">
            {/* Fixed Tab Header */}
            <div className="inbox-page__tab-header">
                <div className="inbox-page__tabs">
                    <button
                        className={`inbox-page__tab ${activeTab === 'new' ? 'inbox-page__tab--active' : ''}`}
                        onClick={() => handleTabChange('new')}
                        aria-selected={activeTab === 'new'}
                        role="tab"
                    >
                        <span className="inbox-page__tab-label">New</span>
                        {tabCounts.new > 0 && (
                            <span className="inbox-page__tab-badge inbox-page__tab-badge--new">
                                {tabCounts.new}
                            </span>
                        )}
                    </button>

                    <button
                        className={`inbox-page__tab ${activeTab === 'awaiting' ? 'inbox-page__tab--active' : ''}`}
                        onClick={() => handleTabChange('awaiting')}
                        aria-selected={activeTab === 'awaiting'}
                        role="tab"
                    >
                        <span className="inbox-page__tab-label">Awaiting</span>
                        {tabCounts.awaiting > 0 && (
                            <span className="inbox-page__tab-badge inbox-page__tab-badge--awaiting">
                                {tabCounts.awaiting}
                            </span>
                        )}
                    </button>

                    {/* Sliding indicator */}
                    <div
                        className="inbox-page__tab-indicator"
                        style={{ transform: `translateX(${activeTab === 'new' ? 0 : 100}%)` }}
                    />
                </div>
            </div>

            {/* Single Content Area - Shows ONE page at a time */}
            <div className="inbox-page__content" role="tabpanel">
                {activeTab === 'new' ? (
                    <NewPage />
                ) : (
                    <WaitingPage />
                )}
            </div>
        </div>
    );
};

export default InboxPage;
