import { LightMarkerData } from '@/types';

// In-process event emitter for Server-Sent Events broadcast
type SseClient = (data: LightMarkerData) => void;
const sseClients = new Set<SseClient>();

/**
 * Registers an active client SSE connection.
 */
export function registerSseClient(client: SseClient): () => void {
  sseClients.add(client);
  return () => {
    sseClients.delete(client);
  };
}

/**
 * Broadcasts a newly confirmed light to all active clients.
 *
 * Emits strictly public, non-sensitive marker attributes.
 */
export function broadcastConfirmedLight(marker: LightMarkerData): void {
  // 1. Broadcast via in-process SSE
  sseClients.forEach((send) => {
    try {
      send(marker);
    } catch (err) {
      console.error('Error broadcasting SSE event:', err);
    }
  });
}
