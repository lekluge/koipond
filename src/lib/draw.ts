import "server-only";
import { supabaseAdmin } from "@/lib/supabaseServer";
import {
  getEntrantFlags,
  getEntrantIds,
  getEntrants,
  getEntrySettings,
  stopEntries,
  type EntrySettings,
} from "@/lib/entries";
import { ensureSettingsRow } from "@/lib/streamers";
import { startWinnerChatCapture } from "@/lib/winnerChat";
import { broadcastToStreamer } from "@/lib/realtimeBroadcast";

export type DrawCriteria = {
  globalRankMin?: number;
  globalRankMax?: number;
  countryRankMin?: number;
  countryRankMax?: number;
  countryCode?: string;
  ppMin?: number;
  ppMax?: number;
  topPlaySrMin?: number;
  topPlayPpMin?: number;
  accuracyMin?: number;
  accuracyMax?: number;
  playcountMin?: number;
};

export type Candidate = {
  id: string;
  twitchId: string;
  twitchLogin: string;
  twitchDisplayName: string;
  osuUsername: string | null;
  linked: boolean;
};

export async function findMatchingParticipants(criteria: DrawCriteria): Promise<Candidate[]> {
  const db = supabaseAdmin();
  let query = db
    .from("participants")
    .select("id, twitch_id, twitch_login, twitch_display_name, osu_username, osu_stats!inner(participant_id)");

  const filterNum = (col: string, op: "gte" | "lte", value: number | undefined) => {
    if (value === undefined) return;
    query = query.filter(`osu_stats.${col}`, op, value);
  };

  filterNum("global_rank", "gte", criteria.globalRankMin);
  filterNum("global_rank", "lte", criteria.globalRankMax);
  filterNum("country_rank", "gte", criteria.countryRankMin);
  filterNum("country_rank", "lte", criteria.countryRankMax);
  filterNum("pp", "gte", criteria.ppMin);
  filterNum("pp", "lte", criteria.ppMax);
  filterNum("top_play_sr", "gte", criteria.topPlaySrMin);
  filterNum("top_play_pp", "gte", criteria.topPlayPpMin);
  filterNum("accuracy", "gte", criteria.accuracyMin);
  filterNum("accuracy", "lte", criteria.accuracyMax);
  filterNum("playcount", "gte", criteria.playcountMin);
  if (criteria.countryCode) {
    query = query.filter("osu_stats.country_code", "eq", criteria.countryCode);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id as string,
    twitchId: p.twitch_id as string,
    twitchLogin: p.twitch_login as string,
    twitchDisplayName: p.twitch_display_name as string,
    osuUsername: p.osu_username as string,
    linked: true,
  }));
}

export async function findEligibleParticipants(
  streamerId: string,
  criteria: DrawCriteria,
  known?: EntrySettings,
): Promise<Candidate[]> {
  const [matching, entrantIds] = await Promise.all([
    findMatchingParticipants(criteria),
    getEntrantIds(streamerId, known),
  ]);
  return matching.filter((c) => entrantIds.has(c.id));
}

async function findAllEntrantCandidates(streamerId: string, known?: EntrySettings): Promise<Candidate[]> {
  const entrants = await getEntrants(streamerId, known);
  return entrants.map((e) => ({
    id: e.participant_id ?? `twitch:${e.twitch_id}`,
    twitchId: e.twitch_id,
    twitchLogin: e.twitch_login,
    twitchDisplayName: e.twitch_display_name,
    osuUsername: e.osu_username,
    linked: e.linked,
  }));
}

export async function getPastWinnerIds(streamerId: string, session: number): Promise<Set<string>> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("draws")
    .select("winner_twitch_id")
    .eq("streamer_id", streamerId)
    .eq("session", session)
    .not("winner_twitch_id", "is", null);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.winner_twitch_id as string));
}

function weightFor(
  candidate: Candidate,
  settings: EntrySettings,
  flags: Map<string, { isSubscriber: boolean; isVip: boolean; isModerator: boolean }>,
): number {
  const flag = flags.get(candidate.twitchId);
  const applicable: number[] = [];

  if (flag?.isModerator) applicable.push(settings.moderatorLuckModifier);
  if (flag?.isVip) applicable.push(settings.vipLuckModifier);
  if (flag?.isSubscriber) applicable.push(settings.subscriberLuckModifier);
  if (settings.regularsList.includes(candidate.twitchLogin.toLowerCase())) {
    applicable.push(settings.regularLuckModifier);
  }

  return applicable.length > 0 ? Math.max(...applicable) : settings.viewerLuckModifier;
}

