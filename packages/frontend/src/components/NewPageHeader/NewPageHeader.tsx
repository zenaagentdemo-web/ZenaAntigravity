/**
 * NewPageHeader Component
 * 
 * Header component for the enhanced New page displaying title with gradient text,
 * thread count with urgency breakdown, refresh button, search toggle, and
 * scroll-aware compact mode.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.5
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HamburgerMenu } from '../HamburgerMenu/HamburgerMenu';
import { SyncStatus } from '../../models/newPage.types';
import { FilterType } from '../../models/newPage.types';
import './NewPageHeader.css';


export interface NewPageHeaderProps {
  /** Total number of threads */
  threadCount: number;
  /** Number of urgent (high risk) threads */
  urgentCount: number;
  /** Whether header should be in compact mode */
  isCompact: boolean;
  /** Current sync status */
  syncStatus: SyncStatus;
  /** Callback when refresh button is clicked */
  onRefresh: () => void;
  /** Callback when search query changes */
  onSearch: (query: string) => void;
  /** Callback when batch mode is toggled */
  onToggleBatchMode?: () => void;
  /** Whether batch mode is active */
  isBatchMode?: boolean;
  /** Callback to change filters (for Urgent/Normal pills) */
  onFilterChange: (filters: FilterType[]) => void;
  /** Callback when View Folders is clicked */
  onViewFolders?: () => void;
  /** Callback when Create Folder is clicked */
  onCreateFolder?: () => void;
  /** Active folder name for display (when filtering by folder) */
  activeFolderName?: string;
  /** Callback to clear folder filter */
  onClearFolder?: () => void;
  /** Optional title for the header */
  title?: string;
  /** Optional className for styling */
  className?: string;
}

/**
 * NewPageHeader - Enhanced header for the New page
 * 
 * Features:
 * - Gradient text title (cyan to purple)
 * - Thread count with urgency breakdown badges
 * - Refresh button with rotation animation
 * - Search toggle with expandable input
 * - Scroll-aware compact mode
 * - Pulsing notification dot for urgent threads
 * - Batch mode toggle
 */
