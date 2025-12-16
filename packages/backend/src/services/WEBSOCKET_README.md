# WebSocket Real-Time Updates

This document describes the WebSocket implementation for real-time updates in the Zena AI Real Estate PWA.

## Overview

The WebSocket service provides real-time bidirectional communication between the server and connected clients. It enables instant notifications for sync status, thread updates, deal risks, task creation, and streaming Ask Zena responses.

## Architecture

### WebSocket Server

- **Library**: `ws` (WebSocket library for Node.js)
- **Path**: `/ws`
- **Authentication**: JWT token passed as query parameter
- **Heartbeat**: 30-second ping/pong to detect dead connections

### Connection Flow

1. Client connects to `ws://localhost:3000/ws?token=<JWT_TOKEN>`
2. Server validates JWT token
3. Server adds client to user's connection set
4. Server sends welcome message
5. Client can send/receive messages
6. Server maintains heartbeat to detect disconnections

## Event Types

### Server → Client Events

#### 1. `sync.started`
Emitted when email synchronization begins for an account.

```typescript
{
  type: 'sync.started',
  payload: {
    accountId: string,
    provider: string
  }
}
```

#### 2. `sync.progress`
Emitted during synchronization to show progress.

```typescript
{
  type: 'sync.progress',
  payload: {
    accountId: string,
    totalThreads: number,
    processedThreads: number
  }
}
```

#### 3. `sync.completed`
Emitted when synchronization completes (success or failure).

```typescript
{
  type: 'sync.completed',
  payload: {
    accountId: string,
    threadsProcessed: number,
    success: boolean,
    error?: string
  }
}
```

#### 4. `thread.new`
Emitted when a new thread is detected during sync.

```typescript
{
  type: 'thread.new',
  payload: {
    threadId: string,
    accountId: string
  }
}
```

#### 5. `thread.updated`
Emitted when a thread's classification or metadata is updated.

```typescript
{
  type: 'thread.updated',
  payload: {
    threadId: string,
    classification: string,
    category: string,
    nextActionOwner: string
  }
}
```

#### 6. `deal.risk`
Emitted when a deal is flagged as medium or high risk.

```typescript
{
  type: 'deal.risk',
  payload: {
    dealId: string,
    riskLevel: 'medium' | 'high',
    riskFlags: string[],
    riskReason: string
  }
}
```

#### 7. `task.created`
Emitted when a new task is created.

```typescript
{
  type: 'task.created',
  payload: {
    taskId: string,
    label: string,
    dueDate?: Date,
    dealId?: string,
    propertyId?: string,
    contactId?: string,
    source: string
  }
}
```

#### 8. `ask.response`
Emitted for streaming Ask Zena responses.

```typescript
{
  type: 'ask.response',
  payload: {
    chunk: string,
    isComplete: boolean,
    sources?: ResponseSource[],
    suggestedActions?: string[],
    error?: string
  }
}
```

### Client → Server Events

#### 1. `sync.request`
Client requests immediate synchronization.

```typescript
{
  type: 'sync.request',
  payload: {}
}
```

#### 2. `thread.view`
Client viewed a thread (for read receipts).

```typescript
{
  type: 'thread.view',
  payload: {
    threadId: string
  }
}
```

#### 3. `typing.start`
Client started typing in Ask Zena.

```typescript
{
  type: 'typing.start',
  payload: {}
}
```

## Usage

### Server-Side

#### Broadcasting to a User

```typescript
import { websocketService } from './services/websocket.service.js';

// Broadcast to all connections of a specific user
websocketService.broadcastToUser(userId, 'thread.new', {
  threadId: 'thread-123',
  accountId: 'account-456'
});
```

#### Broadcasting to Multiple Users

```typescript
// Broadcast to multiple users
websocketService.broadcastToUsers(
  ['user-1', 'user-2'],
  'deal.risk',
  { dealId: 'deal-123', riskLevel: 'high' }
);
```

#### Getting Connection Stats

```typescript
// Get number of connections for a user
const count = websocketService.getUserConnectionCount(userId);

// Get total connections
const total = websocketService.getTotalConnectionCount();
```

### Client-Side (Example)

