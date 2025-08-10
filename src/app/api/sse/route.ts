import { NextRequest } from 'next/server';
import { connectSSEClient, initializeSSE } from '@/features/sse/services/sse-service';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';

// Initialize SSE service on module load
initializeSSE({
  heartbeatInterval: 30000, // 30 seconds
  maxConnections: 1000,
  connectionTimeout: 300000, // 5 minutes
  enableLogging: true,
});

export async function GET(request: NextRequest) {
  try {
    // Get session for user identification
    const session = await getServerSession(authConfig);
    const userId = session?.user?.id;
    const sessionId = session?.sessionId;

    // Get query parameters for additional metadata
    const { searchParams } = new URL(request.url);
    const metadata: Record<string, any> = {};

    // Add user agent and other request metadata
    metadata.userAgent = request.headers.get('user-agent');
    metadata.ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    metadata.referer = request.headers.get('referer');

    // Add any custom query parameters to metadata
    for (const [key, value] of searchParams.entries()) {
      if (key !== 'userId' && key !== 'sessionId') {
        metadata[key] = value;
      }
    }

    // Connect the client to SSE
    const response = await connectSSEClient(userId, sessionId, metadata);

    return response;
  } catch (error) {
    console.error('SSE connection error:', error);
    return new Response('SSE connection failed', { status: 500 });
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
} 