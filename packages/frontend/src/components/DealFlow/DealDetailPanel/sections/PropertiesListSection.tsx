/**
 * PropertiesListSection - Displays properties shared with a buyer
 */

import React from 'react';
import { Deal } from '../../types';
import { logActivity } from '../../utils/ActivityLogger';
import './sections.css';

interface PropertiesListSectionProps {
    deal: Deal;
    onUpdate?: (deal: Deal) => void;
}

export const PropertiesListSection: React.FC<PropertiesListSectionProps> = ({ deal, onUpdate }) => {
    const properties = deal.propertiesShared || [];

    const handleAction = (propertyId: string, action: 'like' | 'dislike' | 'contact') => {
        if (!deal.propertiesShared || !onUpdate) return;

        let updatedProperties = [...deal.propertiesShared];
        const propertyIdx = updatedProperties.findIndex(p => p.id === propertyId);
        if (propertyIdx === -1) return;

        const property = { ...updatedProperties[propertyIdx] };

        if (action === 'contact') {
            const newEvent = logActivity('marketing', 'Property Interest Flagged', `Agent flagged interest for buyer at ${property.address}`);
            onUpdate({
                ...deal,
                timelineEvents: [newEvent, ...(deal.timelineEvents || [])]
            });
            return;
        }

        property.feedback = action;
        updatedProperties[propertyIdx] = property;

        const newEvent = logActivity('note', 'Property Feedback Updated', `Buyer ${action}d ${property.address}`);

        onUpdate({
            ...deal,
            propertiesShared: updatedProperties,
            timelineEvents: [newEvent, ...(deal.timelineEvents || [])]
        });
    };

    if (properties.length === 0) {
        return (
            <div className="section-card">
                <div className="section-card__header">
                    <span className="section-card__icon">🏠</span>
                    <span className="section-card__title">Shared Properties</span>
                </div>
                <div className="section-empty-state">
                    No properties shared yet.
                </div>
            </div>
        );
    }

    return (
        <div className="section-card">
            <div className="section-card__header">
                <span className="section-card__icon">🏠</span>
                <span className="section-card__title">Shared Properties ({properties.length})</span>
            </div>

            <div className="properties-list">
                {properties.map((prop) => (
                    <div key={prop.id} className={`properties-list__item ${prop.isHot ? 'hot' : ''}`}>
                        <span className="properties-list__address">{prop.address}</span>

                        <div className="properties-list__badges">
                            {prop.isFavourite && <span className="badge badge--star">⭐ Favourite</span>}
                            {prop.isHot && <span className="badge badge--hot">🔥 Hot Property</span>}
                        </div>

                        <div className="properties-list__feedback">
                            <div className="feedback-controls">
                                <button
                                    className={`feedback-indicator feedback-indicator--like ${prop.feedback === 'like' ? 'active' : ''}`}
                                    onClick={() => handleAction(prop.id, 'like')}
                                >
                                    👍
                                </button>
                                <button
                                    className={`feedback-indicator feedback-indicator--dislike ${prop.feedback === 'dislike' ? 'active' : ''}`}
                                    onClick={() => handleAction(prop.id, 'dislike')}
                                >
                                    👎
                                </button>
                            </div>

                            <button
                                className="section-action-btn"
                                onClick={() => handleAction(prop.id, 'contact')}
                            >
                                💬 Contact Agent
                            </button>
                        </div>

                        {prop.auctionDate && (
                            <div className="properties-list__auction">
                                ⚖️ Auction: {new Date(prop.auctionDate).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
