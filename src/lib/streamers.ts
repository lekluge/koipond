import "server-only";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { env } from "@/lib/env";
import { getSession, type Session } from "@/lib/session";

export type Streamer = {
  id: string;
  twitchId: string;
  twitchLogin: string;
  twitchDisplayName: string;
  botScopeGranted: boolean;
  eventsubSubscriptionId: string | null;
};

const COLUMNS = "id, twitch_id, twitch_login, twitch_display_name, bot_scope_granted, eventsub_subscription_id";

type Row = {
  id: string;
  twitch_id: string;
  twitch_login: string;
  twitch_display_name: string;
  bot_scope_granted: boolean;
  eventsub_subscription_id: string | null;
};

function toStreamer(row: Row): Streamer {
  return {
    id: row.id,
    twitchId: row.twitch_id,
    twitchLogin: row.twitch_login,
    twitchDisplayName: row.twitch_display_name,
    botScopeGranted: row.bot_scope_granted,
    eventsubSubscriptionId: row.eventsub_subscription_id,
  };
}

export async function getStreamerByTwitchId(twitchId: string): Promise<Streamer | null> {
  const { data, error } = await supabaseAdmin()
    .from("streamers")
    .select(COLUMNS)
    .eq("twitch_id", twitchId)
    .maybeSingle();
  if (error) throw error;
  return data ? toStreamer(data as Row) : null;
}

export async function getStreamerByLogin(login: string): Promise<Streamer | null> {
  const { data, error } = await supabaseAdmin()
    .from("streamers")
    .select(COLUMNS)
    .eq("twitch_login", login.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data ? toStreamer(data as Row) : null;
}

export async function getSessionStreamer(): Promise<Streamer | null> {
  const session = await getSession();
  if (!session) return null;
  return getStreamerByTwitchId(session.twitchId);
}

export async function requireStreamer(): Promise<Streamer> {
  const streamer = await getSessionStreamer();
  if (!streamer) throw new Error("Not authorized");
  return streamer;
}

export function mayRegisterAsStreamer(twitchId: string): boolean {
  const allowed = env.allowedStreamerTwitchIds;
  return allowed.length === 0 || allowed.includes(twitchId);
}

export async function registerStreamer(session: Session, botScopeGranted: boolean): Promise<Streamer> {
  const db = supabaseAdmin();
  const existing = await getStreamerByTwitchId(session.twitchId);

  const { data, error } = await db
    .from("streamers")
    .upsert(
      {
        twitch_id: session.twitchId,
        twitch_login: session.twitchLogin.toLowerCase(),
        twitch_display_name: session.twitchDisplayName,
        bot_scope_granted: botScopeGranted || (existing?.botScopeGranted ?? false),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "twitch_id" },
    )
    .select(COLUMNS)
    .single();
  if (error) throw error;

  const streamer = toStreamer(data as Row);
  if (!existing) {
    await ensureSettingsRow(streamer.id);
  }
  return streamer;
}

export async function ensureSettingsRow(streamerId: string) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("settings")
    .select("id")
    .eq("streamer_id", streamerId)
    .maybeSingle();
  if (error) throw error;
  if (data) return;

  const { error: insertError } = await db.from("settings").insert({ streamer_id: streamerId });
  if (insertError && insertError.code !== "23505") throw insertError;
}

export async function setEventSubSubscriptionId(streamerId: string, subscriptionId: string | null) {
  const { error } = await supabaseAdmin()
    .from("streamers")
    .update({ eventsub_subscription_id: subscriptionId, updated_at: new Date().toISOString() })
    .eq("id", streamerId);
  if (error) throw error;
}
