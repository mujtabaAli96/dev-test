import { SSEManager } from './sse-manager';
import { SSEEvent, SSEMessage, SSEConfig } from '../types';

// Global SSE manager instance
let sseManager: SSEManager | null = null;

/**
 * Initialize the SSE service with configuration
 */
export function initializeSSE(config?: SSEConfig): SSEManager {
  if (sseManager) {
    console.warn('SSE service already initialized');
    return sseManager;
  }

  sseManager = new SSEManager(config);
  console.log('SSE service initialized');
  return sseManager;
}

/**
 * Get the SSE manager instance
 */
export function getSSEManager(): SSEManager {
  if (!sseManager) {
    throw new Error('SSE service not initialized. Call initializeSSE() first.');
  }
  return sseManager;
}

/**
 * Connect a client to SSE
 */
export async function connectSSEClient(
  userId?: string,
  sessionId?: string,
  metadata?: Record<string, any>
): Promise<Response> {
  const manager = getSSEManager();
  return manager.connectClient(userId, sessionId, metadata);
}

/**
 * Send an event to a specific client
 */
export function sendToClient(clientId: string, event: SSEEvent): boolean {
  const manager = getSSEManager();
  return manager.sendToClient(clientId, event);
}

/**
 * Broadcast an event to all connected clients
 */
export function broadcastEvent(event: SSEEvent): number {
  const manager = getSSEManager();
  return manager.broadcast(event);
}

/**
 * Send an event to all clients of a specific user
 */
export function sendToUser(userId: string, event: SSEEvent): number {
  const manager = getSSEManager();
  return manager.sendToUser(userId, event);
}

/**
 * Send an event to all clients of a specific session
 */
export function sendToSession(sessionId: string, event: SSEEvent): number {
  const manager = getSSEManager();
  return manager.sendToSession(sessionId, event);
}

/**
 * Send a message with specific targeting
 */
export function sendMessage(message: SSEMessage): number {
  const manager = getSSEManager();
  return manager.sendMessage(message);
}

/**
 * Get connection information for all clients
 */
export function getConnectionInfo() {
  const manager = getSSEManager();
  return manager.getConnectionInfo();
}

/**
 * Get SSE manager statistics
 */
export function getStats() {
  const manager = getSSEManager();
  return manager.getStats();
}

/**
 * Disconnect a specific client
 */
export function disconnectClient(clientId: string): boolean {
  const manager = getSSEManager();
  return manager.disconnectClient(clientId);
}

/**
 * Destroy the SSE service and clean up all connections
 */
export function destroySSE(): void {
  if (sseManager) {
    sseManager.destroy();
    sseManager = null;
    console.log('SSE service destroyed');
  }
}

/**
 * Utility function to create notification events
 */
export function createNotificationEvent(
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  data?: any
): SSEEvent {
  return {
    event: 'notification',
    data: {
      title,
      message,
      type,
      timestamp: Date.now(),
      ...data,
    },
    timestamp: Date.now(),
  };
}

/**
 * Utility function to create update events
 */
export function createUpdateEvent(
  resource: string,
  action: 'created' | 'updated' | 'deleted',
  data?: any
): SSEEvent {
  return {
    event: 'update',
    data: {
      resource,
      action,
      timestamp: Date.now(),
      ...data,
    },
    timestamp: Date.now(),
  };
}

/**
 * Utility function to create system events
 */
export function createSystemEvent(
  type: string,
  data?: any
): SSEEvent {
  return {
    event: 'system',
    data: {
      type,
      timestamp: Date.now(),
      ...data,
    },
    timestamp: Date.now(),
  };
} 