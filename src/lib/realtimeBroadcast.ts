import "server-only";
import { env } from "@/lib/env";

export type StreamerEvent = "entries" | "winner-chat" | "chat";

export function streamerTopic(streamerId: string, event: StreamerEvent): string {
  return `streamer:${streamerId}:${event}`;
}

export async function broadcastToStreamer(
  streamerId: string,
  event: StreamerEvent,
  payload: object = {},
): Promise<void> {
  try {
    const res = await fetch(`${env.supabaseUrl}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: env.supabaseServiceRoleKey,
        Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ topic: streamerTopic(streamerId, event), event: "ping", payload }],
      }),
    });
    if (!res.ok) {
      console.error("Realtime broadcast failed", event, res.status, await res.text());
    }
  } catch (err) {
    console.error("Realtime broadcast failed", event, err);
  }
}
