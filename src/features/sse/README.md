# Server-Sent Events (SSE) Feature

A comprehensive, reusable Server-Sent Events layer for real-time, server-to-client notifications across the application.

## Features

- **Centralized SSE Manager**: Track active client connections and manage event dispatching
- **Targeted Messaging**: Send events to specific clients, users, sessions, or broadcast to all
- **Automatic Reconnection**: Client-side automatic reconnection with configurable retry logic
- **Heartbeat Mechanism**: Keep connections alive with periodic heartbeat messages
- **Resource Management**: Proper cleanup of disconnected clients to prevent memory leaks
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **React Integration**: Easy-to-use React hooks for client-side consumption

## Quick Start

### 1. Server-Side Setup

The SSE service is automatically initialized when the API route is accessed. You can also manually initialize it:

```typescript
import { initializeSSE } from '@/features/sse';

// Initialize with custom configuration
initializeSSE({
  heartbeatInterval: 30000, // 30 seconds
  maxConnections: 1000,
  connectionTimeout: 300000, // 5 minutes
  enableLogging: true,
});
```

### 2. Client-Side Usage

```typescript
import { useSSE } from '@/features/sse';

function MyComponent() {
  const {
    isConnected,
    isConnecting,
    error,
    lastEvent,
    events,
    connect,
    disconnect,
    clearEvents,
  } = useSSE({
    onOpen: () => console.log('Connected to SSE'),
    onMessage: (event) => console.log('Received event:', event),
    onError: (error) => console.error('SSE error:', error),
  });

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      {lastEvent && (
        <p>Last event: {JSON.stringify(lastEvent)}</p>
      )}
    </div>
  );
}
```

## API Reference

### Server-Side API

#### Core Functions

```typescript
// Initialize SSE service
initializeSSE(config?: SSEConfig): SSEManager

// Get SSE manager instance
getSSEManager(): SSEManager

// Connect a client
connectSSEClient(userId?: string, sessionId?: string, metadata?: Record<string, any>): Promise<Response>

// Send events
sendToClient(clientId: string, event: SSEEvent): boolean
broadcastEvent(event: SSEEvent): number
sendToUser(userId: string, event: SSEEvent): number
sendToSession(sessionId: string, event: SSEEvent): number
sendMessage(message: SSEMessage): number

// Utility functions
createNotificationEvent(title: string, message: string, type?: string, data?: any): SSEEvent
createUpdateEvent(resource: string, action: string, data?: any): SSEEvent
createSystemEvent(type: string, data?: any): SSEEvent

// Management
getConnectionInfo(): SSEConnectionInfo[]
getStats(): SSEManagerStats
disconnectClient(clientId: string): boolean
destroySSE(): void
```

#### Event Types

```typescript
interface SSEEvent {
  id?: string;
  event: string;
  data: any;
  retry?: number;
  timestamp?: number;
}

interface SSEMessage {
  event: SSEEvent;
  target?: 'all' | 'user' | 'session' | 'client';
  targetId?: string;
  targetIds?: string[];
}
```

### Client-Side API

#### useSSE Hook

```typescript
interface SSEHookOptions {
  url?: string;                    // SSE endpoint URL (default: '/api/sse')
  autoConnect?: boolean;           // Auto-connect on mount (default: true)
  reconnectInterval?: number;      // Reconnection interval in ms (default: 5000)
  maxReconnectAttempts?: number;   // Max reconnection attempts (default: 5)
  onOpen?: () => void;            // Connection opened callback
  onClose?: () => void;           // Connection closed callback
  onError?: (error: Event) => void; // Error callback
  onMessage?: (event: SSEEvent) => void; // Message received callback
}

interface SSEHookReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastEvent: SSEEvent | null;
  events: SSEEvent[];
  connect: () => void;
  disconnect: () => void;
  clearEvents: () => void;
}
```

## Usage Examples

### 1. Sending Notifications

```typescript
import { createNotificationEvent, broadcastEvent } from '@/features/sse';

// Create and send a notification
const notification = createNotificationEvent(
  'Welcome!',
  'You have successfully connected to SSE',
  'success'
);
broadcastEvent(notification);
```

### 2. User-Specific Messages

