import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from './logger.service.js';
import { multimodalLiveService } from './multimodal-live.service.js';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

interface WebSocketMessage {
  type: string;
  payload?: any;
}

// Event types
export type WebSocketEventType =
  | 'sync.started'
  | 'sync.completed'
  | 'sync.progress'
  | 'thread.new'
  | 'thread.updated'
  | 'deal.risk'
  | 'task.created'
  | 'ask.response'
  | 'dashboard.data'
  | 'dashboard.update'
  | 'notification.new'
  | 'activity.new'
  | 'appointment.reminder'
  | 'appointment.conflict'
  | 'contact.categorized'
  | 'contact.engagement'
  | 'batch.contacts.updated';

const prisma = new PrismaClient();

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(server: any): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    // Start heartbeat to detect dead connections
    this.startHeartbeat();

    console.log('WebSocket server initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: AuthenticatedWebSocket, req: IncomingMessage): Promise<void> {
    // Extract token from query string
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }

    try {
      let userId: string;

      // In development, accept a special dev token
      if (process.env.NODE_ENV !== 'production' && token === 'demo-token') {
        console.log('[WebSocket] Using development token, resolving dummy user');
        try {
          const demoUser = await prisma.user.findUnique({
            where: { email: 'demo@zena.ai' }
          });
          userId = demoUser ? demoUser.id : 'demo-user-id';
          console.log('[WebSocket] Resolved demo user ID:', userId);
        } catch (err) {
          console.warn('[WebSocket] DB error resolving demo user, falling back:', err);
          userId = 'demo-user-id';
        }
      } else {
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
        userId = decoded.userId;
      }

      ws.userId = userId;
      ws.isAlive = true;

      // Add client to user's connection set
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId)!.add(ws);

      console.log(`[WebSocket] Client connected: ${userId}`);

      // Handle pong responses for heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        this.handleMessage(ws, data);
      });

      // Handle disconnection
      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: 'connection.established',
        payload: { message: 'Connected to Zena WebSocket server' }
      });

    } catch (error) {
      console.error('[WebSocket] Authentication failed:', error);
      ws.close(1008, 'Invalid token');
    }
  }

  /**
   * Handle incoming messages from clients
   */
  private handleMessage(ws: AuthenticatedWebSocket, data: Buffer): void {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      console.log(`[Websocket] Message received from ${ws.userId || 'unknown'}: ${message.type}`);

      switch (message.type) {
        case 'ping':
          // Respond to client ping with pong
          this.sendToClient(ws, { type: 'pong' });
          break;

        case 'dashboard.request':
          // Client requested dashboard data
          this.handleDashboardDataRequest(ws);
          break;

        case 'sync.request':
          // Client requested immediate sync
          // This would trigger the sync engine for this user
          console.log(`Sync requested by user: ${ws.userId}`);
          this.handleSyncRequest(ws);
          break;

        case 'thread.view':
          // Client viewed a thread (could be used for read receipts)
          console.log(`Thread viewed by user: ${ws.userId}`, message.payload);
          break;

        case 'typing.start':
          // Client started typing in Ask Zena
          console.log(`User typing: ${ws.userId}`);
          break;

        case 'notification.dismiss':
          // Client dismissed a notification
          console.log(`Notification dismissed by user: ${ws.userId}`, message.payload);
          break;

        case 'widget.interaction':
          // Client interacted with a widget (for analytics)
          console.log(`Widget interaction by user: ${ws.userId}`, message.payload);
          break;

        case 'voice.live.start':
          logger.info(`[Websocket] Received voice.live.start for user: ${ws.userId}`);
          multimodalLiveService.startSession(ws.userId!, ws, message.payload?.history, message.payload?.location)
            .catch(err => logger.error('[Websocket] startSession error:', err));
          break;

        case 'voice.live.chunk':
          multimodalLiveService.sendAudioChunk(ws.userId!, message.payload.data);
          break;

        case 'voice.live.prompt':
          multimodalLiveService.sendPrompt(ws.userId!, message.payload.text);
          break;

        case 'voice.live.stop':
          multimodalLiveService.stopSession(ws.userId!);
          break;

        default:
          console.log(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  /**
   * Handle dashboard data request
   */
  private async handleDashboardDataRequest(ws: AuthenticatedWebSocket): Promise<void> {
    if (!ws.userId) return;

    try {
      // In a real implementation, this would fetch actual data from the database
      // For now, we'll send mock data that matches the dashboard structure
      const dashboardData = {
        focusThreadsCount: Math.floor(Math.random() * 10) + 1,
        waitingThreadsCount: Math.floor(Math.random() * 20) + 5,
        atRiskDealsCount: Math.floor(Math.random() * 5),
        upcomingAppointments: [
          {
            id: '1',
            time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            title: 'Property Viewing',
            property: { id: '1', address: '123 Main St' },
            type: 'viewing'
          }
        ],
        recentActivities: [
          {
            id: '1',
            type: 'email',
            description: 'New email from client',
            timestamp: new Date().toISOString(),
            relatedId: 'thread-1',
            relatedType: 'thread'
          }
        ],
        notifications: [],
        businessMetrics: {
          responseTime: 2.3,
          activeDeals: 12,
          pipelineHealth: 85
        },
        lastUpdated: new Date().toISOString()
      };

      this.sendToClient(ws, {
        type: 'dashboard.data',
        payload: dashboardData
      });
    } catch (error) {
      console.error('Error handling dashboard data request:', error);
      this.sendToClient(ws, {
        type: 'error',
        payload: { message: 'Failed to fetch dashboard data' }
      });
    }
  }

  /**
   * Handle sync request
   */
  private async handleSyncRequest(ws: AuthenticatedWebSocket): Promise<void> {
    if (!ws.userId) return;

    try {
      // Notify client that sync has started
      this.sendToClient(ws, {
        type: 'sync.started',
        payload: { timestamp: new Date().toISOString() }
      });

      // Simulate sync process (in real implementation, this would trigger actual sync)
      setTimeout(() => {
        this.sendToClient(ws, {
          type: 'sync.completed',
          payload: {
            timestamp: new Date().toISOString(),
            newThreads: Math.floor(Math.random() * 3),
            updatedDeals: Math.floor(Math.random() * 2)
          }
        });
      }, 2000);
    } catch (error) {
      console.error('Error handling sync request:', error);
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(ws: AuthenticatedWebSocket): void {
    if (ws.userId) {
      const userClients = this.clients.get(ws.userId);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          this.clients.delete(ws.userId);
        }
      }
      console.log(`WebSocket client disconnected: ${ws.userId}`);
    }
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;

      this.wss.clients.forEach((ws: WebSocket) => {
        const client = ws as AuthenticatedWebSocket;

        if (client.isAlive === false) {
          return client.terminate();
        }

        client.isAlive = false;
        client.ping();
      });
    }, 30000); // 30 seconds
  }

  /**
   * Send message to a specific client (public for service usage)
   */
  sendToClientProxy(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send message to a specific client
   */
  private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    this.sendToClientProxy(ws, message);
  }

  /**
   * Broadcast event to all connections of a specific user
   */
  broadcastToUser(userId: string, eventType: WebSocketEventType, payload?: any): void {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    const message: WebSocketMessage = {
      type: eventType,
      payload
    };

    userClients.forEach((ws) => {
      this.sendToClient(ws, message);
    });
  }

  /**
   * Broadcast event to multiple users
   */
  broadcastToUsers(userIds: string[], eventType: WebSocketEventType, payload?: any): void {
    userIds.forEach((userId) => {
      this.broadcastToUser(userId, eventType, payload);
    });
  }

  /**
   * Get number of active connections for a user
   */
  getUserConnectionCount(userId: string): number {
    return this.clients.get(userId)?.size || 0;
  }

  /**
   * Get total number of active connections
   */
  getTotalConnectionCount(): number {
    let total = 0;
    this.clients.forEach((clients) => {
      total += clients.size;
    });
    return total;
  }

  /**
   * Broadcast dashboard update to user
   */
  broadcastDashboardUpdate(userId: string, update: any): void {
    this.broadcastToUser(userId, 'dashboard.update', update);
  }

  /**
   * Broadcast new notification to user
   */
  broadcastNotification(userId: string, notification: any): void {
    this.broadcastToUser(userId, 'notification.new', notification);
  }

  /**
   * Broadcast new activity to user
   */
  broadcastActivity(userId: string, activity: any): void {
    this.broadcastToUser(userId, 'activity.new', activity);
  }

  /**
   * Broadcast appointment reminder to user
   */
  broadcastAppointmentReminder(userId: string, appointment: any): void {
    this.broadcastToUser(userId, 'appointment.reminder', appointment);
  }

  /**
   * Broadcast contact engagement update
   */
  broadcastContactEngagement(userId: string, data: {
    contactId: string;
    engagementScore: number;
    momentum: number;
    dealStage: string | null;
    nextBestAction?: string;
  }): void {
    this.broadcastToUser(userId, 'contact.engagement', data);
  }

  /**
   * Broadcast contact categorization update
   */
  broadcastContactCategorization(userId: string, data: {
    contactId: string;
    zenaCategory: string;
    intelligenceSnippet: string;
    role?: string;
  }): void {
    this.broadcastToUser(userId, 'contact.categorized', data);
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.wss) {
      this.wss.clients.forEach((ws) => {
        ws.close(1001, 'Server shutting down');
      });
      this.wss.close();
      this.wss = null;
    }

    this.clients.clear();
    console.log('WebSocket server shut down');
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
