/**
 * useBatchState Hook
 * 
 * Manages batch selection state for the New page.
 * Implements batch mode entry/exit, selection toggle, select all, and clear.
 * 
 * Requirements: 7.1, 7.3, 7.5
 */

import { useState, useCallback, useMemo } from 'react';
import { Thread } from '../models/newPage.types';

export interface UseBatchStateReturn {
  /** Whether batch mode is currently active */
  isBatchMode: boolean;
  /** Set of selected thread IDs */
  selectedIds: Set<string>;
  /** Number of selected threads */
  selectedCount: number;
  /** Enter batch mode (typically triggered by long-press) */
  enterBatchMode: () => void;
  /** Toggle batch mode */
  toggleBatchMode: () => void;
  /** Exit batch mode and clear selections */
  exitBatchMode: () => void;
  /** Toggle selection of a specific thread */
  toggleSelection: (threadId: string) => void;
  /** Select all threads from the provided list */
  selectAll: (threads: Thread[]) => void;
  /** Clear all selections without exiting batch mode */
  clearSelection: () => void;
  /** Check if a specific thread is selected */
  isSelected: (threadId: string) => boolean;
}

/**
 * Hook for managing batch selection state
 */
export function useBatchState(): UseBatchStateReturn {
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /**
   * Enter batch mode
   * Requirement 7.1: Long-press enters batch mode
   */
  const enterBatchMode = useCallback((): void => {
    setIsBatchMode(true);
  }, []);

  /**
   * Exit batch mode and clear all selections
   * Requirement 7.5: Cancel or tap outside exits batch mode
   */
  const exitBatchMode = useCallback((): void => {
    setIsBatchMode(false);
    setSelectedIds(new Set());
  }, []);

  /**
   * Toggle batch mode on/off. If exiting, clears selections.
   */
  const toggleBatchMode = useCallback(() => {
    setIsBatchMode(prev => {
      if (prev) {
        // Exiting batch mode - clear selection
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  /**
   * Toggle selection of a specific thread
   * Requirement 7.3: Tapping a card toggles selection
   */
  const toggleSelection = useCallback((threadId: string): void => {
    setSelectedIds(currentIds => {
      const newIds = new Set(currentIds);
      if (newIds.has(threadId)) {
        newIds.delete(threadId);
      } else {
        newIds.add(threadId);
      }
      return newIds;
    });
  }, []);

  /**
   * Select all threads from the provided list
   */
  const selectAll = useCallback((threads: Thread[]): void => {
    setSelectedIds(new Set(threads.map(t => t.id)));
  }, []);

  /**
   * Clear all selections without exiting batch mode
   */
  const clearSelection = useCallback((): void => {
    setSelectedIds(new Set());
  }, []);

  /**
   * Check if a specific thread is selected
   */
  const isSelected = useCallback((threadId: string): boolean => {
    return selectedIds.has(threadId);
  }, [selectedIds]);

  /**
   * Calculate selected count
   * Requirement 7.4: Display selection count
   */
  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

  return {
    isBatchMode,
    selectedIds,
    selectedCount,
    enterBatchMode,
    exitBatchMode,
    toggleBatchMode,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected
  };
}

export default useBatchState;
