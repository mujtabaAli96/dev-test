import { NextRequest } from 'next/server';
import { 
  broadcastEvent, 
  sendMessage, 
  createNotificationEvent, 
  createUpdateEvent, 
  createSystemEvent 
} from '@/features/sse/services/sse-service';
import { SSEEvent, SSEMessage } from '@/features/sse/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data, target, targetId } = body;

    let sentCount = 0;

    if (target && targetId) {
      // Send to specific target
      const message: SSEMessage = {
        event: { event, data, timestamp: Date.now() },
        target: target as 'all' | 'user' | 'session' | 'client',
        targetId,
      };
      sentCount = sendMessage(message);
    } else if (event === 'broadcast') {
      // Broadcast to all clients
      const broadcastEvent: SSEEvent = {
        event: 'broadcast',
        data,
        timestamp: Date.now(),
      };
      sentCount = broadcastEvent(broadcastEvent);
    } else if (event === 'notification') {
      // Send notification event
      const notificationEvent = createNotificationEvent(
        data.title || 'Notification',
        data.message || 'No message provided',
        data.type || 'info',
        data
      );
      sentCount = broadcastEvent(notificationEvent);
    } else if (event === 'update') {
      // Send update event
      const updateEvent = createUpdateEvent(
        data.resource || 'unknown',
        data.action || 'updated',
        data
      );
      sentCount = broadcastEvent(updateEvent);
    } else if (event === 'system') {
      // Send system event
      const systemEvent = createSystemEvent(
        data.type || 'info',
        data
      );
      sentCount = broadcastEvent(systemEvent);
    } else {
      // Send custom event
      const customEvent: SSEEvent = {
        event,
        data,
        timestamp: Date.now(),
      };
      sentCount = broadcastEvent(customEvent);
    }

    return Response.json({
      success: true,
      message: `Event sent to ${sentCount} clients`,
      sentCount,
    });
  } catch (error) {
    console.error('Error sending SSE event:', error);
    return Response.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 