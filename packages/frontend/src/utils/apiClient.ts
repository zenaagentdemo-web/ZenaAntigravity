/**
 * API Client with Offline Support
 * Automatically queues requests when offline and caches responses
 */

import { queueAction } from './offlineStorage';
import { saveToStore, getFromStore, getAllFromStore, STORES } from './offlineStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Refresh the access token
 */
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');

  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // Refresh failed, clear tokens
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      return false;
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('[API] Failed to parse refresh token response', e);
      return false;
    }

    if (data.accessToken) {
      localStorage.setItem('authToken', data.accessToken);

      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('[API] Token refresh failed:', error);
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    return false;
  }
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  cache?: boolean; // Whether to cache the response
  offlineQueue?: boolean; // Whether to queue when offline
  responseType?: 'json' | 'blob' | 'text';
}


export interface ApiResponse<T = any> {
  data: T;
  fromCache: boolean;
  timestamp: number;
}

/**
 * Make an API request with offline support
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    headers = {},
    cache = true,
    offlineQueue = true,
    responseType = 'json',
  } = options;


  const url = `${API_BASE_URL}${endpoint}`;

  // Add auth token if available
  const token = localStorage.getItem('authToken');
  console.log('[API] Token available:', !!token, 'for endpoint:', endpoint);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  headers['Content-Type'] = 'application/json';

  // Check if offline
  if (!navigator.onLine) {
    console.log('[API] Offline detected');

    // For GET requests, try to return cached data
    if (method === 'GET' && cache) {
      const cached = await getCachedResponse<T>(endpoint);
      if (cached) {
        console.log('[API] Returning cached data for:', endpoint);
        return {
          data: cached,
          fromCache: true,
          timestamp: Date.now(),
        };
      }
    }

    // For mutations, queue the action
    if ((method === 'POST' || method === 'PUT' || method === 'DELETE') && offlineQueue) {
      console.log('[API] Queuing action for later:', method, endpoint);
      await queueAction(`${method} ${endpoint}`, endpoint, method, body);

      // Return optimistic response
      return {
        data: body as T,
        fromCache: false,
        timestamp: Date.now(),
      };
    }

    throw new Error('You are offline and this data is not cached');
  }

  // Make the actual request
  try {
    let response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // If we get a 401 and have a refresh token, try to refresh
    if (response.status === 401 && localStorage.getItem('refreshToken')) {
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        // Retry the request with new token
        const newToken = localStorage.getItem('authToken');
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
        }

        response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
      }
    }

    let data;
    // Handle based on expected response type
    if (responseType === 'blob') {
      data = await response.blob();
    } else if (responseType === 'text') {
      data = await response.text();
    } else {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (parseErr) {
          console.error('[API] Failed to parse JSON response', parseErr);
          throw new Error('Invalid response format from server');
        }
      } else {
        data = await response.text();
      }
    }


    if (!response.ok) {
      // If it's a validation error or something with a message, throw that
      const message = data?.error?.message || data?.message || `HTTP ${response.status}: ${response.statusText}`;
      const error: any = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    // Cache GET responses
    if (method === 'GET' && cache) {
      await cacheResponse(endpoint, data);
    }

    return {
      data,
      fromCache: false,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[API] Request failed:', error);

    // If request failed and we have cached data, return it
    if (method === 'GET' && cache) {
      const cached = await getCachedResponse<T>(endpoint);
      if (cached) {
        console.log('[API] Request failed, returning cached data');
        return {
          data: cached,
          fromCache: true,
          timestamp: Date.now(),
        };
      }
    }

    throw error;
  }
}

/**
 * Cache API response
 */
async function cacheResponse(endpoint: string, data: any): Promise<void> {
  const storeName = getStoreNameForEndpoint(endpoint);
  if (!storeName) return;

  try {
    if (Array.isArray(data)) {
      await saveToStore(storeName, data);
    } else if (data.contacts && Array.isArray(data.contacts)) {
      await saveToStore(storeName, data.contacts);
    } else if (data.properties && Array.isArray(data.properties)) {
      await saveToStore(storeName, data.properties);
    } else if (data.deals && Array.isArray(data.deals)) {
      await saveToStore(storeName, data.deals);
    } else if (data.threads && Array.isArray(data.threads)) {
      await saveToStore(storeName, data.threads);
    } else if (data.tasks && Array.isArray(data.tasks)) {
      await saveToStore(storeName, data.tasks);
    } else if (data.timeline && Array.isArray(data.timeline)) {
      await saveToStore(storeName, data.timeline);
    } else if (data.id) {
      await saveToStore(storeName, data);
    }
  } catch (error) {
    console.error('[API] Failed to cache response:', error);
  }
}

/**
 * Get cached API response
 */
async function getCachedResponse<T>(endpoint: string): Promise<T | null> {
  const storeName = getStoreNameForEndpoint(endpoint);
  if (!storeName) return null;

  try {
    // Check if endpoint has an ID (single resource)
    const idMatch = endpoint.match(/\/([^/]+)$/);
    if (idMatch && idMatch[1] && !idMatch[1].includes('?')) {
      const id = idMatch[1];
      const cached = await getFromStore<T>(storeName, id);
      return cached || null;
    }

    // Otherwise, return all items
    const cached = await getAllFromStore<T>(storeName);
    return (cached as any) || null;
  } catch (error) {
    console.error('[API] Failed to get cached response:', error);
    return null;
  }
}

/**
 * Map endpoint to store name
 */
function getStoreNameForEndpoint(endpoint: string): string | null {
  if (endpoint.includes('/threads')) return STORES.THREADS;
  if (endpoint.includes('/contacts')) return STORES.CONTACTS;
  if (endpoint.includes('/properties')) return STORES.PROPERTIES;
  if (endpoint.includes('/deals')) return STORES.DEALS;
  if (endpoint.includes('/timeline')) return STORES.TIMELINE;
  if (endpoint.includes('/tasks')) return STORES.TASKS;
  return null;
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),

  delete: <T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),

  patch: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),
};