function pickWeighted(candidates: Candidate[], weights: number[]): Candidate {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return candidates[Math.floor(Math.random() * candidates.length)];

  let roll = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

export async function pickWinner(
  streamerId: string,
  criteria: DrawCriteria,
  triggeredBy: "dashboard" | "chat",
  ignoreOsuCriteria = false,
) {
  const settings = await getEntrySettings(streamerId);
  const [candidatesRaw, flags] = await Promise.all([
    ignoreOsuCriteria
      ? findAllEntrantCandidates(streamerId, settings)
      : findEligibleParticipants(streamerId, criteria, settings),
    getEntrantFlags(streamerId, settings),
  ]);

  let candidates = candidatesRaw;
  if (settings.subscribersOnly) {
    candidates = candidates.filter((c) => flags.get(c.twitchId)?.isSubscriber);
  }
  if (settings.uniqueWinners) {
    const pastWinners = await getPastWinnerIds(streamerId, settings.entriesSession);
    candidates = candidates.filter((c) => !pastWinners.has(c.twitchId));
  }

  if (candidates.length === 0) {
    return { winner: null as Candidate | null, candidateCount: 0 };
  }

  const weights = candidates.map((c) => Math.max(weightFor(c, settings, flags), 0));
  const winner = pickWeighted(candidates, weights);

  const db = supabaseAdmin();
  const { data: draw, error } = await db
    .from("draws")
    .insert({
      streamer_id: streamerId,
      criteria,
      session: settings.entriesSession,
      winner_participant_id: winner.linked ? winner.id : null,
      winner_twitch_id: winner.twitchId,
      winner_twitch_display_name: winner.twitchDisplayName,
      winner_osu_username: winner.osuUsername,
      triggered_by: triggeredBy,
      hide_osu_stats: settings.hideOsuStats,
    })
    .select("id")
    .single();
  if (error) throw error;

  try {
    await startWinnerChatCapture(streamerId, draw.id, winner.twitchId);
  } catch (err) {
    console.error("Arming winner chat capture failed", err);
  }

  await broadcastToStreamer(streamerId, "entries");

  return { winner, candidateCount: candidates.length };
}

export async function recordNumberWinner(
  streamerId: string,
  session: number,
  guesser: { twitchId: string; twitchLogin: string; twitchDisplayName: string },
  hideOsuStats: boolean,
) {
  const db = supabaseAdmin();

  const { data: participant } = await db
    .from("participants")
    .select("id, osu_username")
    .eq("twitch_id", guesser.twitchId)
    .maybeSingle();

  const { data: draw, error } = await db
    .from("draws")
    .insert({
      streamer_id: streamerId,
      criteria: {},
      session,
      winner_participant_id: participant?.id ?? null,
      winner_twitch_id: guesser.twitchId,
      winner_twitch_display_name: guesser.twitchDisplayName,
      winner_osu_username: participant?.osu_username ?? null,
      triggered_by: "chat",
      hide_osu_stats: hideOsuStats,
    })
    .select("id")
    .single();
  if (error) throw error;

  await stopEntries(streamerId);

  try {
    await startWinnerChatCapture(streamerId, draw.id, guesser.twitchId);
  } catch (err) {
    console.error("Arming winner chat capture failed", err);
  }

  await broadcastToStreamer(streamerId, "entries");

  return { osuUsername: participant?.osu_username ?? null };
}

export async function saveCriteria(streamerId: string, criteria: DrawCriteria) {
  const db = supabaseAdmin();
  await ensureSettingsRow(streamerId);
  const { error } = await db
    .from("settings")
    .update({ criteria, updated_at: new Date().toISOString() })
    .eq("streamer_id", streamerId);
  if (error) throw error;
}

export async function loadCriteria(streamerId: string): Promise<DrawCriteria> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("settings")
    .select("criteria")
    .eq("streamer_id", streamerId)
    .maybeSingle();
  if (error) throw error;
  return (data?.criteria ?? {}) as DrawCriteria;
}

export async function getDraw(streamerId: string, drawId: string) {
  const { data, error } = await supabaseAdmin()
    .from("draws")
    .select("id, session, winner_twitch_id, winner_twitch_display_name, winner_osu_username, created_at")
    .eq("streamer_id", streamerId)
    .eq("id", drawId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDrawHistory(streamerId: string, limit = 20) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("draws")
    .select("id, criteria, triggered_by, created_at, winner_twitch_display_name, winner_osu_username")
    .eq("streamer_id", streamerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
