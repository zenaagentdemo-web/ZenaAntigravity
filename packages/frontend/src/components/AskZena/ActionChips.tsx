import React from 'react';
import './ActionChips.css';

export interface ActionChip {
    label: string;
    icon: string;
    onClick: () => void;
}

interface ActionChipsProps {
    chips: ActionChip[];
}

export const ActionChips: React.FC<ActionChipsProps> = ({ chips }) => {
    if (chips.length === 0) return null;

    return (
        <div className="action-chips">
            {chips.map((chip, index) => (
                <button
                    key={index}
                    className="action-chip"
                    onClick={chip.onClick}
                >
                    <span className="action-chip__icon">{chip.icon}</span>
                    <span className="action-chip__label">{chip.label}</span>
                </button>
            ))}
        </div>
    );
};
