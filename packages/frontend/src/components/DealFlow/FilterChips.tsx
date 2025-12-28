import React from 'react';

export type FilterType = 'today' | 'overdue' | 'at-risk';

interface FilterChipsProps {
    todayCount: number;
    overdueCount: number;
    atRiskCount: number;
    activeFilter: FilterType | null;
    onFilterChange: (filter: FilterType | null) => void;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
    todayCount,
    overdueCount,
    atRiskCount,
    activeFilter,
    onFilterChange
}) => {
    const handleClick = (filter: FilterType) => {
        if (activeFilter === filter) {
            onFilterChange(null); // Toggle off
        } else {
            onFilterChange(filter);
        }
    };

    return (
        <div className="deal-flow__filters">
            <button
                className={`deal-flow__filter-chip deal-flow__filter-chip--today ${activeFilter === 'today' ? 'deal-flow__filter-chip--active' : ''
                    }`}
                onClick={() => handleClick('today')}
            >
                📅 Today
                <span className="deal-flow__filter-count">{todayCount}</span>
            </button>

            <button
                className={`deal-flow__filter-chip deal-flow__filter-chip--overdue ${activeFilter === 'overdue' ? 'deal-flow__filter-chip--active' : ''
                    }`}
                onClick={() => handleClick('overdue')}
            >
                ⚠️ Overdue
                <span className="deal-flow__filter-count">{overdueCount}</span>
            </button>

            <button
                className={`deal-flow__filter-chip deal-flow__filter-chip--at-risk ${activeFilter === 'at-risk' ? 'deal-flow__filter-chip--active' : ''
                    }`}
                onClick={() => handleClick('at-risk')}
            >
                🔔 At Risk
                <span className="deal-flow__filter-count">{atRiskCount}</span>
            </button>
        </div>
    );
};

export default FilterChips;
