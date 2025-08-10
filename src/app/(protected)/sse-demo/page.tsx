import { SSEDemo } from '@/features/sse';

export default function SSEDemoPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Server-Sent Events Demo</h1>
          <p className="text-gray-600">
            This page demonstrates the SSE (Server-Sent Events) functionality. 
            Connect to start receiving real-time updates from the server.
          </p>
        </div>
        
        <SSEDemo />
      </div>
    </div>
  );
} 