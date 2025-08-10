import { SSETestComponent } from '@/features/sse';

export default function SSETestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">SSE Test Page</h1>
      <p className="text-gray-600 mb-8">
        This page demonstrates the Server-Sent Events (SSE) functionality. 
        Open multiple browser tabs to test real-time communication between clients.
      </p>
      <SSETestComponent />
    </div>
  );
} 