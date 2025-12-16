import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../utils/apiClient';
import './SearchPage.css';

interface SearchResult {
  id: string;
  type: 'deal' | 'contact' | 'property' | 'thread';
  title: string;
  subtitle?: string;
  snippet: string;
  relevance: number;
  timestamp?: Date;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

type FilterType = 'all' | 'deals' | 'contacts' | 'properties' | 'threads';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setFilteredResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await api.get<SearchResponse>(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      setResults(response.data.results || []);
      setFilteredResults(response.data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Failed to perform search. Please try again.');
      setResults([]);
      setFilteredResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle search on mount if query param exists
  useEffect(() => {
    const queryParam = searchParams.get('q');
    if (queryParam) {
      setQuery(queryParam);
      performSearch(queryParam);
    }
  }, [searchParams, performSearch]);

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query });
      performSearch(query);
    }
  };

  // Handle filter change
  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    
    if (filter === 'all') {
      setFilteredResults(results);
    } else {
      const filtered = results.filter(result => {
        if (filter === 'deals') return result.type === 'deal';
        if (filter === 'contacts') return result.type === 'contact';
        if (filter === 'properties') return result.type === 'property';
        if (filter === 'threads') return result.type === 'thread';
        return true;
      });
      setFilteredResults(filtered);
    }
  };

  // Get link for result
  const getResultLink = (result: SearchResult): string => {
    switch (result.type) {
      case 'deal':
        return `/deals/${result.id}`;
      case 'contact':
        return `/contacts/${result.id}`;
      case 'property':
        return `/properties/${result.id}`;
      case 'thread':
        return `/focus`; // Threads are viewed in focus/waiting pages
      default:
        return '#';
    }
  };

  // Get result type label
  const getTypeLabel = (type: string): string => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Get result count for filter
  const getFilterCount = (filter: FilterType): number => {
    if (filter === 'all') return results.length;
    return results.filter(r => r.type === filter.slice(0, -1) as any).length;
  };

  return (
    <div className="search-page">
      <div className="container">
        <div className="search-page__header">
          <h1 className="search-page__title">Search</h1>
          
          <form className="search-page__form" onSubmit={handleSearch}>
            <div className="search-page__input-wrapper">
              <input
                type="search"
                className="search-page__input"
                placeholder="Search deals, contacts, properties, or threads..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              <button 
                type="submit" 
                className="search-page__button"
                disabled={isLoading || !query.trim()}
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>
        </div>

        {hasSearched && (
          <>
            <div className="search-page__filters">
              <button
                className={`search-page__filter ${activeFilter === 'all' ? 'search-page__filter--active' : ''}`}
                onClick={() => handleFilterChange('all')}
              >
                All ({getFilterCount('all')})
              </button>
              <button
                className={`search-page__filter ${activeFilter === 'deals' ? 'search-page__filter--active' : ''}`}
                onClick={() => handleFilterChange('deals')}
              >
                Deals ({getFilterCount('deals')})
              </button>
              <button
                className={`search-page__filter ${activeFilter === 'contacts' ? 'search-page__filter--active' : ''}`}
                onClick={() => handleFilterChange('contacts')}
              >
                Contacts ({getFilterCount('contacts')})
              </button>
              <button
                className={`search-page__filter ${activeFilter === 'properties' ? 'search-page__filter--active' : ''}`}
                onClick={() => handleFilterChange('properties')}
              >
                Properties ({getFilterCount('properties')})
              </button>
              <button
                className={`search-page__filter ${activeFilter === 'threads' ? 'search-page__filter--active' : ''}`}
                onClick={() => handleFilterChange('threads')}
              >
                Threads ({getFilterCount('threads')})
              </button>
            </div>

            <div className="search-page__results">
              {isLoading && (
                <div className="search-page__loading">
                  <p>Searching...</p>
                </div>
              )}

              {error && (
                <div className="search-page__error">
                  <p>{error}</p>
                </div>
              )}

              {!isLoading && !error && filteredResults.length === 0 && (
                <div className="search-page__empty">
                  <p>No results found for "{query}"</p>
                  <p className="search-page__empty-hint">
                    Try different keywords or check your spelling
                  </p>
                </div>
              )}

              {!isLoading && !error && filteredResults.length > 0 && (
                <div className="search-page__results-list">
                  {filteredResults.map((result) => (
                    <Link
                      key={`${result.type}-${result.id}`}
                      to={getResultLink(result)}
                      className="search-result"
                    >
                      <div className="search-result__header">
                        <span className={`search-result__type search-result__type--${result.type}`}>
                          {getTypeLabel(result.type)}
                        </span>
                        <h3 className="search-result__title">{result.title}</h3>
                      </div>
                      
                      {result.subtitle && (
                        <p className="search-result__subtitle">{result.subtitle}</p>
                      )}
                      
                      <p className="search-result__snippet">{result.snippet}</p>
                      
                      {result.timestamp && (
                        <p className="search-result__timestamp">
                          {new Date(result.timestamp).toLocaleDateString()}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {!hasSearched && (
          <div className="search-page__welcome">
            <p>Enter a search query to find deals, contacts, properties, or threads</p>
          </div>
        )}
      </div>
    </div>
  );
};
