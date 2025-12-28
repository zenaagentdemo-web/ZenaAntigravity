/**
 * MarketingStatsSection - Displays seller's listing performance
 */

import React from 'react';
import { Deal } from '../../types';
import './sections.css';

interface MarketingStatsSectionProps {
    deal: Deal;
}

export const MarketingStatsSection: React.FC<MarketingStatsSectionProps> = ({ deal }) => {
    // Mocking marketing stats
    const stats = (deal as any).marketingStats || {
        views: 1245,
        watchlist: 86,
        inquiries: 12,
        viewings: 8,
        daysOnMarket: 14,
        trend: 'up',
    };

    return (
        <div className="section-card">
            <div className="section-card__header">
                <span className="section-card__icon">📈</span>
                <span className="section-card__title">Marketing Performance</span>
            </div>

            <div className="marketing-stats__grid">
                <div className="marketing-stats__item">
                    <span className="marketing-stats__number">{stats.views}</span>
                    <span className="marketing-stats__label">Views</span>
                </div>
                <div className="marketing-stats__item">
                    <span className="marketing-stats__number">{stats.watchlist}</span>
                    <span className="marketing-stats__label">Watchlist</span>
                </div>
                <div className="marketing-stats__item">
                    <span className="marketing-stats__number">{stats.inquiries}</span>
                    <span className="marketing-stats__label">Inquiries</span>
                </div>
                <div className="marketing-stats__item highlight">
                    <span className="marketing-stats__number">{stats.viewings}</span>
                    <span className="marketing-stats__label">Real Viewings</span>
                </div>
            </div>

            <div className="marketing-stats__footer">
                <span className="marketing-stats__days">{stats.daysOnMarket} days live</span>
                <span className={`marketing-stats__trend marketing-stats__trend--${stats.trend}`}>
                    {stats.trend === 'up' ? '↗' : '↘'} +12% from last week
                </span>
            </div>
        </div>
    );
};
