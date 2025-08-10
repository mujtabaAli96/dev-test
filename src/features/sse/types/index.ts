export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  response: Response;
  controller: ReadableStreamDefaultController;
  lastPing: number;
  isConnected: boolean;
  metadata?: Record<string, any>;
}

export interface SSEEvent {
  id?: string;
  event: string;
  data: any;
  retry?: number;
  timestamp?: number;
}

export interface SSEMessage {
  event: SSEEvent;
  target?: 'all' | 'user' | 'session' | 'client';
  targetId?: string;
  targetIds?: string[];
}

export interface SSEConfig {
  heartbeatInterval?: number;
  maxConnections?: number;
  connectionTimeout?: number;
  enableLogging?: boolean;
}

export interface SSEConnectionInfo {
  clientId: string;
  userId?: string;
  sessionId?: string;
  connectedAt: number;
  lastPing: number;
  isConnected: boolean;
}

export interface SSEManagerStats {
  totalConnections: number;
  activeConnections: number;
  totalEventsSent: number;
  totalErrors: number;
  uptime: number;
}

export type SSEEventType = 
  | 'notification'
  | 'update'
  | 'alert'
  | 'heartbeat'
  | 'system'
  | 'custom';

export interface SSEError {
  code: string;
  message: string;
  timestamp: number;
  clientId?: string;
} 