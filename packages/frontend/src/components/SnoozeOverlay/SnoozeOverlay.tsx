/**
 * SnoozeOverlay Component
 * 
 * Glassmorphism modal for snoozing email threads with preset time options
 * and custom date picker functionality.
 * 
 * Requirements: 4.2
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SnoozeOptions } from '../../models/newPage.types';
import './SnoozeOverlay.css';

export interface SnoozeOverlayProps {
  /** Whether the overlay is visible */
  isOpen: boolean;
  /** Thread ID being snoozed */
  threadId: string | null;
  /** Thread subject for display */
  threadSubject?: string;
  /** Callback when snooze is confirmed */
  onConfirm: (threadId: string, options: SnoozeOptions) => void;
  /** Callback when overlay is closed/cancelled */
  onClose: () => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * Preset snooze duration options
 */
const PRESET_OPTIONS: Array<{
  duration: SnoozeOptions['duration'];
  label: string;
  icon: string;
  description: string;
}> = [
  {
    duration: '1h',
    label: '1 Hour',
    icon: '⏰',
    description: 'Snooze for 1 hour'
  },
  {
    duration: '4h',
    label: '4 Hours',
    icon: '🕓',
    description: 'Snooze for 4 hours'
  },
  {
    duration: 'tomorrow',
    label: 'Tomorrow',
    icon: '🌅',
    description: 'Snooze until tomorrow morning'
  },
  {
    duration: 'next_week',
    label: 'Next Week',
    icon: '📅',
    description: 'Snooze until next Monday'
  }
];

/**
 * Calculate the snooze until date based on duration
 */
export const calculateSnoozeDate = (duration: SnoozeOptions['duration'], customDate?: string): Date => {
  const now = new Date();
  
  switch (duration) {
    case '1h':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case '4h':
      return new Date(now.getTime() + 4 * 60 * 60 * 1000);
    case 'tomorrow': {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow
      return tomorrow;
    }
    case 'next_week': {
      const nextWeek = new Date(now);
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      nextWeek.setDate(nextWeek.getDate() + daysUntilMonday);
      nextWeek.setHours(9, 0, 0, 0); // 9 AM next Monday
      return nextWeek;
    }
    case 'custom':
      return customDate ? new Date(customDate) : now;
    default:
      return now;
  }
};

/**
 * Format date for display
 */
const formatSnoozeDate = (date: Date): string => {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  
  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  if (isToday) {
    return `Today at ${timeStr}`;
  }
  if (isTomorrow) {
    return `Tomorrow at ${timeStr}`;
  }
  
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * SnoozeOverlay Component
 */
export const SnoozeOverlay: React.FC<SnoozeOverlayProps> = ({
  isOpen,
  threadId,
  threadSubject,
  onConfirm,
  onClose,
  className = ''
}) => {
  const [selectedDuration, setSelectedDuration] = useState<SnoozeOptions['duration'] | null>(null);
  const [customDate, setCustomDate] = useState<string>('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // Reset state when overlay opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDuration(null);
      setCustomDate('');
      setShowCustomPicker(false);
      // Focus first button for accessibility
      setTimeout(() => firstButtonRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  }, [onClose]);

  // Handle preset selection
  const handlePresetSelect = useCallback((duration: SnoozeOptions['duration']) => {
    if (duration === 'custom') {
      setShowCustomPicker(true);
      setSelectedDuration('custom');
    } else {
      setSelectedDuration(duration);
      setShowCustomPicker(false);
    }
  }, []);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    if (!threadId || !selectedDuration) return;
    
    const options: SnoozeOptions = {
      duration: selectedDuration,
      customDate: selectedDuration === 'custom' ? customDate : undefined
    };
    
    onConfirm(threadId, options);
  }, [threadId, selectedDuration, customDate, onConfirm]);

  // Get minimum date for custom picker (now)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  // Calculate preview date
  const previewDate = selectedDuration 
    ? calculateSnoozeDate(selectedDuration, customDate)
    : null;

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      ref={overlayRef}
      className={`snooze-overlay ${className}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="snooze-title"
      data-testid="snooze-overlay"
    >
      <div className="snooze-overlay__modal">
        {/* Header */}
        <header className="snooze-overlay__header">
          <h2 id="snooze-title" className="snooze-overlay__title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Snooze Thread
          </h2>
          <button
            className="snooze-overlay__close"
            onClick={onClose}
            aria-label="Close snooze dialog"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* Thread subject preview */}
        {threadSubject && (
          <p className="snooze-overlay__subject">
            {threadSubject}
          </p>
        )}

        {/* Preset options */}
        <div className="snooze-overlay__options" role="group" aria-label="Snooze duration options">
          {PRESET_OPTIONS.map((option, index) => (
            <button
              key={option.duration}
              ref={index === 0 ? firstButtonRef : undefined}
              className={`snooze-overlay__option ${selectedDuration === option.duration ? 'snooze-overlay__option--selected' : ''}`}
              onClick={() => handlePresetSelect(option.duration)}
              aria-pressed={selectedDuration === option.duration}
              aria-label={option.description}
            >
              <span className="snooze-overlay__option-icon">{option.icon}</span>
              <span className="snooze-overlay__option-label">{option.label}</span>
            </button>
          ))}
          
          {/* Custom option */}
          <button
            className={`snooze-overlay__option snooze-overlay__option--custom ${selectedDuration === 'custom' ? 'snooze-overlay__option--selected' : ''}`}
            onClick={() => handlePresetSelect('custom')}
            aria-pressed={selectedDuration === 'custom'}
            aria-label="Choose custom date and time"
          >
            <span className="snooze-overlay__option-icon">🎯</span>
            <span className="snooze-overlay__option-label">Custom</span>
          </button>
        </div>

        {/* Custom date picker */}
        {showCustomPicker && (
          <div className="snooze-overlay__custom-picker">
            <label htmlFor="custom-datetime" className="snooze-overlay__custom-label">
              Choose date and time:
            </label>
            <input
              id="custom-datetime"
              type="datetime-local"
              className="snooze-overlay__custom-input"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              min={getMinDateTime()}
              aria-describedby="custom-datetime-hint"
            />
            <span id="custom-datetime-hint" className="snooze-overlay__custom-hint">
              Select when you want to be reminded about this thread
            </span>
          </div>
        )}

        {/* Preview */}
        {previewDate && selectedDuration && (selectedDuration !== 'custom' || customDate) && (
          <div className="snooze-overlay__preview" data-testid="snooze-preview">
            <span className="snooze-overlay__preview-label">Will reappear:</span>
            <span className="snooze-overlay__preview-date">
              {formatSnoozeDate(previewDate)}
            </span>
          </div>
        )}

        {/* Actions */}
        <footer className="snooze-overlay__footer">
          <button
            className="snooze-overlay__cancel-btn"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="snooze-overlay__confirm-btn"
            onClick={handleConfirm}
            disabled={!selectedDuration || (selectedDuration === 'custom' && !customDate)}
            data-testid="confirm-snooze"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Snooze
          </button>
        </footer>
      </div>
    </div>
  );
};

export default SnoozeOverlay;
