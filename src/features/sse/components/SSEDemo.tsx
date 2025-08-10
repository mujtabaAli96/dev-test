'use client';

import { useState } from 'react';
import { useSSE } from '../hooks/useSSE';
import { SSEEvent } from '../types';
import { Button } from '@/features/shared/components/ui/button';

export function SSEDemo() {
  const [testMessage, setTestMessage] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('Test Notification');
  const [notificationMessage, setNotificationMessage] = useState('This is a test notification');

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
    onOpen: () => console.log('SSE connection opened'),
    onClose: () => console.log('SSE connection closed'),
    onError: (error) => console.error('SSE error:', error),
    onMessage: (event) => console.log('SSE message received:', event),
  });

  const sendTestMessage = async () => {
    if (!testMessage.trim()) return;

    try {
      const response = await fetch('/api/sse/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'custom',
          data: { message: testMessage, timestamp: Date.now() },
        }),
      });

      if (response.ok) {
        setTestMessage('');
      }
    } catch (error) {
      console.error('Failed to send test message:', error);
    }
  };

  const sendNotification = async () => {
    try {
      const response = await fetch('/api/sse/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'notification',
          data: {
            title: notificationTitle,
            message: notificationMessage,
            type: 'info',
            timestamp: Date.now(),
          },
        }),
      });

      if (response.ok) {
        setNotificationTitle('Test Notification');
        setNotificationMessage('This is a test notification');
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const sendBroadcast = async () => {
    try {
      const response = await fetch('/api/sse/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'broadcast',
          data: {
            message: 'This is a broadcast message to all connected clients',
            timestamp: Date.now(),
          },
        }),
      });

      if (!response.ok) {
        console.error('Failed to send broadcast');
      }
    } catch (error) {
      console.error('Failed to send broadcast:', error);
    }
  };

  const formatEvent = (event: SSEEvent) => {
    return {
      id: event.id || 'N/A',
      type: event.event,
      data: event.data,
      timestamp: new Date(event.timestamp || Date.now()).toLocaleTimeString(),
    };
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">SSE Demo</h2>
        
        {/* Connection Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Connection Status</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm">
                {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
            {error && <span className="text-red-600 text-sm">Error: {error}</span>}
          </div>
          
          <div className="mt-2 flex space-x-2">
            <Button
              onClick={connect}
              disabled={isConnected || isConnecting}
              size="sm"
            >
              Connect
            </Button>
            <Button
              onClick={disconnect}
              disabled={!isConnected}
              variant="outline"
              size="sm"
            >
              Disconnect
            </Button>
            <Button
              onClick={clearEvents}
              variant="outline"
              size="sm"
            >
              Clear Events
            </Button>
          </div>
        </div>

        {/* Test Controls */}
        <div className="mb-6 space-y-4">
          <h3 className="text-lg font-semibold">Test Controls</h3>
          
          {/* Custom Message */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Custom Message</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter a test message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                onClick={sendTestMessage}
                disabled={!isConnected || !testMessage.trim()}
                size="sm"
              >
                Send
              </Button>
            </div>
          </div>

          {/* Notification */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Notification</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="text"
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                placeholder="Notification title..."
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Notification message..."
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button
              onClick={sendNotification}
              disabled={!isConnected}
              size="sm"
            >
              Send Notification
            </Button>
          </div>

          {/* Broadcast */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Broadcast to All Clients</label>
            <Button
              onClick={sendBroadcast}
              disabled={!isConnected}
              variant="outline"
              size="sm"
            >
              Send Broadcast
            </Button>
          </div>
        </div>

        {/* Events Display */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Events ({events.length})</h3>
            {lastEvent && (
              <span className="text-sm text-gray-500">
                Last: {new Date(lastEvent.timestamp || Date.now()).toLocaleTimeString()}
              </span>
            )}
          </div>

          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No events received yet. Connect to start receiving events.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.slice().reverse().map((event, index) => (
                <div
                  key={`${event.id || index}-${event.timestamp}`}
                  className="p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-600">
                      {event.event}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(event.timestamp || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                    {JSON.stringify(formatEvent(event), null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 