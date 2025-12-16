import React from 'react';
import { useOffline } from '../../hooks/useOffline';
import './SyncStatusIndicator.css';

export interface SyncStatusIndicatorProps {
  /** Position of the indicator */
  position?: 'top-right' | 'bottom-right' | 'inline';
  /** Show detailed sync information */
  showDetails?: boolean;
  /** Custom className */
  className?: string;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  position = 'top-right',
  showDetails = false,
  className = '',
}) => {
  const { isOnline, isSyncing, pendingActions, lastSyncTime, dataFreshness } = useOffline();

  // Format last sync time
  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Determine sync status
  const getSyncStatus = () => {
    if (isSyncing) {
      return {
        type: 'syncing' as const,
        message: pendingActions > 0 ? `Syncing ${pendingActions} action${pendingActions > 1 ? 's' : ''}` : 'Syncing data',
        icon: 'sync',
      };
    }

    if (!isOnline) {
      return {
        type: 'offline' as const,
        message: 'Offline',
        icon: 'offline',
        details: pendingActions > 0 ? `${pendingActions} action${pendingActions > 1 ? 's' : ''} queued` : 'Showing cached data',
      };
    }

    if (dataFreshness === 'stale') {
      return {
        type: 'stale' as const,
        message: 'Data may be outdated',
        icon: 'warning',
        details: `Last synced ${formatLastSync(lastSyncTime)}`,
      };
    }

    // Online and fresh - show minimal indicator
    return {
      type: 'online' as const,
      message: 'Up to date',
      icon: 'check',
      details: lastSyncTime ? `Last synced ${formatLastSync(lastSyncTime)}` : undefined,
    };
  };

  const status = getSyncStatus();
  const baseClassName = `sync-status-indicator sync-status-indicator--${status.type} sync-status-indicator--${position}`;
  const fullClassName = `${baseClassName} ${className}`.trim();

  // Don't show anything if online and fresh and not showing details
  if (status.type === 'online' && !showDetails) {
    return null;
  }

  const renderIcon = () => {
    switch (status.icon) {
      case 'sync':
        return (
          <svg className="sync-status-indicator__icon sync-status-indicator__icon--spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        );
      case 'offline':
        return (
          <svg className="sync-status-indicator__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="sync-status-indicator__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      case 'check':
        return (
          <svg className="sync-status-indicator__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={fullClassName} role="status" aria-live="polite">
      {renderIcon()}
      <div className="sync-status-indicator__content">
        <span className="sync-status-indicator__message">{status.message}</span>
        {(showDetails || status.type !== 'online') && status.details && (
          <span className="sync-status-indicator__details">{status.details}</span>
        )}
      </div>
    </div>
  );
};