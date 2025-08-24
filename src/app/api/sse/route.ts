import { NextRequest } from 'next/server';

// Store active SSE connections
const connections = new Set<ReadableStreamDefaultController>();

// Broadcast function to send updates to all connected clients
export function broadcastUpdate(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  connections.forEach(controller => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch (error) {
      // Remove dead connections
      connections.delete(controller);
    }
  });
}

export async function GET(request: NextRequest) {
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to our set
      connections.add(controller);
      
      // Send initial connection message
      const welcomeMessage = `data: ${JSON.stringify({
        type: 'connection',
        message: 'Connected to Entity real-time updates',
        timestamp: new Date().toISOString()
      })}\n\n`;
      
      controller.enqueue(new TextEncoder().encode(welcomeMessage));
      
      // Send periodic heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const heartbeatMessage = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`;
          
          controller.enqueue(new TextEncoder().encode(heartbeatMessage));
        } catch (error) {
          clearInterval(heartbeat);
          connections.delete(controller);
        }
      }, 30000); // Every 30 seconds
      
      // Clean up when connection closes
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        connections.delete(controller);
        controller.close();
      });
    },
    
    cancel(controller: ReadableStreamDefaultController) {
      // Connection was cancelled
      connections.delete(controller);
    }
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