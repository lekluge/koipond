import "server-only";
import { supabaseAdmin } from "@/lib/supabaseServer";
import type { EntrySettings } from "@/lib/entries";

const CAPTURE_WINDOW_MS = 15 * 60 * 1000;

export async function startWinnerChatCapture(streamerId: string, drawId: string, twitchId: string) {
  const { error } = await supabaseAdmin()
    .from("settings")
    .update({
      chat_capture_draw_id: drawId,
      chat_capture_twitch_id: twitchId,
      chat_capture_until: new Date(Date.now() + CAPTURE_WINDOW_MS).toISOString(),
    })
    .eq("streamer_id", streamerId);
  if (error) throw error;
}

export async function captureWinnerMessage(
  streamerId: string,
  settings: EntrySettings,
  twitchId: string,
  message: string,
): Promise<boolean> {
  const capture = settings.chatCapture;
  if (!capture) return false;
  if (capture.twitchId !== twitchId) return false;
  if (Date.parse(capture.until) <= Date.now()) return false;

  const { error } = await supabaseAdmin().from("winner_messages").insert({
    streamer_id: streamerId,
    draw_id: capture.drawId,
    twitch_id: twitchId,
    message,
  });
  if (error) throw error;
  return true;
}

export type WinnerMessage = { id: string; message: string; sent_at: string };

export async function getWinnerMessages(
  streamerId: string,
  drawId: string,
  since?: string,
): Promise<WinnerMessage[]> {
  let query = supabaseAdmin()
    .from("winner_messages")
    .select("id, message, sent_at")
    .eq("streamer_id", streamerId)
    .eq("draw_id", drawId)
    .order("sent_at", { ascending: true })
    .limit(100);
  if (since) query = query.gt("sent_at", since);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
