import "server-only";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { ensureSettingsRow } from "@/lib/streamers";

export type EntrySettings = {
  triggerWord: string;
  entriesOpen: boolean;
  entriesSession: number;
  removeSpammers: boolean;
  uniqueWinners: boolean;
  chatAnnouncement: boolean;
  ignoreOsuCriteria: boolean;
  viewerLuckModifier: number;
  regularLuckModifier: number;
  subscriberLuckModifier: number;
  vipLuckModifier: number;
  moderatorLuckModifier: number;
  regulars: string;
  regularsList: string[];
  chatCapture: { drawId: string; twitchId: string; until: string } | null;
};

export type GiveawaySettingsInput = {
  triggerWord: string;
  removeSpammers: boolean;
  uniqueWinners: boolean;
  chatAnnouncement: boolean;
  ignoreOsuCriteria: boolean;
  viewerLuckModifier: number;
  regularLuckModifier: number;
  subscriberLuckModifier: number;
  vipLuckModifier: number;
  moderatorLuckModifier: number;
  regulars: string;
};

function parseRegulars(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export type Entrant = {
  participant_id: string | null;
  twitch_id: string;
  twitch_login: string;
  twitch_display_name: string;
  osu_username: string | null;
  global_rank: number | null;
  country_rank: number | null;
  country_code: string | null;
  pp: number | null;
  accuracy: number | null;
  playcount: number | null;
  top_play_pp: number | null;
  top_play_sr: number | null;
  linked: boolean;
};

const SETTINGS_COLUMNS =
  "trigger_word, entries_open, entries_session, remove_spammers, unique_winners, chat_announcement, ignore_osu_criteria, viewer_luck_modifier, regular_luck_modifier, subscriber_luck_modifier, vip_luck_modifier, moderator_luck_modifier, regulars, chat_capture_draw_id, chat_capture_twitch_id, chat_capture_until";

type SettingsRow = {
  trigger_word: string;
  entries_open: boolean;
  entries_session: number;
  remove_spammers: boolean;
  unique_winners: boolean;
  chat_announcement: boolean;
  ignore_osu_criteria: boolean;
  viewer_luck_modifier: number | string;
  regular_luck_modifier: number | string;
  subscriber_luck_modifier: number | string;
  vip_luck_modifier: number | string;
  moderator_luck_modifier: number | string;
  regulars: string;
  chat_capture_draw_id: string | null;
  chat_capture_twitch_id: string | null;
  chat_capture_until: string | null;
};

function toEntrySettings(data: SettingsRow): EntrySettings {
  return {
    triggerWord: data.trigger_word,
    entriesOpen: data.entries_open,
    entriesSession: data.entries_session,
    removeSpammers: data.remove_spammers,
    uniqueWinners: data.unique_winners,
    chatAnnouncement: data.chat_announcement,
    ignoreOsuCriteria: data.ignore_osu_criteria,
    viewerLuckModifier: Number(data.viewer_luck_modifier),
    regularLuckModifier: Number(data.regular_luck_modifier),
    subscriberLuckModifier: Number(data.subscriber_luck_modifier),
    vipLuckModifier: Number(data.vip_luck_modifier),
    moderatorLuckModifier: Number(data.moderator_luck_modifier),
    regulars: data.regulars,
    regularsList: parseRegulars(data.regulars),
    chatCapture:
      data.chat_capture_draw_id && data.chat_capture_twitch_id && data.chat_capture_until
        ? {
            drawId: data.chat_capture_draw_id,
            twitchId: data.chat_capture_twitch_id,
            until: data.chat_capture_until,
          }
        : null,
  };
}

export async function getEntrySettings(streamerId: string): Promise<EntrySettings> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("settings")
    .select(SETTINGS_COLUMNS)
    .eq("streamer_id", streamerId)
    .maybeSingle();
  if (error) throw error;
  if (data) return toEntrySettings(data as SettingsRow);

  await ensureSettingsRow(streamerId);
  const { data: created, error: createdError } = await db
    .from("settings")
    .select(SETTINGS_COLUMNS)
    .eq("streamer_id", streamerId)
    .single();
  if (createdError) throw createdError;
  return toEntrySettings(created as SettingsRow);
}

export async function setTriggerWord(streamerId: string, word: string) {
  const db = supabaseAdmin();
  await ensureSettingsRow(streamerId);
  const trimmed = word.trim() || "!join";
  const { error } = await db.from("settings").update({ trigger_word: trimmed }).eq("streamer_id", streamerId);
  if (error) throw error;
}

export async function updateGiveawaySettings(streamerId: string, input: GiveawaySettingsInput) {
  const db = supabaseAdmin();
  await ensureSettingsRow(streamerId);
  const { error } = await db
    .from("settings")
    .update({
      trigger_word: input.triggerWord.trim() || "!join",
      remove_spammers: input.removeSpammers,
      unique_winners: input.uniqueWinners,
      chat_announcement: input.chatAnnouncement,
      ignore_osu_criteria: input.ignoreOsuCriteria,
      viewer_luck_modifier: input.viewerLuckModifier,
      regular_luck_modifier: input.regularLuckModifier,
      subscriber_luck_modifier: input.subscriberLuckModifier,
      vip_luck_modifier: input.vipLuckModifier,
      moderator_luck_modifier: input.moderatorLuckModifier,
      regulars: input.regulars,
    })
    .eq("streamer_id", streamerId);
  if (error) throw error;
}

