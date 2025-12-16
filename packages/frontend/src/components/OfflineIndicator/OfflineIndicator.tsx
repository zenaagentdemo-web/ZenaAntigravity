import React from 'react';
import { useOffline } from '../../hooks/useOffline';
import './OfflineIndicator.css';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, isSyncing, pendingActions } = useOffline();

  // Show syncing indicator when actively syncing
  if (isSyncing) {
    return (
      <div className="offline-indicator offline-indicator--syncing" role="status" aria-live="polite">
        <svg className="offline-indicator__icon offline-indicator__icon--spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
        <span className="offline-indicator__text">
          Syncing {pendingActions > 0 ? `${pendingActions} action${pendingActions > 1 ? 's' : ''}` : 'data'}...
        </span>
      </div>
    );
  }

  // Show offline indicator only when actually offline
  if (!isOnline) {
    return (
      <div className="offline-indicator offline-indicator--offline" role="status" aria-live="polite">
        <svg className="offline-indicator__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
        <div className="offline-indicator__content">
          <span className="offline-indicator__text">You're offline. Limited functionality available.</span>
          {pendingActions > 0 && (
            <span className="offline-indicator__pending">
              {pendingActions} action{pendingActions > 1 ? 's' : ''} will sync when online
            </span>
          )}
        </div>
      </div>
    );
  }

  // Don't show anything when online - per requirement 3.1
  return null;
};
