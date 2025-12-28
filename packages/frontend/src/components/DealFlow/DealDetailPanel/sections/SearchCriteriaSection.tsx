/**
 * SearchCriteriaSection - Displays buyer's search preferences
 */

import React from 'react';
import { Deal } from '../../types';
import './sections.css';

interface SearchCriteriaSectionProps {
    deal: Deal;
}

export const SearchCriteriaSection: React.FC<SearchCriteriaSectionProps> = ({ deal }) => {
    // In a real app, this would come from deal.searchCriteria
    // Mocking it based on deal data for now
    const criteria = (deal as any).searchCriteria || {
        propertyType: 'House / Townhouse',
        location: ['Remuera', 'Parnell', 'St Heliers'],
        priceRange: { min: 2000000, max: 3500000 },
        bedrooms: '3+',
        bathrooms: '2+',
        mustHaves: ['Double Grammar Zone', 'Modern Kitchen', 'Outdoor Flow'],
    };

    return (
        <div className="section-card">
            <div className="section-card__header">
                <span className="section-card__icon">🔍</span>
                <span className="section-card__title">Search Criteria</span>
            </div>

            <div className="search-criteria__grid">
                <div className="search-criteria__item">
                    <span className="search-criteria__label">Type</span>
                    <span className="search-criteria__value">{criteria.propertyType}</span>
                </div>
                <div className="search-criteria__item">
                    <span className="search-criteria__label">Price</span>
                    <span className="search-criteria__value">
                        {criteria.priceRange.min / 1000000}M - {criteria.priceRange.max / 1000000}M
                    </span>
                </div>
                <div className="search-criteria__item">
                    <span className="search-criteria__label">Bedrooms</span>
                    <span className="search-criteria__value">{criteria.bedrooms}</span>
                </div>
            </div>

            <div className="search-criteria__locations">
                <span className="search-criteria__label">Suburbs</span>
                <div className="search-criteria__tags">
                    {criteria.location.map((loc: string) => (
                        <span key={loc} className="search-criteria__tag">{loc}</span>
                    ))}
                </div>
            </div>

            <div className="search-criteria__must-haves">
                <span className="search-criteria__label">Must Haves</span>
                <ul className="search-criteria__list">
                    {criteria.mustHaves.map((item: string) => (
                        <li key={item} className="search-criteria__list-item">{item}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
