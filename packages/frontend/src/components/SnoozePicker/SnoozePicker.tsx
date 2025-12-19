/**
 * SnoozePicker Component
 * 
 * Modal for selecting snooze time for threads.
 * Provides quick options and custom date/time picker.
 */

import React, { useState } from 'react';
import './SnoozePicker.css';

interface SnoozePickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSnooze: (snoozeUntil: Date) => void;
}

interface SnoozeOption {
    label: string;
    icon: string;
    getDate: () => Date;
}

const SNOOZE_OPTIONS: SnoozeOption[] = [
    {
        label: 'Later today',
        icon: '☕',
        getDate: () => {
            const date = new Date();
            date.setHours(date.getHours() + 3);
            return date;
        }
    },
    {
        label: 'This evening',
        icon: '🌙',
        getDate: () => {
            const date = new Date();
            date.setHours(18, 0, 0, 0);
            if (date <= new Date()) {
                date.setDate(date.getDate() + 1);
            }
            return date;
        }
    },
    {
        label: 'Tomorrow morning',
        icon: '🌅',
        getDate: () => {
            const date = new Date();
            date.setDate(date.getDate() + 1);
            date.setHours(9, 0, 0, 0);
            return date;
        }
    },
    {
        label: 'Tomorrow afternoon',
        icon: '☀️',
        getDate: () => {
            const date = new Date();
            date.setDate(date.getDate() + 1);
            date.setHours(14, 0, 0, 0);
            return date;
        }
    },
    {
        label: 'Next week',
        icon: '📅',
        getDate: () => {
            const date = new Date();
            date.setDate(date.getDate() + 7);
            date.setHours(9, 0, 0, 0);
            return date;
        }
    },
    {
        label: 'Next month',
        icon: '🗓️',
        getDate: () => {
            const date = new Date();
            date.setMonth(date.getMonth() + 1);
            date.setHours(9, 0, 0, 0);
            return date;
        }
    }
];

export const SnoozePicker: React.FC<SnoozePickerProps> = ({
    isOpen,
    onClose,
    onSnooze
}) => {
    const [showCustom, setShowCustom] = useState(false);
    const [customDate, setCustomDate] = useState('');
    const [customTime, setCustomTime] = useState('09:00');

    const handleQuickOption = (option: SnoozeOption) => {
        onSnooze(option.getDate());
        onClose();
    };

    const handleCustomSnooze = () => {
        if (!customDate) return;

        const [year, month, day] = customDate.split('-').map(Number);
        const [hours, minutes] = customTime.split(':').map(Number);

        const snoozeDate = new Date(year, month - 1, day, hours, minutes);

        if (snoozeDate <= new Date()) {
            alert('Please select a future date and time');
            return;
        }

        onSnooze(snoozeDate);
        onClose();
    };

    const formatDate = (date: Date): string => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return date.toLocaleDateString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="snooze-picker__backdrop" onClick={onClose}>
            <div
                className="snooze-picker__modal"
                onClick={e => e.stopPropagation()}
            >
                <div className="snooze-picker__header">
                    <h3 className="snooze-picker__title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        Snooze Until
                    </h3>
                    <button
                        className="snooze-picker__close"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                {!showCustom ? (
                    <>
                        <div className="snooze-picker__options">
                            {SNOOZE_OPTIONS.map((option, index) => (
                                <button
                                    key={index}
                                    className="snooze-picker__option"
                                    onClick={() => handleQuickOption(option)}
                                >
                                    <span className="snooze-picker__option-icon">{option.icon}</span>
                                    <span className="snooze-picker__option-label">{option.label}</span>
                                    <span className="snooze-picker__option-time">
                                        {formatDate(option.getDate())}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <button
                            className="snooze-picker__custom-btn"
                            onClick={() => setShowCustom(true)}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            Pick a date & time
                        </button>
                    </>
                ) : (
                    <div className="snooze-picker__custom">
                        <button
                            className="snooze-picker__back"
                            onClick={() => setShowCustom(false)}
                        >
                            ← Back to options
                        </button>

                        <div className="snooze-picker__custom-inputs">
                            <div className="snooze-picker__input-group">
                                <label>Date</label>
                                <input
                                    type="date"
                                    value={customDate}
                                    onChange={(e) => setCustomDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="snooze-picker__input-group">
                                <label>Time</label>
                                <input
                                    type="time"
                                    value={customTime}
                                    onChange={(e) => setCustomTime(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            className="snooze-picker__confirm"
                            onClick={handleCustomSnooze}
                            disabled={!customDate}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            Snooze
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SnoozePicker;