export const NewPageHeader: React.FC<NewPageHeaderProps> = ({
  threadCount,
  urgentCount,
  isCompact,
  syncStatus,
  onRefresh,
  onSearch,
  onToggleBatchMode,
  isBatchMode = false,
  onViewFolders,
  onCreateFolder,
  activeFolderName,
  onClearFolder,
  title = 'New mail',
  className = ''
}) => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, onSearch]);

  // Handle refresh with animation
  const handleRefresh = useCallback(async () => {
    if (syncStatus === 'syncing' || isRefreshing) return;

    setIsRefreshing(true);
    await onRefresh();

    // Keep animation for at least 500ms for visual feedback
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  }, [onRefresh, syncStatus, isRefreshing]);

  // Toggle search
  const handleSearchToggle = useCallback(() => {
    setIsSearchOpen(prev => {
      if (prev) {
        // Closing search - clear query
        setSearchQuery('');
        onSearch('');
      }
      return !prev;
    });
  }, [onSearch]);

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Handle search input key events
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setSearchQuery('');
      onSearch('');
    }
  }, [onSearch]);



  const headerClasses = [
    'new-page-header',
    isCompact ? 'new-page-header--compact' : '',
    isSearchOpen ? 'new-page-header--search-open' : '',
    className
  ].filter(Boolean).join(' ');

  // Handle Back Click
  const handleBackClick = () => {
    navigate('/'); // Go back to main dashboard
  };

  return (
    <header className={headerClasses} role="banner" data-testid="new-page-header">
      <div className="new-page-header__container">

        {/* Prominent Back Button */}
        <button
          className="new-page-header__back-btn-prominent"
          onClick={handleBackClick}
          aria-label="Go back to Home"
          data-testid="header-back-btn"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Title Section */}
        <div className="new-page-header__title-section">
          <h1 className="new-page-header__title" data-testid="header-title">
            {title}
            {urgentCount > 0 && (
              <span
                className="new-page-header__notification-dot"
                aria-label={`${urgentCount} urgent threads`}
                data-testid="urgent-notification-dot"
              />
            )}
          </h1>

          {!isCompact && (
            <div className="new-page-header__stats" data-testid="header-stats">
              <span className="new-page-header__count" data-testid="thread-count">
                {threadCount} thread{threadCount !== 1 ? 's' : ''}
              </span>
              {urgentCount > 0 && (
                <div className="new-page-header__urgent-badge" data-testid="urgent-badge">
                  <span>{urgentCount} urgent</span>
                </div>
              )}
            </div>
          )}

          {/* Active Folder Badge */}

          {/* Active Folder Badge */}
          {activeFolderName && (
            <div className="new-page-header__folder-badge" data-testid="folder-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span className="new-page-header__folder-name">{activeFolderName}</span>
              {onClearFolder && (
                <button
                  className="new-page-header__folder-clear"
                  onClick={onClearFolder}
                  aria-label="Clear folder filter"
                  data-testid="clear-folder-button"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Actions Section */}
        <div className="new-page-header__actions">
          {/* Search Input (expandable) */}
          <div className={`new-page-header__search ${isSearchOpen ? 'new-page-header__search--open' : ''}`}>
            {isSearchOpen && (
              <input
                ref={searchInputRef}
                type="text"
                className="new-page-header__search-input"
                placeholder="Search threads..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                aria-label="Search threads"
                data-testid="search-input"
              />
            )}

            <button
              className="new-page-header__action-btn new-page-header__search-toggle"
              onClick={handleSearchToggle}
              aria-label={isSearchOpen ? 'Close search' : 'Open search'}
              aria-expanded={isSearchOpen}
              data-testid="search-toggle"
            >
              {isSearchOpen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              )}
            </button>
          </div>

          {/* Sync Status Indicator - Syncing */}
          {syncStatus === 'syncing' && (
            <span
              className="new-page-header__sync-indicator new-page-header__sync-indicator--syncing"
              aria-label="Syncing data"
              data-testid="sync-indicator"
            >
              <svg className="new-page-header__sync-icon new-page-header__sync-icon--rotating" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </span>
          )}

          {/* Offline Indicator */}
          {syncStatus === 'offline' && (
            <span
              className="new-page-header__sync-indicator new-page-header__sync-indicator--offline"
              aria-label="You are offline"
              data-testid="offline-indicator"
            >
              <svg className="new-page-header__offline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
                <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <line x1="12" y1="20" x2="12.01" y2="20" />
              </svg>
            </span>
          )}

          {/* Error Indicator */}
          {syncStatus === 'error' && (
            <span
              className="new-page-header__sync-indicator new-page-header__sync-indicator--error"
              aria-label="Sync error"
              data-testid="error-indicator"
            >
              <svg className="new-page-header__error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </span>
          )}

          {/* Select/Batch Mode Button */}
          {onToggleBatchMode && (
            <button
              className={`new-page-header__action-btn new-page-header__select-btn ${isBatchMode ? 'new-page-header__select-btn--active' : ''}`}
              onClick={onToggleBatchMode}
              aria-label={isBatchMode ? "Exit selection mode" : "Enter selection mode"}
              aria-pressed={isBatchMode}
              data-testid="batch-mode-toggle"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <span className="new-page-header__select-label">Select</span>
            </button>
          )}

          {/* Create Folder Quick Action */}
          {onCreateFolder && (
            <button
              className="new-page-header__action-btn"
              onClick={onCreateFolder}
              aria-label="Create new folder"
              title="Create new folder"
              data-testid="quick-create-folder"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </button>
          )}

          {/* Refresh Button */}
          <button
            className={`new-page-header__action-btn new-page-header__refresh-btn ${isRefreshing || syncStatus === 'syncing' ? 'new-page-header__refresh-btn--spinning' : ''}`}
            onClick={handleRefresh}
            disabled={syncStatus === 'syncing'}
            aria-label="Refresh threads"
            data-testid="refresh-button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>

          {/* Hamburger Menu - Email Options */}
          {onViewFolders && onCreateFolder && (
            <HamburgerMenu
              onViewFolders={onViewFolders}
              onCreateFolder={onCreateFolder}
              onRefresh={onRefresh}
            />
          )}
        </div>
      </div>
    </header >
  );
};

export default NewPageHeader;
