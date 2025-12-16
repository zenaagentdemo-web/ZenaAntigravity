import { useState, useEffect, useCallback } from 'react';

export interface RealTimeUpdateConfig {
  endpoint?: string;
  updateInterval?: number;
  enableWebSocket?: boolean;
}

export interface RealTimeData {
  activities: any[];
  notifications: any[];
  dashboardMetrics: any;
  lastUpdated: Date;
}

/**
 * Hook for managing real-time updates to dashboard data
 * Supports both WebSocket and polling mechanisms
 */
export const useRealTimeUpdates = (config: RealTimeUpdateConfig = {}) => {
  const {
    endpoint = '/api/dashboard/updates',
    updateInterval = 30000, // 30 seconds
    enableWebSocket = false
  } = config;

  const [data, setData] = useState<RealTimeData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // WebSocket connection management
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connectWebSocket = useCallback(() => {
    if (!enableWebSocket || typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/dashboard`;
      
      const websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        console.log('Dashboard WebSocket connected');
        setIsConnected(true);
        setLastError(null);
      };
      
      websocket.onmessage = (event) => {
        try {
          const updateData = JSON.parse(event.data);
          setData(prevData => ({
            ...prevData,
            ...updateData,
            lastUpdated: new Date()
          }));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      websocket.onclose = () => {
        console.log('Dashboard WebSocket disconnected');
        setIsConnected(false);
        // Attempt to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };
      
      websocket.onerror = (error) => {
        console.error('Dashboard WebSocket error:', error);
        setLastError('WebSocket connection failed');
        setIsConnected(false);
      };
      
      setWs(websocket);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setLastError('Failed to establish real-time connection');
    }
  }, [enableWebSocket]);

  // Polling mechanism as fallback
  const fetchUpdates = useCallback(async () => {
    // Skip fetching in test environment or if endpoint is not a full URL
    if (typeof window === 'undefined' || 
        process.env.NODE_ENV === 'test' || 
        !endpoint.startsWith('http')) {
      console.log('Skipping real-time updates in test environment');
      return;
    }

    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const updateData = await response.json();
        setData(prevData => ({
          ...prevData,
          ...updateData,
          lastUpdated: new Date()
        }));
        setLastError(null);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching dashboard updates:', error);
      setLastError(error instanceof Error ? error.message : 'Failed to fetch updates');
    }
  }, [endpoint]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (enableWebSocket && ws && ws.readyState === WebSocket.OPEN) {
      // Send refresh request via WebSocket
      ws.send(JSON.stringify({ type: 'refresh' }));
    } else {
      // Use HTTP polling
      await fetchUpdates();
    }
  }, [enableWebSocket, ws, fetchUpdates]);

  // Set up real-time updates
  useEffect(() => {
    if (enableWebSocket) {
      connectWebSocket();
    } else {
      // Use polling
      fetchUpdates(); // Initial fetch
      const interval = setInterval(fetchUpdates, updateInterval);
      return () => clearInterval(interval);
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [enableWebSocket, connectWebSocket, fetchUpdates, updateInterval]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  return {
    data,
    isConnected,
    lastError,
    refresh,
    // Utility functions for specific data types
    getActivities: () => data?.activities || [],
    getNotifications: () => data?.notifications || [],
    getDashboardMetrics: () => data?.dashboardMetrics || {},
    getLastUpdated: () => data?.lastUpdated || null
  };
};