import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import { usePersonalization } from '../../hooks/usePersonalization';
import { AddNoteModal } from '../AddNoteModal/AddNoteModal';
import { api } from '../../utils/apiClient';
import './QuickActionsPanel.css';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  shortcut?: string;
  usage_frequency: number;
  loading?: boolean;
  disabled?: boolean;
  action: () => void | Promise<void>;
}

export interface QuickActionsPanelProps {
  actions?: QuickAction[];
  onActionTrigger?: (actionId: string) => void;
  customizable?: boolean;
  className?: string;
  loading?: boolean;
  maxActions?: number;
  gridColumns?: 2 | 3 | 4;
}

export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  actions: customActions,
  onActionTrigger,
  customizable = true,
  className = '',
  loading = false,
  maxActions = 4,
  gridColumns = 2,
}) => {
  const navigate = useNavigate();
  const { uploadVoiceNote, isProcessing: isUploading } = useVoiceInteraction();
  const { trackUsage, getPrioritizedQuickActions, getActionFrequency } = usePersonalization();
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [actionLoadingStates, setActionLoadingStates] = useState<Record<string, boolean>>({});
  const [focusedActionId, setFocusedActionId] = useState<string | null>(null);

  // Default actions with professional icons and enhanced functionality
  const defaultActions: QuickAction[] = [
    {
      id: 'voice-note',
      label: 'Voice Note',
      icon: '🎤',
      color: 'primary',
      shortcut: 'V',
      usage_frequency: 0,
      loading: showNoteModal,
      action: handleVoiceNoteAction,
    },
    {
      id: 'ask-zena',
      label: 'Ask Zena',
      icon: '🤖',
      color: 'info',
      shortcut: 'Z',
      usage_frequency: 0,
      action: handleAskZenaAction,
    },
    {
      id: 'quick-call',
      label: 'Quick Call',
      icon: '📞',
      color: 'success',
      shortcut: 'C',
      usage_frequency: 0,
      action: handleQuickCallAction,
    },
    {
      id: 'focus-threads',
      label: 'Focus',
      icon: '🎯',
      color: 'info',
      shortcut: 'F',
      usage_frequency: 0,
      action: handleFocusAction,
    },
    {
      id: 'property-search',
      label: 'Properties',
      icon: '🏠',
      color: 'warning',
      shortcut: 'P',
      usage_frequency: 0,
      action: handlePropertySearchAction,
    },
  ];

  const [actions, setActions] = useState<QuickAction[]>(customActions || defaultActions);

  // Update actions based on personalization
  useEffect(() => {
    if (!customActions) {
      const prioritizedActionIds = getPrioritizedQuickActions();

      // Reorder default actions based on personalization
      const reorderedActions = prioritizedActionIds
        .map(actionId => defaultActions.find(action => action.id === actionId))
        .filter(Boolean) as QuickAction[];

      // Add any missing default actions
      const missingActions = defaultActions.filter(
        action => !prioritizedActionIds.includes(action.id)
      );

      const finalActions = [...reorderedActions, ...missingActions].map(action => ({
        ...action,
        usage_frequency: getActionFrequency(action.id, 'week'),
      }));

      setActions(finalActions);
    }
  }, [customActions, getPrioritizedQuickActions, getActionFrequency]);

  // Voice Note Action Handler - Now opens the standardized AddNoteModal
  async function handleVoiceNoteAction() {
    setShowNoteModal(true);
    trackUsage('voice-note');
    if (onActionTrigger) onActionTrigger('voice-note');

    // Provide haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  const handleSaveNote = async (noteData: { content: string; type: string; linkedPropertyId?: string; linkedDealId?: string }) => {
    try {
      // If linked to a property, use the property-specific endpoint
      if (noteData.linkedPropertyId) {
        await api.post(`/api/timeline/notes`, {
          entityType: 'property',
          entityId: noteData.linkedPropertyId,
          summary: noteData.content,
          type: 'voice_note'
        });
      } else if (noteData.linkedDealId) {
        await api.post(`/api/timeline/notes`, {
          entityType: 'deal',
          entityId: noteData.linkedDealId,
          summary: noteData.content,
          type: 'voice_note'
        });
      } else {
        // Fallback: Create a voice note that will be processed or just show up in recent activity
        // For now, let's use a generic catch-all OR create a task if it looks like one
        // Given the current backend, we'll use a generic entry or link to the first contact/property if needed
        // But the best approach for "Quick Note" is to create a timeline event of type 'note' 
        // linked to a system or generic entity if possible, or just skip entity requirement if backend allows.

        // As seen in timelineService, entityType and entityId are required. 
        // We'll use 'voice_note' as entityType for generic notes.
        await api.post(`/api/timeline/notes`, {
          entityType: 'property', // Default to property since that's a common anchor
          entityId: 'generic_note', // Placeholder for generic notes
          summary: noteData.content,
          type: 'voice_note'
        });
      }
    } catch (error) {
      console.error('Failed to save quick note:', error);
      throw error;
    }
  };

  // Ask Zena Action Handler with loading state
  async function handleAskZenaAction() {
    setActionLoadingStates(prev => ({ ...prev, 'ask-zena': true }));

    try {
      // Provide haptic feedback if supported
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 200));
      navigate('/ask-zena');
    } finally {
      setActionLoadingStates(prev => ({ ...prev, 'ask-zena': false }));
    }
  }

  // Focus Threads Action Handler with loading state
  async function handleFocusAction() {
    setActionLoadingStates(prev => ({ ...prev, 'focus-threads': true }));

    try {
      // Provide haptic feedback if supported
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 200));
      navigate('/focus');
    } finally {
      setActionLoadingStates(prev => ({ ...prev, 'focus-threads': false }));
    }
  }

  // Quick Call Action Handler - opens contact picker or dialer
  async function handleQuickCallAction() {
    setActionLoadingStates(prev => ({ ...prev, 'quick-call': true }));

    try {
      // Provide haptic feedback if supported
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 30, 50]);
      }

      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 200));

      // Navigate to contacts with call intent
      // In a real app, this could open a native dialer or contact picker
      navigate('/contacts?action=call');
    } finally {
      setActionLoadingStates(prev => ({ ...prev, 'quick-call': false }));
    }
  }

  // Property Search Action Handler with loading state
  async function handlePropertySearchAction() {
    setActionLoadingStates(prev => ({ ...prev, 'property-search': true }));

    try {
      // Provide haptic feedback if supported
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 200));
      navigate('/properties');
    } finally {
      setActionLoadingStates(prev => ({ ...prev, 'property-search': false }));
    }
  }

  // Track usage with personalization context
  const trackActionUsage = useCallback((actionId: string) => {
    // Get current context for better personalization
    const urgencyLevel = 'medium'; // This would come from dashboard state
    const dealTypes: string[] = []; // This would come from current deals context

    trackUsage(actionId, { urgencyLevel, dealTypes });

    // Update local action frequency display
    setActions(prevActions =>
      prevActions.map(action => ({
        ...action,
        usage_frequency: action.id === actionId
          ? getActionFrequency(actionId, 'week') + 1
          : action.usage_frequency,
      }))
    );
  }, [trackUsage, getActionFrequency]);

  // Handle action trigger with loading state support
  const handleActionClick = useCallback(async (action: QuickAction) => {
    // Don't execute if action is disabled or already loading
    if (action.disabled || actionLoadingStates[action.id]) {
      return;
    }

    try {
      // Track usage for personalization
      trackActionUsage(action.id);

      // Execute action (may be async)
      const result = action.action();
      if (result instanceof Promise) {
        await result;
      }

      // Call external handler if provided
      if (onActionTrigger) {
        onActionTrigger(action.id);
      }
    } catch (error) {
      console.error(`Failed to execute action ${action.id}:`, error);

      // Show user-friendly error message
      alert(`Failed to execute ${action.label}. Please try again.`);
    }
  }, [trackActionUsage, onActionTrigger, actionLoadingStates]);

  // Enhanced keyboard navigation and shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Handle Alt + key combinations for shortcuts
      if (event.altKey) {
        const action = actions.find(a => a.shortcut?.toLowerCase() === event.key.toLowerCase());
        if (action && !action.disabled && !actionLoadingStates[action.id]) {
          event.preventDefault();
          handleActionClick(action);
        }
        return;
      }

      // Handle arrow key navigation within the panel
      if (event.target instanceof HTMLButtonElement &&
        event.target.closest('.quick-actions-panel__grid')) {

        const buttons = Array.from(
          document.querySelectorAll('.quick-action-button:not([disabled])')
        ) as HTMLButtonElement[];

        const currentIndex = buttons.indexOf(event.target);
        let nextIndex = currentIndex;

        switch (event.key) {
          case 'ArrowRight':
            nextIndex = (currentIndex + 1) % buttons.length;
            break;
          case 'ArrowLeft':
            nextIndex = currentIndex === 0 ? buttons.length - 1 : currentIndex - 1;
            break;
          case 'ArrowDown':
            nextIndex = Math.min(currentIndex + gridColumns, buttons.length - 1);
            break;
          case 'ArrowUp':
            nextIndex = Math.max(currentIndex - gridColumns, 0);
            break;
          case 'Home':
            nextIndex = 0;
            break;
          case 'End':
            nextIndex = buttons.length - 1;
            break;
          default:
            return;
        }

        if (nextIndex !== currentIndex) {
          event.preventDefault();
          buttons[nextIndex]?.focus();
          setFocusedActionId(actions[nextIndex]?.id || null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [actions, handleActionClick, actionLoadingStates, gridColumns]);

  // Skeleton loading component
  const SkeletonAction = () => (
    <div className="quick-action-button quick-action-button--skeleton" aria-hidden="true">
      <div className="skeleton skeleton--action-icon" />
      <div className="skeleton skeleton--action-label" />
      <div className="skeleton skeleton--action-shortcut" />
    </div>
  );

  // Limit actions to maxActions
  const displayActions = actions.slice(0, maxActions);

  return (
    <section
      className={`quick-actions-panel ${className} ${loading ? 'quick-actions-panel--loading' : ''}`}
      role="region"
      aria-labelledby="quick-actions-title"
      aria-busy={loading}
    >
      <div className="quick-actions-panel__header">
        {loading ? (
          <div className="skeleton skeleton--panel-title" aria-hidden="true" />
        ) : (
          <h2 id="quick-actions-title" className="quick-actions-panel__title">Quick Actions</h2>
        )}
        {customizable && !loading && (
          <button
            className="quick-actions-panel__customize"
            onClick={() => console.log('Customize actions')}
            aria-label="Customize quick actions layout and preferences"
            title="Customize quick actions"
          >
            <span aria-hidden="true">⚙️</span>
            <span className="sr-only">Settings</span>
          </button>
        )}
        {loading && (
          <div className="skeleton skeleton--customize-button" aria-hidden="true" />
        )}
      </div>

      <div
        className={`quick-actions-panel__grid quick-actions-panel__grid--${gridColumns}-columns`}
        role="group"
        aria-label="Available quick actions"
        style={{ '--grid-columns': gridColumns } as React.CSSProperties}
      >
        {loading ? (
          // Show skeleton loading state
          Array.from({ length: maxActions }, (_, index) => (
            <SkeletonAction key={`skeleton-${index}`} />
          ))
        ) : (
          displayActions.map((action, index) => {
            const isActionLoading = actionLoadingStates[action.id] || action.loading;
            const isActionDisabled = action.disabled || isActionLoading;
            const isVoiceNoteActive = action.id === 'voice-note' && showNoteModal;

            return (
              <button
                key={action.id}
                className={`quick-action-button quick-action-button--${action.color} ${isVoiceNoteActive ? 'quick-action-button--active' : ''
                  } ${isActionLoading ? 'quick-action-button--loading' : ''} ${focusedActionId === action.id ? 'quick-action-button--focused' : ''
                  }`}
                onClick={() => handleActionClick(action)}
                disabled={isActionDisabled}
                onFocus={() => setFocusedActionId(action.id)}
                onBlur={() => setFocusedActionId(null)}
                aria-label={`${action.label}${action.shortcut ? `. Keyboard shortcut: Alt plus ${action.shortcut}` : ''}${isActionLoading ? '. Loading' :
                  action.id === 'voice-note' && showNoteModal ? '. Modal open' : ''
                  }`}
                aria-describedby={`${action.id}-description`}
                aria-pressed={isVoiceNoteActive}
                title={`${action.label}${action.shortcut ? ` (Alt+${action.shortcut})` : ''}`}
                data-voice-command={action.label.toLowerCase().replace(/\s+/g, '-')}
                data-action-id={action.id}
              >
                <div className="quick-action-button__icon" aria-hidden="true">
                  {isActionLoading ? (
                    <div className="quick-action-button__spinner" />
                  ) : (
                    action.icon
                  )}
                </div>
                <span className="quick-action-button__label">
                  {isActionLoading ? 'Loading...' : action.label}
                </span>
                {action.shortcut && !isActionLoading && (
                  <span className="quick-action-button__shortcut" aria-hidden="true">
                    Alt+{action.shortcut}
                  </span>
                )}
                {customizable && action.usage_frequency > 0 && !isActionLoading && (
                  <span
                    className="quick-action-button__usage"
                    aria-label={`Used ${action.usage_frequency} times this week`}
                  >
                    {action.usage_frequency}
                  </span>
                )}
                <span id={`${action.id}-description`} className="sr-only">
                  {action.id === 'voice-note' ? 'Record a voice note for quick input' :
                    action.id === 'ask-zena' ? 'Open the AI assistant chat interface' :
                      action.id === 'focus-threads' ? 'View threads requiring immediate attention' :
                        action.id === 'quick-call' ? 'Quickly call a contact from your list' :
                          action.id === 'property-search' ? 'Search and browse property listings' :
                            `Activate ${action.label} feature`}
                </span>
              </button>
            );
          })
        )}
      </div>

      {showNoteModal && (
        <AddNoteModal
          isOpen={showNoteModal}
          onClose={() => setShowNoteModal(false)}
          onSave={handleSaveNote}
        />
      )}
    </section>
  );
};