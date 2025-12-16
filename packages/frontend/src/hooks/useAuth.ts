import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Hook for managing authentication state
 * Uses direct fetch to avoid IndexedDB issues
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  /**
   * Check authentication status
   */
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Token invalid');
      }

      const data = await response.json();

      setAuthState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  /**
   * Check if user is authenticated on mount
   */
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /**
   * Refresh the access token
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    const refresh = localStorage.getItem('refreshToken');
    
    if (!refresh) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = await response.json();

      if (data.accessToken) {
        localStorage.setItem('authToken', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        return true;
      }

      return false;
    } catch {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      return false;
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      // Redirect to login
      window.location.href = '/login';
    }
  }, []);

  return {
    ...authState,
    checkAuth,
    refreshToken,
    logout,
  };
}
