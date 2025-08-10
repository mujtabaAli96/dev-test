import { SSEClient, SSEEvent, SSEMessage, SSEConfig, SSEConnectionInfo, SSEManagerStats, SSEError } from '../types';

export class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private sessionConnections: Map<string, Set<string>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: Required<SSEConfig>;
  private startTime: number;
  private stats = {
    totalConnections: 0,
    totalEventsSent: 0,
    totalErrors: 0,
  };

  constructor(config: SSEConfig = {}) {
    this.config = {
      heartbeatInterval: config.heartbeatInterval ?? 30000, // 30 seconds
      maxConnections: config.maxConnections ?? 1000,
      connectionTimeout: config.connectionTimeout ?? 300000, // 5 minutes
      enableLogging: config.enableLogging ?? true,
    };
    this.startTime = Date.now();
    this.startHeartbeat();
  }

  /**
   * Connect a new client to the SSE manager
   */
  async connectClient(
    userId?: string,
    sessionId?: string,
    metadata?: Record<string, any>
  ): Promise<Response> {
    if (this.clients.size >= this.config.maxConnections) {
      throw new Error('Maximum connections reached');
    }

    const clientId = this.generateClientId();
    const stream = new ReadableStream({
      start: (controller) => {
        const client: SSEClient = {
          id: clientId,
          userId,
          sessionId,
          response: new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Cache-Control',
            },
          }),
          controller,
          lastPing: Date.now(),
          isConnected: true,
          metadata,
        };

        this.clients.set(clientId, client);
        this.stats.totalConnections++;

        // Track user connections
        if (userId) {
          if (!this.userConnections.has(userId)) {
            this.userConnections.set(userId, new Set());
          }
          this.userConnections.get(userId)!.add(clientId);
        }

        // Track session connections
        if (sessionId) {
          if (!this.sessionConnections.has(sessionId)) {
            this.sessionConnections.set(sessionId, new Set());
          }
          this.sessionConnections.get(sessionId)!.add(clientId);
        }

        this.log(`Client ${clientId} connected`, { userId, sessionId });
        
        // Send initial connection event
        this.sendToClient(clientId, {
          event: 'connected',
          data: { clientId, timestamp: Date.now() },
        });

        // Handle client disconnect
        controller.signal?.addEventListener('abort', () => {
          this.disconnectClient(clientId);
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });
  }

  /**
   * Send an event to a specific client
   */
  sendToClient(clientId: string, event: SSEEvent): boolean {
    const client = this.clients.get(clientId);
    if (!client || !client.isConnected) {
      this.log(`Client ${clientId} not found or disconnected`);
      return false;
    }

    try {
      const sseMessage = this.formatSSEMessage(event);
      client.controller.enqueue(new TextEncoder().encode(sseMessage));
      this.stats.totalEventsSent++;
      return true;
    } catch (error) {
      this.handleError('SEND_TO_CLIENT_ERROR', error as Error, clientId);
      return false;
    }
  }

  /**
   * Send an event to all clients
   */
  broadcast(event: SSEEvent): number {
    let sentCount = 0;
    const disconnectedClients: string[] = [];

    for (const [clientId, client] of this.clients) {
      if (client.isConnected) {
        if (this.sendToClient(clientId, event)) {
          sentCount++;
        } else {
          disconnectedClients.push(clientId);
        }
      }
    }

    // Clean up disconnected clients
    disconnectedClients.forEach(clientId => this.disconnectClient(clientId));

    this.log(`Broadcasted event to ${sentCount} clients`);
    return sentCount;
  }

  /**
   * Send an event to all clients of a specific user
   */
  sendToUser(userId: string, event: SSEEvent): number {
    const userClients = this.userConnections.get(userId);
    if (!userClients) {
      this.log(`No clients found for user ${userId}`);
      return 0;
    }

    let sentCount = 0;
    const disconnectedClients: string[] = [];

    for (const clientId of userClients) {
      if (this.sendToClient(clientId, event)) {
        sentCount++;
      } else {
        disconnectedClients.push(clientId);
      }
    }

    // Clean up disconnected clients
    disconnectedClients.forEach(clientId => this.disconnectClient(clientId));

    this.log(`Sent event to ${sentCount} clients of user ${userId}`);
    return sentCount;
  }

  /**
   * Send an event to all clients of a specific session
   */
  sendToSession(sessionId: string, event: SSEEvent): number {
    const sessionClients = this.sessionConnections.get(sessionId);
    if (!sessionClients) {
      this.log(`No clients found for session ${sessionId}`);
      return 0;
    }

    let sentCount = 0;
    const disconnectedClients: string[] = [];

    for (const clientId of sessionClients) {
      if (this.sendToClient(clientId, event)) {
        sentCount++;
      } else {
        disconnectedClients.push(clientId);
      }
    }

    // Clean up disconnected clients
    disconnectedClients.forEach(clientId => this.disconnectClient(clientId));

    this.log(`Sent event to ${sentCount} clients of session ${sessionId}`);
    return sentCount;
  }

  /**
   * Send a message with specific targeting
   */
  sendMessage(message: SSEMessage): number {
    switch (message.target) {
      case 'all':
        return this.broadcast(message.event);
      case 'user':
        if (!message.targetId) {
          this.handleError('MISSING_TARGET_ID', new Error('targetId required for user targeting'));
          return 0;
        }
        return this.sendToUser(message.targetId, message.event);
      case 'session':
        if (!message.targetId) {
          this.handleError('MISSING_TARGET_ID', new Error('targetId required for session targeting'));
          return 0;
        }
        return this.sendToSession(message.targetId, message.event);
      case 'client':
        if (!message.targetId) {
          this.handleError('MISSING_TARGET_ID', new Error('targetId required for client targeting'));
          return 0;
        }
        return this.sendToClient(message.targetId, message.event) ? 1 : 0;
      default:
        return this.broadcast(message.event);
    }
  }

  /**
   * Disconnect a specific client
   */
  disconnectClient(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    try {
      client.isConnected = false;
      client.controller.close();
      this.clients.delete(clientId);

      // Remove from user connections
      if (client.userId) {
        const userClients = this.userConnections.get(client.userId);
        if (userClients) {
          userClients.delete(clientId);
          if (userClients.size === 0) {
            this.userConnections.delete(client.userId);
          }
        }
      }

      // Remove from session connections
      if (client.sessionId) {
        const sessionClients = this.sessionConnections.get(client.sessionId);
        if (sessionClients) {
          sessionClients.delete(clientId);
          if (sessionClients.size === 0) {
            this.sessionConnections.delete(client.sessionId);
          }
        }
      }

      this.log(`Client ${clientId} disconnected`);
      return true;
    } catch (error) {
      this.handleError('DISCONNECT_ERROR', error as Error, clientId);
      return false;
    }
  }

  /**
   * Get connection information for all clients
   */
  getConnectionInfo(): SSEConnectionInfo[] {
    const now = Date.now();
    return Array.from(this.clients.values()).map(client => ({
      clientId: client.id,
      userId: client.userId,
      sessionId: client.sessionId,
      connectedAt: client.lastPing, // Using lastPing as proxy for connectedAt
      lastPing: client.lastPing,
      isConnected: client.isConnected,
    }));
  }

  /**
   * Get manager statistics
   */
  getStats(): SSEManagerStats {
    const now = Date.now();
    return {
      totalConnections: this.stats.totalConnections,
      activeConnections: this.clients.size,
      totalEventsSent: this.stats.totalEventsSent,
      totalErrors: this.stats.totalErrors,
      uptime: now - this.startTime,
    };
  }

  /**
   * Clean up all connections and stop the manager
   */
  destroy(): void {
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Disconnect all clients
    for (const clientId of this.clients.keys()) {
      this.disconnectClient(clientId);
    }

    this.log('SSE Manager destroyed');
  }

  /**
   * Start heartbeat mechanism to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const disconnectedClients: string[] = [];

      for (const [clientId, client] of this.clients) {
        // Check if client is still responsive
        if (now - client.lastPing > this.config.connectionTimeout) {
          disconnectedClients.push(clientId);
          continue;
        }

        // Send heartbeat
        try {
          const heartbeatEvent: SSEEvent = {
            event: 'heartbeat',
            data: { timestamp: now },
            timestamp: now,
          };
          this.sendToClient(clientId, heartbeatEvent);
        } catch (error) {
          disconnectedClients.push(clientId);
        }
      }

      // Clean up disconnected clients
      disconnectedClients.forEach(clientId => this.disconnectClient(clientId));

      if (disconnectedClients.length > 0) {
        this.log(`Cleaned up ${disconnectedClients.length} stale connections`);
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Format SSE message according to the SSE specification
   */
  private formatSSEMessage(event: SSEEvent): string {
    let message = '';

    if (event.id) {
      message += `id: ${event.id}\n`;
    }

    if (event.event) {
      message += `event: ${event.event}\n`;
    }

    if (event.retry) {
      message += `retry: ${event.retry}\n`;
    }

    message += `data: ${JSON.stringify(event.data)}\n\n`;

    return message;
  }

  /**
   * Generate a unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle errors with logging and stats tracking
   */
  private handleError(code: string, error: Error, clientId?: string): void {
    this.stats.totalErrors++;
    const sseError: SSEError = {
      code,
      message: error.message,
      timestamp: Date.now(),
      clientId,
    };

    this.log(`SSE Error: ${code} - ${error.message}`, { clientId, error: sseError });
  }

  /**
   * Log messages if logging is enabled
   */
  private log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      console.log(`[SSE Manager] ${message}`, data || '');
    }
  }
} 