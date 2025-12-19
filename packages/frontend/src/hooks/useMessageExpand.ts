/**
 * useMessageExpand Hook
 * 
 * Manages expand/collapse state for messages in the thread view.
 * Supports individual message toggle, expand all, and collapse all.
 */

import { useState, useCallback, useMemo } from 'react';

interface UseMessageExpandState {
    /** Set of expanded message IDs */
    expandedIds: Set<string>;
    /** Whether all messages are expanded */
    allExpanded: boolean;
}

interface UseMessageExpandResult {
    /** Check if a specific message is expanded */
    isExpanded: (messageId: string) => boolean;
    /** Toggle a specific message's expand state */
    toggleMessage: (messageId: string) => void;
    /** Expand all messages */
    expandAll: (messageIds: string[]) => void;
    /** Collapse all messages */
    collapseAll: () => void;
    /** Expand the latest message (for initial load) */
    expandLatest: (messageIds: string[]) => void;
    /** Number of currently expanded messages */
    expandedCount: number;
    /** Whether all messages are currently expanded */
    allExpanded: boolean;
}

/**
 * Hook for managing message expand/collapse state
 * @param defaultExpanded - Set of message IDs to expand by default
 */
export function useMessageExpand(
    defaultExpanded: Set<string> = new Set()
): UseMessageExpandResult {
    const [state, setState] = useState<UseMessageExpandState>({
        expandedIds: defaultExpanded,
        allExpanded: false
    });

    // Check if a message is expanded
    const isExpanded = useCallback((messageId: string): boolean => {
        return state.expandedIds.has(messageId);
    }, [state.expandedIds]);

    // Toggle a specific message
    const toggleMessage = useCallback((messageId: string) => {
        setState(prev => {
            const newExpandedIds = new Set(prev.expandedIds);

            if (newExpandedIds.has(messageId)) {
                newExpandedIds.delete(messageId);
            } else {
                newExpandedIds.add(messageId);
            }

            return {
                expandedIds: newExpandedIds,
                allExpanded: false // Reset allExpanded when individual toggle occurs
            };
        });
    }, []);

    // Expand all messages
    const expandAll = useCallback((messageIds: string[]) => {
        setState({
            expandedIds: new Set(messageIds),
            allExpanded: true
        });
    }, []);

    // Collapse all messages
    const collapseAll = useCallback(() => {
        setState({
            expandedIds: new Set(),
            allExpanded: false
        });
    }, []);

    // Expand only the latest message (useful for initial load)
    const expandLatest = useCallback((messageIds: string[]) => {
        if (messageIds.length === 0) return;

        // Latest message is the last one in the array (chronological order)
        const latestId = messageIds[messageIds.length - 1];

        setState({
            expandedIds: new Set([latestId]),
            allExpanded: false
        });
    }, []);

    // Memoized count of expanded messages
    const expandedCount = useMemo(() => {
        return state.expandedIds.size;
    }, [state.expandedIds]);

    return {
        isExpanded,
        toggleMessage,
        expandAll,
        collapseAll,
        expandLatest,
        expandedCount,
        allExpanded: state.allExpanded
    };
}

export default useMessageExpand;
