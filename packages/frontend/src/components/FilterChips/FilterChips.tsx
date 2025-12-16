/**
 * FilterChips Component
 * 
 * Horizontal scrollable filter chips for the New page thread list.
 * Implements glassmorphism pill styling with cyan glow active state.
 * 
 * Requirements: 6.1, 6.2
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { FilterType, FilterOption } from '../../models/newPage.types';
import './FilterChips.css';

export interface FilterChipsProps {
  /** Available filter options with counts */
  filters: FilterOption[];
  /** Currently active filters */
  activeFilters: FilterType[];
  /** Callback when filters change */
  onFilterChange: (filters: FilterType[]) => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * Default filter options for the New page
 */
export const DEFAULT_FILTER_OPTIONS: Omit<FilterOption, 'count'>[] = [
  { type: 'all', label: 'All' },
  { type: 'buyer', label: 'Buyers' },
  { type: 'vendor', label: 'Vendors' },
  { type: 'normal', label: 'Normal' },
  { type: 'high_risk', label: 'High Risk' }
];

/**
 * FilterChips component for filtering thread list
 */
export const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  activeFilters,
  onFilterChange,
  className = ''
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Handle filter chip click
   * Requirement 6.2: Apply filter with smooth list transition
   */
  /**
   * Handle filter chip click
   * Requirement: Strictly Exclusive (XOR) Logic
   * Clicking a filter switches to that filter immediately, replacing any other.
   * Clicking the currently active filter keeps it active (no toggle off to empty).
   */
  const handleFilterClick = useCallback((filterType: FilterType) => {
    // Always switch directly to the selected filter
    // This enforces single-selection XOR logic as requested
    onFilterChange([filterType]);
  }, [onFilterChange]);

  /**
   * Check if a filter is active
   */
  const isFilterActive = useCallback((filterType: FilterType): boolean => {
    return activeFilters.includes(filterType);
  }, [activeFilters]);

  /**
   * Scroll active filter into view on mount
   */
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeChip = scrollContainerRef.current.querySelector('.filter-chip--active');
      if (activeChip) {
        activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, []);

  /**
   * Get count for active filters (excluding 'all')
   */
  const activeFilterCount = activeFilters.filter(f => f !== 'all').length;

  return (
    <div
      className={`filter-chips ${className}`.trim()}
      role="group"
      aria-label="Thread filters"
    >
      <div
        ref={scrollContainerRef}
        className="filter-chips__scroll-container"
      >
        <div className="filter-chips__list">
          {filters.map((filter) => {
            const isActive = isFilterActive(filter.type);
            return (
              <button
                key={filter.type}
                type="button"
                className={`filter-chip ${isActive ? 'filter-chip--active' : ''}`}
                onClick={() => handleFilterClick(filter.type)}
                aria-pressed={isActive}
                aria-label={`Filter by ${filter.label}${filter.count > 0 ? `, ${filter.count} threads` : ''}`}
              >
                <span className="filter-chip__label">{filter.label}</span>
                {filter.count > 0 && filter.type !== 'all' && (
                  <span className="filter-chip__count">{filter.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active filter count badge */}
      {activeFilterCount > 1 && (
        <div className="filter-chips__active-count" aria-live="polite">
          <span className="filter-chips__active-count-badge">
            {activeFilterCount} active
          </span>
        </div>
      )}
    </div>
  );
};

export default FilterChips;