```typescript
import { sendToUser, createUpdateEvent } from '@/features/sse';

// Send update to specific user
const update = createUpdateEvent('profile', 'updated', { userId: '123' });
sendToUser('user123', update);
```

### 3. Session-Based Messaging

```typescript
import { sendToSession } from '@/features/sse';

// Send message to all clients in a session
sendToSession('session456', {
  event: 'chat_message',
  data: { message: 'Hello from session!', sender: 'user123' },
  timestamp: Date.now(),
});
```

### 4. Custom Event Handling

```typescript
import { useSSE } from '@/features/sse';

function ChatComponent() {
  const { events, isConnected } = useSSE({
    onMessage: (event) => {
      if (event.event === 'chat_message') {
        // Handle chat message
        console.log('New chat message:', event.data);
      } else if (event.event === 'user_typing') {
        // Handle typing indicator
        console.log('User typing:', event.data);
      }
    },
  });

  return (
    <div>
      {events
        .filter(e => e.event === 'chat_message')
        .map((event, index) => (
          <div key={index}>
            <strong>{event.data.sender}:</strong> {event.data.message}
          </div>
        ))}
    </div>
  );
}
```

### 5. Integration with Webhooks

```typescript
// In a webhook handler
import { sendToUser, createUpdateEvent } from '@/features/sse';

export async function POST(request: Request) {
  const { userId, action, data } = await request.json();
  
  // Send real-time update to user
  const update = createUpdateEvent('webhook', action, data);
  sendToUser(userId, update);
  
  return Response.json({ success: true });
}
```

## Configuration

### SSE Manager Configuration

```typescript
interface SSEConfig {
  heartbeatInterval?: number;    // Heartbeat interval in ms (default: 30000)
  maxConnections?: number;       // Maximum concurrent connections (default: 1000)
  connectionTimeout?: number;    // Connection timeout in ms (default: 300000)
  enableLogging?: boolean;       // Enable debug logging (default: true)
}
```

### Client Configuration

```typescript
const sseConfig = {
  url: '/api/sse',
  autoConnect: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 5,
  onOpen: () => console.log('Connected'),
  onClose: () => console.log('Disconnected'),
  onError: (error) => console.error('Error:', error),
  onMessage: (event) => console.log('Message:', event),
};
```

## API Endpoints

### GET /api/sse
Establishes an SSE connection for the client.

**Query Parameters:**
- `userId` (optional): User ID for targeted messaging
- `sessionId` (optional): Session ID for session-based messaging
- Any additional parameters are stored as metadata

**Response:** Server-Sent Events stream

### POST /api/sse/test
Test endpoint for sending events to connected clients.

**Request Body:**
```typescript
{
  event: string;           // Event type
  data: any;              // Event data
  target?: string;        // Target type: 'all', 'user', 'session', 'client'
  targetId?: string;      // Target ID for specific targeting
}
```

## Demo

Visit `/sse-demo` to see a live demonstration of the SSE functionality, including:

- Connection status monitoring
- Real-time event display
- Test controls for sending various types of events
- Event history with timestamps

## Best Practices

1. **Connection Management**: Always disconnect SSE connections when components unmount
2. **Error Handling**: Implement proper error handling for connection failures
3. **Reconnection Logic**: Use the built-in reconnection logic for production applications
4. **Event Filtering**: Filter events on the client side based on your application needs
5. **Resource Cleanup**: The SSE manager automatically cleans up disconnected clients
6. **Security**: Implement proper authentication and authorization for SSE connections

## Troubleshooting

### Common Issues

1. **Connection Fails**: Check if the SSE service is properly initialized
2. **Events Not Received**: Verify the event type matches what the client is listening for
3. **Memory Leaks**: Ensure components properly disconnect SSE connections
4. **CORS Issues**: The SSE endpoint includes CORS headers for cross-origin requests

### Debug Mode

Enable debug logging by setting `enableLogging: true` in the SSE configuration:

```typescript
initializeSSE({
  enableLogging: true,
  // ... other config
});
```

## Performance Considerations

- The SSE manager efficiently handles thousands of concurrent connections
- Heartbeat messages are lightweight and don't impact performance
- Automatic cleanup prevents memory leaks from disconnected clients
- Event targeting reduces unnecessary message processing 