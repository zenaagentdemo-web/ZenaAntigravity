/**
 * useFilterState Hook
 * 
 * Manages filter state for the New page thread list.
 * Implements filter application with AND logic for multiple filters
 * and search query filtering with 300ms debounce.
 * 
 * Requirements: 6.2, 6.3, 6.5
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Thread, FilterType, ThreadClassification } from '../models/newPage.types';

export interface UseFilterStateReturn {
  /** Currently active filters */
  activeFilters: FilterType[];
  /** Current search query */
  searchQuery: string;
  /** Active folder ID for folder filtering (null = show all) */
  activeFolderId: string | null;
  /** Set active filters */
  setFilters: (filters: FilterType[]) => void;
  /** Set search query (will be debounced) */
  setSearchQuery: (query: string) => void;
  /** Set active folder ID for folder filtering */
  setFolderId: (folderId: string | null) => void;
  /** Threads after applying filters and search */
  filteredThreads: Thread[];
  /** Count of threads matching each filter type */
  filterCounts: Record<FilterType, number>;
}

// Debounce delay for search input
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Maps FilterType to ThreadClassification for filtering
 */
const FILTER_TO_CLASSIFICATION: Partial<Record<FilterType, ThreadClassification>> = {
  buyer: 'buyer',
  vendor: 'vendor'
};

/**
 * Check if a thread matches a single filter
 */
function threadMatchesFilter(thread: Thread, filter: FilterType): boolean {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'high_risk') {
    return thread.riskLevel === 'high';
  }

  // Logic for 'normal' filter: All non-high-risk threads
  if (filter === 'normal') {
    return thread.riskLevel !== 'high';
  }

  const classification = FILTER_TO_CLASSIFICATION[filter];
  if (classification) {
    return thread.classification === classification;
  }

  return false;
}

/**
 * Check if a thread matches the search query
 * Searches in subject, participant names, and summary
 */
function threadMatchesSearch(thread: Thread, query: string): boolean {
  if (!query || query.trim() === '') {
    return true;
  }

  const normalizedQuery = query.toLowerCase().trim();

  // Check subject
  if (thread.subject.toLowerCase().includes(normalizedQuery)) {
    return true;
  }

  // Check participant names
  const participantMatch = thread.participants.some(
    p => p.name.toLowerCase().includes(normalizedQuery)
  );
  if (participantMatch) {
    return true;
  }

  // Check summary
  if (thread.summary.toLowerCase().includes(normalizedQuery)) {
    return true;
  }

  // Check AI summary if available
  if (thread.aiSummary && thread.aiSummary.toLowerCase().includes(normalizedQuery)) {
    return true;
  }

  return false;
}

/**
 * Apply filters to threads using AND logic for multiple filters
 * Requirement 6.3: Multiple filters use AND logic
 */
function applyFilters(threads: Thread[], filters: FilterType[]): Thread[] {
  // If 'all' is in filters, return all threads
  if (filters.includes('all') || filters.length === 0) {
    return threads;
  }

  // Apply AND logic: thread must match ALL active filters
  return threads.filter(thread =>
    filters.every(filter => threadMatchesFilter(thread, filter))
  );
}

/**
 * Calculate filter counts for all filter types
 */
function calculateFilterCounts(threads: Thread[]): Record<FilterType, number> {
  const counts: Record<FilterType, number> = {
    all: threads.length,
    buyer: 0,
    vendor: 0,
    high_risk: 0,
    normal: 0
  };

  threads.forEach(thread => {
    // Count by classification
    if (thread.classification === 'buyer') counts.buyer++;
    if (thread.classification === 'vendor') counts.vendor++;

    // Count high risk
    if (thread.riskLevel === 'high') counts.high_risk++;
    // Count normal
    if (thread.riskLevel !== 'high') counts.normal++;
  });

  return counts;
}

/**
 * Hook for managing filter and search state
 */
export function useFilterState(threads: Thread[]): UseFilterStateReturn {
  const [activeFilters, setActiveFilters] = useState<FilterType[]>(['all']);
  const [searchQuery, setSearchQueryState] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Set filters with validation
   */
  const setFilters = useCallback((filters: FilterType[]): void => {
    // If setting to empty or only 'all', default to ['all']
    if (filters.length === 0 || (filters.length === 1 && filters[0] === 'all')) {
      setActiveFilters(['all']);
      return;
    }

    // If 'all' is being added with other filters, remove 'all'
    const filtersWithoutAll = filters.filter(f => f !== 'all');

    // If adding 'all' explicitly, clear other filters
    if (filters.includes('all') && filters.length > 1) {
      setActiveFilters(['all']);
      return;
    }

    setActiveFilters(filtersWithoutAll.length > 0 ? filtersWithoutAll : ['all']);
  }, []);

  /**
   * Set search query with debouncing
   * Requirement 6.5: 300ms debounce for search
   */
  const setSearchQuery = useCallback((query: string): void => {
    setSearchQueryState(query);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(query);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  /**
   * Set active folder ID for folder filtering
   * Using 'inbox' or null clears the filter to show all
   */
  const setFolderId = useCallback((folderId: string | null): void => {
    // inbox means show all, same as null
    if (folderId === 'inbox' || folderId === null) {
      setActiveFolderId(null);
    } else {
      setActiveFolderId(folderId);
    }
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Calculate filtered threads
   * Requirement 6.2: Filter application
   * Requirement 6.3: AND logic for multiple filters
   * Requirement 6.5: Search filtering
   */
  const filteredThreads = useMemo(() => {
    // First apply classification/risk filters
    let result = applyFilters(threads, activeFilters);

    // Apply folder filter if active
    if (activeFolderId) {
      result = result.filter(thread => thread.folderId === activeFolderId);
    }

    // Then apply search filter
    if (debouncedSearchQuery.trim()) {
      result = result.filter(thread =>
        threadMatchesSearch(thread, debouncedSearchQuery)
      );
    }

    return result;
  }, [threads, activeFilters, activeFolderId, debouncedSearchQuery]);

  /**
   * Calculate filter counts based on all threads (not filtered)
   */
  const filterCounts = useMemo(() =>
    calculateFilterCounts(threads),
    [threads]
  );

  return {
    activeFilters,
    searchQuery,
    activeFolderId,
    setFilters,
    setSearchQuery,
    setFolderId,
    filteredThreads,
    filterCounts
  };
}

export default useFilterState;
