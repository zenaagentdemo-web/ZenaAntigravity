/**
 * useDropdownState Hook
 * 
 * Manages dropdown state for AI Summary dropdowns in ThreadCard components.
 * Implements single dropdown expansion logic ensuring only one dropdown is open at a time.
 * 
 * Requirements: 2.5
 */

import { useState, useCallback } from 'react';

export interface UseDropdownStateReturn {
  /** ID of the currently expanded dropdown (null if none) */
  expandedDropdownId: string | null;
  /** Toggle dropdown expansion for a specific thread */
  toggleDropdown: (threadId: string) => void;
  /** Close all dropdowns */
  closeAllDropdowns: () => void;
  /** Check if a specific dropdown is expanded */
  isDropdownExpanded: (threadId: string) => boolean;
}

/**
 * Hook for managing dropdown state with single expansion invariant
 * 
 * Ensures that only one AI Summary dropdown can be expanded at any time,
 * automatically closing others when a new one is opened.
 */
export function useDropdownState(): UseDropdownStateReturn {
  const [expandedDropdownId, setExpandedDropdownId] = useState<string | null>(null);

  /**
   * Toggle dropdown expansion for a specific thread
   * Requirement 2.5: Only one dropdown open at a time
   * 
   * If the clicked dropdown is already expanded, it will be closed.
   * If a different dropdown is expanded, it will be closed and the new one opened.
   * If no dropdown is expanded, the clicked one will be opened.
   */
  const toggleDropdown = useCallback((threadId: string): void => {
    setExpandedDropdownId(currentId => {
      // If clicking the same dropdown that's already open, close it
      if (currentId === threadId) {
        return null;
      }
      // Otherwise, open the clicked dropdown (closing any other)
      return threadId;
    });
  }, []);

  /**
   * Close all dropdowns
   * Sets the expanded dropdown ID to null
   */
  const closeAllDropdowns = useCallback((): void => {
    setExpandedDropdownId(null);
  }, []);

  /**
   * Check if a specific dropdown is expanded
   * Returns true if the given threadId matches the currently expanded dropdown
   */
  const isDropdownExpanded = useCallback((threadId: string): boolean => {
    return expandedDropdownId === threadId;
  }, [expandedDropdownId]);

  return {
    expandedDropdownId,
    toggleDropdown,
    closeAllDropdowns,
    isDropdownExpanded
  };
}

export default useDropdownState;