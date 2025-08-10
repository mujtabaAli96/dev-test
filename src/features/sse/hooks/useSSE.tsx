'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { SSEEvent } from '../types';

export interface SSEHookOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (event: SSEEvent) => void;
}

export interface SSEHookReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastEvent: SSEEvent | null;
  events: SSEEvent[];
  connect: () => void;
  disconnect: () => void;
  clearEvents: () => void;
}

export function useSSE(options: SSEHookOptions = {}): SSEHookReturn {
  const {
    url = '/api/sse',
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    onOpen,
    onClose,
    onError,
    onMessage,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [events, setEvents] = useState<SSEEvent[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);
    shouldReconnectRef.current = true;

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        onOpen?.();
      };

      eventSource.onerror = (event) => {
        setIsConnected(false);
        setIsConnecting(false);
        setError('SSE connection error');
        onError?.(event);

        // Attempt to reconnect if not manually disconnected
        if (shouldReconnectRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            id: event.lastEventId || undefined,
            event: event.type || 'message',
            data,
            timestamp: Date.now(),
          };

          setLastEvent(sseEvent);
          setEvents(prev => [...prev, sseEvent]);
          onMessage?.(sseEvent);
        } catch (parseError) {
          console.error('Failed to parse SSE event:', parseError);
        }
      };

      // Handle custom events
      eventSource.addEventListener('notification', (event) => {
        try {
          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            id: event.lastEventId || undefined,
            event: 'notification',
            data,
            timestamp: Date.now(),
          };

          setLastEvent(sseEvent);
          setEvents(prev => [...prev, sseEvent]);
          onMessage?.(sseEvent);
        } catch (parseError) {
          console.error('Failed to parse notification event:', parseError);
        }
      });

      eventSource.addEventListener('update', (event) => {
        try {
          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            id: event.lastEventId || undefined,
            event: 'update',
            data,
            timestamp: Date.now(),
          };

          setLastEvent(sseEvent);
          setEvents(prev => [...prev, sseEvent]);
          onMessage?.(sseEvent);
        } catch (parseError) {
          console.error('Failed to parse update event:', parseError);
        }
      });

      eventSource.addEventListener('heartbeat', (event) => {
        try {
          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            id: event.lastEventId || undefined,
            event: 'heartbeat',
            data,
            timestamp: Date.now(),
          };

          setLastEvent(sseEvent);
          onMessage?.(sseEvent);
        } catch (parseError) {
          console.error('Failed to parse heartbeat event:', parseError);
        }
      });

      eventSource.addEventListener('connected', (event) => {
        try {
          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            id: event.lastEventId || undefined,
            event: 'connected',
            data,
            timestamp: Date.now(),
          };

          setLastEvent(sseEvent);
          setEvents(prev => [...prev, sseEvent]);
          onMessage?.(sseEvent);
        } catch (parseError) {
          console.error('Failed to parse connected event:', parseError);
        }
      });

    } catch (err) {
      setIsConnecting(false);
      setError(err instanceof Error ? err.message : 'Failed to create SSE connection');
    }
  }, [url, isConnecting, isConnected, reconnectInterval, maxReconnectAttempts, onOpen, onError, onMessage]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    setIsConnecting(false);
    setIsConnected(false);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    onClose?.();
  }, [onClose]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    lastEvent,
    events,
    connect,
    disconnect,
    clearEvents,
  };
} 