import { errorHandlingService } from './errorHandlingService';

export interface DashboardData {
  focusThreadsCount: number;
  waitingThreadsCount: number;
  atRiskDealsCount: number;
  upcomingAppointments: any[];
  recentActivities: any[];
  notifications: any[];
  businessMetrics: any;
  lastUpdated: Date;
}

export interface WebSocketMessage {
  type: string;
  payload?: any;
  timestamp?: string;
}

export type DataUpdateCallback = (data: Partial<DashboardData>) => void;
export type ConnectionStatusCallback = (connected: boolean) => void;
export type ErrorCallback = (error: Error) => void;

class RealTimeDataService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isDestroyed = false;

  private dataUpdateCallbacks: Set<DataUpdateCallback> = new Set();
  private connectionStatusCallbacks: Set<ConnectionStatusCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();

  private currentData: DashboardData | null = null;
  private isConnected = false;

  /**
   * Initialize the real-time data service
   */
  initialize(): void {
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
      console.log('Skipping WebSocket initialization in test environment');
      return;
    }

    this.connect();
  }

  /**
   * Connect to WebSocket server
   */
  private connect(): void {
    if (this.isConnecting || this.isDestroyed) {
      return;
    }

    this.isConnecting = true;

    try {
      // Get auth token from localStorage or auth service
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token available');
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen;
      this.ws.onmessage = this.handleMessage;
      this.ws.onclose = this.handleClose;
      this.ws.onerror = this.handleError;

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Handle WebSocket connection open
   */
  private handleOpen = (): void => {
    console.log('WebSocket connected');
    this.isConnecting = false;
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;

    // Start heartbeat
    this.startHeartbeat();

    // Notify callbacks
    this.connectionStatusCallbacks.forEach(callback => {
      try {
        callback(true);
      } catch (error) {
        console.error('Error in connection status callback:', error);
      }
    });

    // Request initial data
    this.requestDashboardData();
  };

  /**
   * Handle WebSocket message
   */
  private handleMessage = (event: MessageEvent): void => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log('WebSocket message received:', message.type);

      switch (message.type) {
        case 'dashboard.data':
          this.handleDashboardData(message.payload);
          break;
        
        case 'dashboard.update':
          this.handleDashboardUpdate(message.payload);
          break;
        
        case 'sync.started':
          this.handleSyncStarted(message.payload);
          break;
        
        case 'sync.completed':
          this.handleSyncCompleted(message.payload);
          break;
        
        case 'thread.new':
        case 'thread.updated':
          this.handleThreadUpdate(message.payload);
          break;
        
        case 'deal.risk':
          this.handleDealRisk(message.payload);
          break;
        
        case 'notification.new':
          this.handleNewNotification(message.payload);
          break;
        
        case 'activity.new':
          this.handleNewActivity(message.payload);
          break;
        
        case 'appointment.reminder':
          this.handleAppointmentReminder(message.payload);
          break;
        
        case 'appointment.conflict':
          this.handleAppointmentConflict(message.payload);
          break;
        
        case 'error':
          this.handleServerError(message.payload);
          break;
        
        case 'pong':
          // Heartbeat response
          break;
        
        default:
          console.log('Unknown WebSocket message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      errorHandlingService.reportError(error as Error, {
        component: 'RealTimeDataService',
        props: { messageData: event.data }
      });
    }
  };

  /**
   * Handle WebSocket connection close
   */
  private handleClose = (event: CloseEvent): void => {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.isConnected = false;
    this.isConnecting = false;
    this.stopHeartbeat();

    // Notify callbacks
    this.connectionStatusCallbacks.forEach(callback => {
      try {
        callback(false);
      } catch (error) {
        console.error('Error in connection status callback:', error);
      }
    });

    // Attempt to reconnect unless explicitly closed or destroyed
    if (!this.isDestroyed && event.code !== 1000) {
      this.scheduleReconnect();
    }
  };

  /**
   * Handle WebSocket error
   */
  private handleError = (event: Event): void => {
    console.error('WebSocket error:', event);
    const error = new Error('WebSocket connection error');
    this.handleConnectionError(error);
  };

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error): void {
    errorHandlingService.reportNetworkError('WebSocket', 'CONNECT', undefined, error);
    
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isDestroyed) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
    
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Request dashboard data
   */
  private requestDashboardData(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'dashboard.request',
        timestamp: new Date().toISOString()
      }));
    }
  }

  /**
   * Handle dashboard data response
   */
  private handleDashboardData(data: any): void {
    this.currentData = {
      ...data,
      lastUpdated: new Date()
    };

    this.notifyDataUpdate(this.currentData);
  }

  /**
   * Handle dashboard update
   */
  private handleDashboardUpdate(update: any): void {
    if (this.currentData) {
      this.currentData = {
        ...this.currentData,
        ...update,
        lastUpdated: new Date()
      };
    }

    this.notifyDataUpdate(update);
  }

  /**
   * Handle sync started event
   */
  private handleSyncStarted(payload: any): void {
    this.notifyDataUpdate({
      syncStatus: 'syncing',
      lastUpdated: new Date()
    } as any);
  }

  /**
   * Handle sync completed event
   */
  private handleSyncCompleted(payload: any): void {
    this.notifyDataUpdate({
      syncStatus: 'completed',
      lastUpdated: new Date(),
      ...payload
    } as any);
  }

  /**
   * Handle thread updates
   */
  private handleThreadUpdate(payload: any): void {
    // Update thread counts and recent activities
    const update: Partial<DashboardData> = {
      lastUpdated: new Date()
    };

    if (payload.threadType === 'focus') {
      update.focusThreadsCount = payload.count;
    } else if (payload.threadType === 'waiting') {
      update.waitingThreadsCount = payload.count;
    }

    if (payload.activity) {
      update.recentActivities = [payload.activity];
    }

    this.notifyDataUpdate(update);
  }

  /**
   * Handle deal risk alerts
   */
  private handleDealRisk(payload: any): void {
    const update: Partial<DashboardData> = {
      atRiskDealsCount: payload.count,
      notifications: [payload.notification],
      lastUpdated: new Date()
    };

    this.notifyDataUpdate(update);
  }

  /**
   * Handle new notifications
   */
  private handleNewNotification(payload: any): void {
    const update: Partial<DashboardData> = {
      notifications: [payload],
      lastUpdated: new Date()
    };

    this.notifyDataUpdate(update);
  }

  /**
   * Handle new activity
   */
  private handleNewActivity(payload: any): void {
    const update: Partial<DashboardData> = {
      recentActivities: [payload],
      lastUpdated: new Date()
    };

    this.notifyDataUpdate(update);
  }

  /**
   * Handle appointment reminder
   */
  private handleAppointmentReminder(payload: any): void {
    const update: Partial<DashboardData> = {
      notifications: [{
        id: `reminder-${payload.id}`,
        type: 'info',
        title: 'Upcoming Appointment',
        message: `${payload.title} in ${payload.minutesUntil} minutes`,
        timestamp: new Date(),
        priority: 8
      }],
      lastUpdated: new Date()
    };

    this.notifyDataUpdate(update);
  }

  /**
   * Handle appointment conflict
   */
  private handleAppointmentConflict(payload: any): void {
    const update: Partial<DashboardData> = {
      notifications: [{
        id: `conflict-${payload.id}`,
        type: 'warning',
        title: 'Appointment Conflict',
        message: `Conflict detected with ${payload.conflictingAppointment}`,
        timestamp: new Date(),
        priority: 9
      }],
      lastUpdated: new Date()
    };

    this.notifyDataUpdate(update);
  }

  /**
   * Handle server errors
   */
  private handleServerError(payload: any): void {
    const error = new Error(payload.message || 'Server error');
    errorHandlingService.reportError(error, {
      component: 'RealTimeDataService',
      props: { serverError: payload }
    });
  }

  /**
   * Notify all data update callbacks
   */
  private notifyDataUpdate(data: Partial<DashboardData>): void {
    this.dataUpdateCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in data update callback:', error);
        errorHandlingService.reportError(error as Error, {
          component: 'RealTimeDataService',
          props: { callbackType: 'dataUpdate' }
        });
      }
    });
  }

  /**
   * Subscribe to data updates
   */
  onDataUpdate(callback: DataUpdateCallback): () => void {
    this.dataUpdateCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.dataUpdateCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionStatus(callback: ConnectionStatusCallback): () => void {
    this.connectionStatusCallbacks.add(callback);
    
    // Immediately call with current status
    callback(this.isConnected);
    
    // Return unsubscribe function
    return () => {
      this.connectionStatusCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to errors
   */
  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.errorCallbacks.delete(callback);
    };
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get current data
   */
  getCurrentData(): DashboardData | null {
    return this.currentData;
  }

  /**
   * Manually refresh data
   */
  refresh(): void {
    if (this.isConnected) {
      this.requestDashboardData();
    } else {
      // If not connected, try to reconnect
      this.connect();
    }
  }

  /**
   * Send a message to the server
   */
  sendMessage(type: string, payload?: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type,
        payload,
        timestamp: new Date().toISOString()
      }));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.isDestroyed = true;
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    // Clear all callbacks
    this.dataUpdateCallbacks.clear();
    this.connectionStatusCallbacks.clear();
    this.errorCallbacks.clear();
  }
}

// Export singleton instance
export const realTimeDataService = new RealTimeDataService();