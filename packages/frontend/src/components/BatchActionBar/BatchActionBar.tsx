/**
 * BatchActionBar Component
 * 
 * Floating action bar for batch operations on multiple threads.
 * Features glassmorphism styling, animated selection count, and batch action buttons.
 * 
 * Requirements: 7.2, 7.4, 7.6
 */

import React from 'react';
import { BatchAction } from '../../models/newPage.types';
import './BatchActionBar.css';

export interface BatchActionBarProps {
  /** Number of selected threads */
  selectedCount: number;
  /** Whether the action bar is visible */
  isVisible: boolean;
  /** Callback when a batch action is triggered */
  onAction: (action: BatchAction) => void;
  /** Callback when cancel/exit is triggered */
  onCancel: () => void;
  /** Optional className for styling */
  className?: string;
  /** Optional list of actions to show. If not provided, shows all thread actions. */
  actions?: BatchAction[];
}

/**
 * BatchActionBar Component
 * 
 * Displays a floating action bar at the bottom of the screen when in batch mode.
 * Shows selection count and provides batch action buttons.
 */
export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedCount,
  isVisible,
  onAction,
  onCancel,
  className = '',
  actions
}) => {
  if (!isVisible) {
    return null;
  }

  // Default actions if none provided (backwards compatibility for threads)
  const displayActions = actions || ['snooze_all', 'archive_all', 'mark_read', 'delete_all'];

  const handleSnoozeAll = () => {
    onAction('snooze_all');
  };

  const handleArchiveAll = () => {
    onAction('archive_all');
  };

  const handleMarkRead = () => {
    onAction('mark_read');
  };

  return (
    <div
      className={`batch-action-bar ${className}`}
      role="toolbar"
      aria-label="Batch actions"
      data-testid="batch-action-bar"
    >
      {/* Selection count with animation */}
      <div className="batch-action-bar__count" data-testid="selection-count">
        <span className="batch-action-bar__count-number" key={selectedCount}>
          {selectedCount}
        </span>
        <span className="batch-action-bar__count-label">
          {selectedCount === 1 ? 'record selected' : 'records selected'}
        </span>
      </div>

      {/* Action buttons */}
      <div className="batch-action-bar__actions">
        {displayActions.includes('snooze_all') && (
          <button
            className="batch-action-bar__button batch-action-bar__button--snooze"
            onClick={() => onAction('snooze_all')}
            disabled={selectedCount === 0}
            aria-label={`Snooze ${selectedCount} items`}
            data-testid="snooze-all-button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Snooze All</span>
          </button>
        )}

        {displayActions.includes('archive_all') && (
          <button
            className="batch-action-bar__button batch-action-bar__button--archive"
            onClick={() => onAction('archive_all')}
            disabled={selectedCount === 0}
            aria-label={`Archive ${selectedCount} items`}
            data-testid="archive-all-button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
            <span>Archive All</span>
          </button>
        )}

        {displayActions.includes('compose') && (
          <button
            className="batch-action-bar__button batch-action-bar__button--compose"
            onClick={() => onAction('compose')}
            disabled={selectedCount === 0}
            aria-label={`Compose message to ${selectedCount} recipients`}
            data-testid="compose-button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Compose</span>
          </button>
        )}

        {displayActions.includes('tag') && (
          <button
            className="batch-action-bar__button batch-action-bar__button--tag"
            onClick={() => onAction('tag')}
            disabled={selectedCount === 0}
            aria-label={`Add tag to ${selectedCount} items`}
            data-testid="tag-button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <span>Tag Intel</span>
          </button>
        )}

        {displayActions.includes('mark_read') && (
          <button
            className="batch-action-bar__button batch-action-bar__button--read"
            onClick={() => onAction('mark_read')}
            disabled={selectedCount === 0}
            aria-label={`Mark ${selectedCount} items as read`}
            data-testid="mark-read-button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>Mark Read</span>
          </button>
        )}

        {displayActions.includes('delete_all') && (
          <button
            className="batch-action-bar__button batch-action-bar__button--delete"
            onClick={() => onAction('delete_all')}
            disabled={selectedCount === 0}
            aria-label={`Delete ${selectedCount} items`}
            data-testid="delete-all-button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            <span>Delete All</span>
          </button>
        )}
      </div>

      {/* Cancel button */}
      <button
        className="batch-action-bar__cancel"
        onClick={onCancel}
        aria-label="Cancel batch selection"
        data-testid="cancel-button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

export default BatchActionBar;
