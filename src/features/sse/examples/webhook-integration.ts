import { sendToUser, createNotificationEvent, createUpdateEvent } from '../services/sse-service';

/**
 * Example: Integrate SSE with Mux webhook for real-time video processing updates
 */
export async function handleMuxWebhook(payload: any) {
  const { type, data } = payload;
  
  switch (type) {
    case 'video.asset.ready':
      // Notify user when video is ready
      const notification = createNotificationEvent(
        'Video Ready!',
        `Your video "${data.asset?.metadata?.title || 'Untitled'}" is now ready to watch.`,
        'success',
        { assetId: data.asset?.id }
      );
      
      if (data.asset?.metadata?.userId) {
        sendToUser(data.asset.metadata.userId, notification);
      }
      break;
      
    case 'video.asset.errored':
      // Notify user of processing error
      const errorNotification = createNotificationEvent(
        'Video Processing Error',
        'There was an error processing your video. Please try again.',
        'error',
        { assetId: data.asset?.id, error: data.asset?.errors }
      );
      
      if (data.asset?.metadata?.userId) {
        sendToUser(data.asset.metadata.userId, errorNotification);
      }
      break;
      
    case 'video.asset.updated':
      // Send update event for asset changes
      const update = createUpdateEvent(
        'video_asset',
        'updated',
        { 
          assetId: data.asset?.id,
          status: data.asset?.status,
          playbackIds: data.asset?.playback_ids 
        }
      );
      
      if (data.asset?.metadata?.userId) {
        sendToUser(data.asset.metadata.userId, update);
      }
      break;
  }
}

/**
 * Example: Integrate SSE with user actions for real-time updates
 */
export async function handleUserAction(userId: string, action: string, data: any) {
  switch (action) {
    case 'profile_updated':
      const profileUpdate = createUpdateEvent(
        'user_profile',
        'updated',
        { 
          userId,
          changes: data.changes,
          timestamp: Date.now()
        }
      );
      
      // Send to all user's connected clients
      sendToUser(userId, profileUpdate);
      break;
      
    case 'reel_uploaded':
      const uploadNotification = createNotificationEvent(
        'Reel Uploaded',
        'Your reel has been uploaded and is being processed.',
        'info',
        { reelId: data.reelId }
      );
      
      sendToUser(userId, uploadNotification);
      break;
      
    case 'new_follower':
      const followerNotification = createNotificationEvent(
        'New Follower',
        `${data.followerName} started following you!`,
        'info',
        { followerId: data.followerId }
      );
      
      sendToUser(userId, followerNotification);
      break;
  }
}

/**
 * Example: Broadcast system-wide announcements
 */
export async function broadcastSystemAnnouncement(message: string, type: 'info' | 'warning' | 'maintenance' = 'info') {
  const announcement = createNotificationEvent(
    'System Announcement',
    message,
    type,
    { 
      announcementId: `announcement_${Date.now()}`,
      timestamp: Date.now()
    }
  );
  
  // Import broadcastEvent from the service
  const { broadcastEvent } = await import('../services/sse-service');
  broadcastEvent(announcement);
}

/**
 * Example: Session-based real-time collaboration
 */
export async function handleCollaborationEvent(sessionId: string, eventType: string, data: any) {
  const collaborationEvent = {
    event: 'collaboration',
    data: {
      type: eventType,
      sessionId,
      ...data,
      timestamp: Date.now()
    },
    timestamp: Date.now()
  };
  
  // Import sendToSession from the service
  const { sendToSession } = await import('../services/sse-service');
  sendToSession(sessionId, collaborationEvent);
} 