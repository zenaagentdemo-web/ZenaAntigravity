/**
 * KeyDatesSection - Timeline dates with countdown
 */

import React from 'react';
import { Deal } from '../../types';
import './sections.css';

interface KeyDatesSectionProps {
    deal: Deal;
    settlementDaysRemaining: number | null;
    expanded?: boolean;
}

interface KeyDate {
    id: string;
    label: string;
    date: Date | null;
    type: 'past' | 'upcoming' | 'urgent';
    daysRemaining?: number;
}

export const KeyDatesSection: React.FC<KeyDatesSectionProps> = ({
    deal,
    settlementDaysRemaining,
    expanded = false,
}) => {
    // Build key dates from deal data
    const keyDates: KeyDate[] = [];

    // Stage entered date
    if (deal.stageEnteredAt) {
        keyDates.push({
            id: 'stage_entered',
            label: `Entered ${deal.stage.replace(/_/g, ' ')}`,
            date: new Date(deal.stageEnteredAt),
            type: 'past',
        });
    }

    // Auction date
    if (deal.auctionDate) {
        const auctionDate = new Date(deal.auctionDate);
        const daysUntil = Math.ceil((auctionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        keyDates.push({
            id: 'auction',
            label: 'Auction',
            date: auctionDate,
            type: daysUntil <= 3 ? 'urgent' : daysUntil > 0 ? 'upcoming' : 'past',
            daysRemaining: daysUntil,
        });
    }

    // Tender close date
    if (deal.tenderCloseDate) {
        const tenderDate = new Date(deal.tenderCloseDate);
        const daysUntil = Math.ceil((tenderDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        keyDates.push({
            id: 'tender',
            label: 'Tender Closes',
            date: tenderDate,
            type: daysUntil <= 3 ? 'urgent' : daysUntil > 0 ? 'upcoming' : 'past',
            daysRemaining: daysUntil,
        });
    }

    // Settlement date
    if (deal.settlementDate) {
        keyDates.push({
            id: 'settlement',
            label: 'Settlement',
            date: new Date(deal.settlementDate),
            type: settlementDaysRemaining !== null && settlementDaysRemaining <= 7 ? 'urgent' : 'upcoming',
            daysRemaining: settlementDaysRemaining ?? undefined,
        });
    }

    // Last contact
    if (deal.lastContactAt) {
        keyDates.push({
            id: 'last_contact',
            label: 'Last Contact',
            date: new Date(deal.lastContactAt),
            type: 'past',
        });
    }

    // Go live date (for listings)
    if (deal.goLiveDate) {
        const goLiveDate = new Date(deal.goLiveDate);
        const daysUntil = Math.ceil((goLiveDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        keyDates.push({
            id: 'go_live',
            label: 'Go Live',
            date: goLiveDate,
            type: daysUntil > 0 ? 'upcoming' : 'past',
            daysRemaining: daysUntil,
        });
    }

    // Sort by date, upcoming first
    keyDates.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        // Upcoming dates first, then past
        const aIsUpcoming = a.date.getTime() > Date.now();
        const bIsUpcoming = b.date.getTime() > Date.now();
        if (aIsUpcoming && !bIsUpcoming) return -1;
        if (!aIsUpcoming && bIsUpcoming) return 1;
        return a.date.getTime() - b.date.getTime();
    });

    const displayDates = expanded ? keyDates : keyDates.slice(0, 4);

    if (displayDates.length === 0) {
        return null;
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-NZ', {
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
        });
    };

    const formatDaysRemaining = (days: number | undefined) => {
        if (days === undefined) return null;
        if (days < 0) return `${Math.abs(days)}d ago`;
        if (days === 0) return 'Today';
        if (days === 1) return 'Tomorrow';
        return `${days}d`;
    };

    return (
        <div className="section-card">
            <div className="section-card__header">
                <span className="section-card__icon">📅</span>
                <span className="section-card__title">Key Dates</span>
            </div>

            <div className="key-dates__list">
                {displayDates.map(date => (
                    <div
                        key={date.id}
                        className={`key-dates__item key-dates__item--${date.type}`}
                    >
                        <div className="key-dates__label">{date.label}</div>
                        <div className="key-dates__value">
                            {date.date && formatDate(date.date)}
                            {date.daysRemaining !== undefined && date.daysRemaining > 0 && (
                                <span className="key-dates__countdown">
                                    {formatDaysRemaining(date.daysRemaining)}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default KeyDatesSection;
