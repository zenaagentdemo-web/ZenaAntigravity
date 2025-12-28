import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Deal,
    RiskLevel,
    RISK_BADGES,
    formatCurrency,
    calculateDaysInStage
} from './types';

interface DealCardProps {
    deal: Deal;
    onClick?: (deal: Deal) => void;
    overlay?: boolean;
}

// Helper to get initials from name
function getInitials(name: string): string {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Extract suburb from address (assumes NZ format like "14 Karaka Street, Ponsonby")
function extractSuburb(address: string): string {
    const parts = address.split(',');
    if (parts.length > 1) {
        return parts[parts.length - 1].trim().replace(/\d{4}$/, '').trim();
    }
    return '';
}


export const DealCard: React.FC<DealCardProps> = ({ deal, onClick, overlay = false }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: deal.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const address = deal.property?.address || 'No property assigned';
    const suburb = deal.property ? extractSuburb(deal.property.address) : '';
    const daysInStage = calculateDaysInStage(deal.stageEnteredAt);

    const handleClick = () => {
        if (onClick) {
            onClick(deal);
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`deal-card ${isDragging ? 'deal-card--dragging' : ''} ${overlay ? 'deal-card--overlay' : ''} deal-card--risk-${deal.riskLevel || 'none'} deal-card--${deal.stage} ${deal.dealValue && deal.dealValue > 1000000 ? 'deal-card--hot' : ''}`}
            onClick={handleClick}
        >
            <div className="deal-card__header">
                <div className="deal-card__address">
                    <div className="deal-card__address-line">{address}</div>
                    {suburb && <div className="deal-card__suburb">{suburb}</div>}
                </div>
                <div className="deal-card__status-badges">
                    <span className="deal-card__risk-badge" title={deal.riskLevel}>
                        {RISK_BADGES[deal.riskLevel as RiskLevel]?.emoji || '✅'}
                    </span>
                </div>
            </div>

            <div className="deal-card__body">
                {deal.nextAction && (
                    <div className="deal-card__next-action">
                        <span className="deal-card__action-icon">✦</span>
                        <span>{deal.nextAction.replace(/_/g, ' ')}</span>
                    </div>
                )}

                <div className="deal-card__contacts">
                    {deal.contacts?.slice(0, 3).map(contact => (
                        <div key={contact.id} className="deal-card__avatar" title={contact.name}>
                            {getInitials(contact.name)}
                        </div>
                    ))}
                    {(deal.contacts?.length || 0) > 3 && (
                        <div className="deal-card__avatar deal-card__avatar--more">
                            +{(deal.contacts?.length || 0) - 3}
                        </div>
                    )}
                </div>
            </div>

            <div className="deal-card__footer">
                <div className="deal-card__value">
                    {deal.dealValue ? formatCurrency(deal.dealValue) : '-'}
                </div>
                <div className={`deal-card__days ${daysInStage > 14 ? 'deal-card__days--stuck' : ''}`}>
                    {daysInStage}d
                </div>
            </div>
        </div>
    );
};

export default DealCard;
