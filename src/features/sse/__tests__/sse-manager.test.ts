import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SSEManager } from '../services/sse-manager';
import type { SSEEvent } from '../types';

describe('SSEManager', () => {
  let sseManager: SSEManager;

  beforeEach(() => {
    sseManager = new SSEManager({
      heartbeatInterval: 100, // Short interval for testing
      maxConnections: 10,
      connectionTimeout: 1000,
      enableLogging: false,
    });
  });

  afterEach(() => {
    sseManager.destroy();
  });

  describe('Client Management', () => {
    it('should connect a client successfully', async () => {
      const response = await sseManager.connectClient('user123', 'session456');
      
      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');
    });

    it('should track user connections', async () => {
      await sseManager.connectClient('user123', 'session456');
      await sseManager.connectClient('user123', 'session789');
      
      const connectionInfo = sseManager.getConnectionInfo();
      const userConnections = connectionInfo.filter(conn => conn.userId === 'user123');
      
      expect(userConnections).toHaveLength(2);
    });

    it('should track session connections', async () => {
      await sseManager.connectClient('user123', 'session456');
      await sseManager.connectClient('user456', 'session456');
      
      const connectionInfo = sseManager.getConnectionInfo();
      const sessionConnections = connectionInfo.filter(conn => conn.sessionId === 'session456');
      
      expect(sessionConnections).toHaveLength(2);
    });

    it('should respect max connections limit', async () => {
      const promises = [];
      
      // Try to connect more clients than the limit
      for (let i = 0; i < 15; i++) {
        promises.push(
          sseManager.connectClient(`user${i}`, `session${i}`).catch(err => err)
        );
      }
      
      const results = await Promise.all(promises);
      const errors = results.filter(result => result instanceof Error);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(sseManager.getConnectionInfo()).toHaveLength(10); // Max connections
    });
  });

  describe('Event Broadcasting', () => {
    it('should broadcast events to all connected clients', async () => {
      // Connect multiple clients
      await sseManager.connectClient('user1', 'session1');
      await sseManager.connectClient('user2', 'session2');
      await sseManager.connectClient('user3', 'session3');
      
      const event: SSEEvent = {
        event: 'test',
        data: { message: 'Hello World' },
        timestamp: Date.now(),
      };
      
      const sentCount = sseManager.broadcast(event);
      expect(sentCount).toBe(3);
    });

    it('should send events to specific users', async () => {
      await sseManager.connectClient('user1', 'session1');
      await sseManager.connectClient('user1', 'session2'); // Same user, different session
      await sseManager.connectClient('user2', 'session3');
      
      const event: SSEEvent = {
        event: 'user_specific',
        data: { message: 'User specific message' },
        timestamp: Date.now(),
      };
      
      const sentCount = sseManager.sendToUser('user1', event);
      expect(sentCount).toBe(2); // Should send to both sessions of user1
    });

    it('should send events to specific sessions', async () => {
      await sseManager.connectClient('user1', 'session1');
      await sseManager.connectClient('user2', 'session1'); // Same session, different user
      await sseManager.connectClient('user3', 'session2');
      
      const event: SSEEvent = {
        event: 'session_specific',
        data: { message: 'Session specific message' },
        timestamp: Date.now(),
      };
      
      const sentCount = sseManager.sendToSession('session1', event);
      expect(sentCount).toBe(2); // Should send to both users in session1
    });

    it('should handle disconnected clients gracefully', async () => {
      const response = await sseManager.connectClient('user1', 'session1');
      const connectionInfo = sseManager.getConnectionInfo();
      const clientId = connectionInfo[0].clientId;
      
      // Disconnect the client
      const disconnected = sseManager.disconnectClient(clientId);
      expect(disconnected).toBe(true);
      
      // Try to send to disconnected client
      const event: SSEEvent = {
        event: 'test',
        data: { message: 'Should not be sent' },
        timestamp: Date.now(),
      };
      
      const sentCount = sseManager.sendToClient(clientId, event);
      expect(sentCount).toBe(false);
    });
  });

  describe('Message Targeting', () => {
    it('should handle targeted messages correctly', async () => {
      await sseManager.connectClient('user1', 'session1');
      await sseManager.connectClient('user2', 'session2');
      
      const event: SSEEvent = {
        event: 'targeted',
        data: { message: 'Targeted message' },
        timestamp: Date.now(),
      };
      
      // Test user targeting
      const userSentCount = sseManager.sendMessage({
        event,
        target: 'user',
        targetId: 'user1',
      });
      expect(userSentCount).toBe(1);
      
      // Test session targeting
      const sessionSentCount = sseManager.sendMessage({
        event,
        target: 'session',
        targetId: 'session2',
      });
      expect(sessionSentCount).toBe(1);
      
      // Test broadcast
      const broadcastSentCount = sseManager.sendMessage({
        event,
        target: 'all',
      });
      expect(broadcastSentCount).toBe(2);
    });

    it('should handle missing target ID errors', async () => {
      const event: SSEEvent = {
        event: 'test',
        data: { message: 'Test' },
        timestamp: Date.now(),
      };
      
      const sentCount = sseManager.sendMessage({
        event,
        target: 'user',
        // Missing targetId
      });
      
      expect(sentCount).toBe(0);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide accurate statistics', async () => {
      const initialStats = sseManager.getStats();
      expect(initialStats.totalConnections).toBe(0);
      expect(initialStats.activeConnections).toBe(0);
      expect(initialStats.totalEventsSent).toBe(0);
      expect(initialStats.totalErrors).toBe(0);
      expect(initialStats.uptime).toBeGreaterThan(0);
      
      // Connect a client
      await sseManager.connectClient('user1', 'session1');
      
      const afterConnectStats = sseManager.getStats();
      expect(afterConnectStats.totalConnections).toBe(1);
      expect(afterConnectStats.activeConnections).toBe(1);
      
      // Send an event
      const event: SSEEvent = {
        event: 'test',
        data: { message: 'Test' },
        timestamp: Date.now(),
      };
      sseManager.broadcast(event);
      
      const afterEventStats = sseManager.getStats();
      expect(afterEventStats.totalEventsSent).toBe(1);
    });

    it('should provide connection information', async () => {
      await sseManager.connectClient('user1', 'session1');
      await sseManager.connectClient('user2', 'session2');
      
      const connectionInfo = sseManager.getConnectionInfo();
      expect(connectionInfo).toHaveLength(2);
      
      const firstConnection = connectionInfo[0];
      expect(firstConnection).toHaveProperty('clientId');
      expect(firstConnection).toHaveProperty('userId');
      expect(firstConnection).toHaveProperty('sessionId');
      expect(firstConnection).toHaveProperty('connectedAt');
      expect(firstConnection).toHaveProperty('lastPing');
      expect(firstConnection).toHaveProperty('isConnected');
      expect(firstConnection.isConnected).toBe(true);
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should clean up resources on destroy', async () => {
      await sseManager.connectClient('user1', 'session1');
      await sseManager.connectClient('user2', 'session2');
      
      expect(sseManager.getConnectionInfo()).toHaveLength(2);
      
      sseManager.destroy();
      
      expect(sseManager.getConnectionInfo()).toHaveLength(0);
    });
  });
}); 