```typescript
// Connect to WebSocket server
const token = localStorage.getItem('authToken');
const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);

// Handle connection open
ws.onopen = () => {
  console.log('WebSocket connected');
};

// Handle incoming messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'sync.started':
      console.log('Sync started:', message.payload);
      break;
      
    case 'thread.new':
      console.log('New thread:', message.payload);
      // Update UI to show new thread
      break;
      
    case 'deal.risk':
      console.log('Deal at risk:', message.payload);
      // Show notification
      break;
      
    case 'ask.response':
      if (message.payload.isComplete) {
        console.log('Response complete');
      } else {
        console.log('Response chunk:', message.payload.chunk);
        // Append chunk to UI
      }
      break;
  }
};

// Handle errors
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

// Handle disconnection
ws.onclose = () => {
  console.log('WebSocket disconnected');
  // Attempt reconnection
};

// Send message to server
ws.send(JSON.stringify({
  type: 'sync.request',
  payload: {}
}));
```

## Integration Points

### Sync Engine Service
- Emits `sync.started`, `sync.progress`, `sync.completed`, `thread.new`
- Located in: `packages/backend/src/services/sync-engine.service.ts`

### AI Processing Service
- Emits `thread.updated` when classification completes
- Located in: `packages/backend/src/services/ai-processing.service.ts`

### Risk Analysis Service
- Emits `deal.risk` when deals are flagged as at-risk
- Located in: `packages/backend/src/services/risk-analysis.service.ts`

### Task Service
- Emits `task.created` when new tasks are created
- Located in: `packages/backend/src/services/task.service.ts`

### Ask Zena Service
- Emits `ask.response` for streaming responses
- Located in: `packages/backend/src/services/ask-zena.service.ts`

## Security

### Authentication
- JWT token required for connection
- Token validated on connection
- Invalid tokens result in immediate disconnection

### Authorization
- Events are only sent to the user who owns the data
- User ID extracted from JWT token
- No cross-user event broadcasting

## Heartbeat & Connection Management

### Heartbeat Mechanism
- Server sends ping every 30 seconds
- Clients must respond with pong
- Connections that don't respond are terminated

### Reconnection
- Clients should implement automatic reconnection
- Use exponential backoff for reconnection attempts
- Recommended: 1s, 2s, 4s, 8s, 16s, 30s (max)

## Error Handling

### Connection Errors
- Invalid token: Connection closed with code 1008
- Server shutdown: Connection closed with code 1001
- Network errors: Connection closed automatically

### Message Errors
- Invalid JSON: Logged and ignored
- Unknown message type: Logged and ignored
- Processing errors: Logged, not sent to client

## Performance Considerations

### Scalability
- Current implementation stores connections in memory
- For production with multiple servers, consider:
  - Redis pub/sub for cross-server messaging
  - Sticky sessions or connection routing
  - WebSocket load balancing

### Resource Management
- Heartbeat removes dead connections
- Graceful shutdown closes all connections
- Memory usage scales with active connections

## Testing

### Manual Testing
```bash
# Install wscat for testing
npm install -g wscat

# Connect to WebSocket server
wscat -c "ws://localhost:3000/ws?token=YOUR_JWT_TOKEN"

# Send test message
{"type":"sync.request","payload":{}}
```

### Integration Testing
- Use `ws` library in tests
- Mock WebSocket connections
- Verify event emissions

## Future Enhancements

1. **Presence System**: Track online/offline status
2. **Typing Indicators**: Show when others are typing
3. **Read Receipts**: Track when messages are read
4. **Message Queuing**: Queue messages for offline users
5. **Compression**: Enable per-message compression
6. **Binary Messages**: Support binary data for efficiency
7. **Room/Channel Support**: Group users into channels
8. **Rate Limiting**: Prevent message flooding

## Troubleshooting

### Connection Fails
- Verify JWT token is valid
- Check server is running
- Verify WebSocket path is `/ws`
- Check firewall/proxy settings

### Events Not Received
- Verify user ID matches token
- Check server logs for errors
- Verify event is being emitted
- Check client message handler

### Frequent Disconnections
- Check network stability
- Verify heartbeat implementation
- Check server resource usage
- Review error logs

## References

- [WebSocket Protocol (RFC 6455)](https://tools.ietf.org/html/rfc6455)
- [ws Library Documentation](https://github.com/websockets/ws)
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
