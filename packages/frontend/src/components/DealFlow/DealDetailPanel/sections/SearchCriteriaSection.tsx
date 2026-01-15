/**
 * PropertyDetailsSection - Displays property facts for the deal
 * Replaces SearchCriteriaSection for seller pipeline deals
 */

import React from 'react';
import { Home, Bed, Bath, Square, MapPin, DollarSign } from 'lucide-react';
import { Deal, formatCurrency } from '../../types';
import './sections.css';

interface PropertyDetailsSectionProps {
    deal: Deal;
}

export const PropertyDetailsSection: React.FC<PropertyDetailsSectionProps> = ({ deal }) => {
    const property = deal.property;

    // Format last sale date if available
    const formatDate = (dateString?: string) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.getFullYear().toString();
    };

    // If no property data available, show minimal placeholder
    if (!property) {
        return (
            <div className="section-card">
                <div className="section-card__header">
                    <Home size={16} className="section-card__icon-lucide" style={{ color: '#00ffc8' }} />
                    <span className="section-card__title">Property Details</span>
                </div>
                <div className="property-details__empty">
                    No property linked to this deal yet.
                </div>
            </div>
        );
    }

    // Helper to add units if missing
    const formatArea = (value: string) => {
        if (!value) return '';
        // If it already has text characters (likely units), return as is
        if (/[a-zA-Z²]/.test(value)) return value;
        return `${value} m²`;
    };

    return (
        <div className="section-card">
            <div className="section-card__header">
                <Home size={16} className="section-card__icon-lucide" style={{ color: '#00ffc8' }} />
                <span className="section-card__title">Property Details</span>
            </div>

            <div className="property-details__grid">
                {property.bedrooms !== undefined && (
                    <div className="property-details__item">
                        <Bed size={14} className="property-details__icon" />
                        <span className="property-details__label">Beds</span>
                        <span className="property-details__value">{property.bedrooms}</span>
                    </div>
                )}
                {property.bathrooms !== undefined && (
                    <div className="property-details__item">
                        <Bath size={14} className="property-details__icon" />
                        <span className="property-details__label">Baths</span>
                        <span className="property-details__value">{property.bathrooms}</span>
                    </div>
                )}
                {property.floorArea && (
                    <div className="property-details__item">
                        <Square size={14} className="property-details__icon" />
                        <span className="property-details__label">Floor</span>
                        <span className="property-details__value">{formatArea(property.floorArea)}</span>
                    </div>
                )}
                {property.landArea && (
                    <div className="property-details__item">
                        <MapPin size={14} className="property-details__icon" />
                        <span className="property-details__label">Land</span>
                        <span className="property-details__value">{formatArea(property.landArea)}</span>
                    </div>
                )}
            </div>

            {(property.lastSalePrice || property.listingPrice) && (
                <div className="property-details__pricing">
                    {property.lastSalePrice && (
                        <div className="property-details__price-row">
                            <DollarSign size={14} className="property-details__icon" />
                            <span className="property-details__label">Last Sale</span>
                            <span className="property-details__value property-details__value--price">
                                {formatCurrency(property.lastSalePrice)}
                                {property.lastSaleDate && ` (${formatDate(property.lastSaleDate)})`}
                            </span>
                        </div>
                    )}
                    {property.listingPrice && (
                        <div className="property-details__price-row">
                            <DollarSign size={14} className="property-details__icon" />
                            <span className="property-details__label">Listing</span>
                            <span className="property-details__value property-details__value--price">
                                {formatCurrency(property.listingPrice)}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Show placeholder if no detailed property data */}
            {!property.bedrooms && !property.bathrooms && !property.floorArea &&
                !property.landArea && !property.lastSalePrice && !property.listingPrice && (
                    <div className="property-details__empty">
                        Property details not available yet.
                    </div>
                )}
        </div>
    );
};

// Keep SearchCriteriaSection as an alias for backward compatibility
export { PropertyDetailsSection as SearchCriteriaSection };