async function setEntriesOpen(streamerId: string, open: boolean) {
  const db = supabaseAdmin();
  const settings = await getEntrySettings(streamerId);
  const { error } = await db
    .from("settings")
    .update({ entries_open: open, entries_session: settings.entriesSession + 1 })
    .eq("streamer_id", streamerId);
  if (error) throw error;
}

export async function startEntries(streamerId: string) {
  await setEntriesOpen(streamerId, true);
}

export async function stopEntries(streamerId: string) {
  await setEntriesOpen(streamerId, false);
}

export async function tryAddEntry(
  streamerId: string,
  twitchId: string,
  twitchLogin: string,
  twitchDisplayName: string,
  messageText: string,
  badges: { set_id: string }[] = [],
  known?: EntrySettings,
): Promise<boolean> {
  const db = supabaseAdmin();
  const settings = known ?? (await getEntrySettings(streamerId));
  if (!settings.entriesOpen) return false;

  const text = messageText.trim().toLowerCase();
  const keyword = settings.triggerWord.trim().toLowerCase();
  const isMatch = settings.removeSpammers ? text === keyword : text.includes(keyword);
  if (!isMatch) return false;

  const { data: participant } = await db
    .from("participants")
    .select("id")
    .eq("twitch_id", twitchId)
    .maybeSingle();

  const isSubscriber = badges.some((b) => b.set_id === "subscriber" || b.set_id === "founder");
  const isVip = badges.some((b) => b.set_id === "vip");
  const isModerator = badges.some((b) => b.set_id === "moderator");

  const { error } = await db.from("entries").upsert(
    {
      streamer_id: streamerId,
      session: settings.entriesSession,
      participant_id: participant?.id ?? null,
      twitch_id: twitchId,
      twitch_login: twitchLogin,
      twitch_display_name: twitchDisplayName,
      is_subscriber: isSubscriber,
      is_vip: isVip,
      is_moderator: isModerator,
    },
    { onConflict: "streamer_id,session,twitch_id", ignoreDuplicates: true },
  );
  if (error) throw error;
  return true;
}

export async function getEntrants(streamerId: string, known?: EntrySettings): Promise<Entrant[]> {
  const db = supabaseAdmin();
  const settings = known ?? (await getEntrySettings(streamerId));
  const { data, error } = await db
    .from("entries")
    .select(
      "participant_id, twitch_id, twitch_login, twitch_display_name, participants(osu_username, osu_stats(global_rank, country_rank, country_code, pp, accuracy, playcount, top_play_pp, top_play_sr))",
    )
    .eq("streamer_id", streamerId)
    .eq("session", settings.entriesSession);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const participant = Array.isArray(row.participants) ? row.participants[0] : row.participants;
    const stats = participant?.osu_stats
      ? Array.isArray(participant.osu_stats)
        ? participant.osu_stats[0]
        : participant.osu_stats
      : null;
    return {
      participant_id: row.participant_id,
      twitch_id: row.twitch_id,
      twitch_login: row.twitch_login,
      twitch_display_name: row.twitch_display_name,
      osu_username: participant?.osu_username ?? null,
      global_rank: stats?.global_rank ?? null,
      country_rank: stats?.country_rank ?? null,
      country_code: stats?.country_code ?? null,
      pp: stats?.pp ?? null,
      accuracy: stats?.accuracy ?? null,
      playcount: stats?.playcount ?? null,
      top_play_pp: stats?.top_play_pp ?? null,
      top_play_sr: stats?.top_play_sr ?? null,
      linked: !!row.participant_id,
    };
  });
}

export async function getEntrantIds(streamerId: string, known?: EntrySettings): Promise<Set<string>> {
  const db = supabaseAdmin();
  const settings = known ?? (await getEntrySettings(streamerId));
  const { data, error } = await db
    .from("entries")
    .select("participant_id")
    .eq("streamer_id", streamerId)
    .eq("session", settings.entriesSession)
    .not("participant_id", "is", null);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.participant_id as string));
}

export type EntrantFlags = { isSubscriber: boolean; isVip: boolean; isModerator: boolean };

export async function getEntryFlagsFor(
  streamerId: string,
  session: number,
  twitchId: string,
): Promise<(EntrantFlags & { linked: boolean }) | null> {
  const { data, error } = await supabaseAdmin()
    .from("entries")
    .select("is_subscriber, is_vip, is_moderator, participant_id")
    .eq("streamer_id", streamerId)
    .eq("session", session)
    .eq("twitch_id", twitchId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    isSubscriber: data.is_subscriber,
    isVip: data.is_vip,
    isModerator: data.is_moderator,
    linked: !!data.participant_id,
  };
}

export async function getEntrantFlags(
  streamerId: string,
  known?: EntrySettings,
): Promise<Map<string, EntrantFlags>> {
  const db = supabaseAdmin();
  const settings = known ?? (await getEntrySettings(streamerId));
  const { data, error } = await db
    .from("entries")
    .select("twitch_id, is_subscriber, is_vip, is_moderator")
    .eq("streamer_id", streamerId)
    .eq("session", settings.entriesSession);
  if (error) throw error;
  return new Map(
    (data ?? []).map((row) => [
      row.twitch_id,
      { isSubscriber: row.is_subscriber, isVip: row.is_vip, isModerator: row.is_moderator },
    ]),
  );
}
