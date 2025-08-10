// Core SSE functionality
export { SSEManager } from './services/sse-manager';
export { 
  initializeSSE,
  getSSEManager,
  connectSSEClient,
  sendToClient,
  broadcastEvent,
  sendToUser,
  sendToSession,
  sendMessage,
  getConnectionInfo,
  getStats,
  disconnectClient,
  destroySSE,
  createNotificationEvent,
  createUpdateEvent,
  createSystemEvent,
} from './services/sse-service';

// React hooks
export { useSSE } from './hooks/useSSE';

// Components
export { SSEDemo } from './components/SSEDemo';

// Types
export type {
  SSEClient,
  SSEEvent,
  SSEMessage,
  SSEConfig,
  SSEConnectionInfo,
  SSEManagerStats,
  SSEEventType,
  SSEError,
} from './types'; 