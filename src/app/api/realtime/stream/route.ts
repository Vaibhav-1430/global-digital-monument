import { NextRequest } from 'next/server';
import { registerSseClient } from '@/lib/realtime/broadcast';
import { LightMarkerData } from '@/types';

/**
 * GET /api/realtime/stream
 *
 * Real-time Server-Sent Events (SSE) stream broadcasting confirmed lights to connected 3D globes.
 */
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  let unregister: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`event: connected\ndata: {"status":"connected"}\n\n`));

      // Register client in the broadcast listener set
      unregister = registerSseClient((newMarker: LightMarkerData) => {
        try {
          const payload = JSON.stringify(newMarker);
          controller.enqueue(encoder.encode(`event: new_light\ndata: ${payload}\n\n`));
        } catch (err) {
          console.error('Failed to encode SSE marker:', err);
        }
      });

      // Keepalive heartbeat ping every 25 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
        }
      }, 25000);

      req.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        if (unregister) unregister();
      });
    },
    cancel() {
      if (unregister) unregister();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
