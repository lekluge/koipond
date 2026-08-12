"use server";

import { revalidatePath } from "next/cache";
import { requireStreamer } from "@/lib/streamers";
import { pickWinner, saveCriteria, type DrawCriteria } from "@/lib/draw";
import { createPreset, deletePreset } from "@/lib/presets";
import { startEntries, stopEntries, updateGiveawaySettings, type GiveawaySettingsInput } from "@/lib/entries";
import { sendTwitchChatMessage } from "@/lib/twitch";
import { broadcastToStreamer } from "@/lib/realtimeBroadcast";

function num(formData: FormData, key: string): number | undefined {
  const raw = formData.get(key);
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function luckModifier(formData: FormData, key: string): number {
  const n = num(formData, key);
  return n !== undefined && n >= 0 ? n : 1;
}

function criteriaFromForm(formData: FormData): DrawCriteria {
  const countryCode = formData.get("countryCode");
  return {
    globalRankMin: num(formData, "globalRankMin"),
    globalRankMax: num(formData, "globalRankMax"),
    countryRankMin: num(formData, "countryRankMin"),
    countryRankMax: num(formData, "countryRankMax"),
    ppMin: num(formData, "ppMin"),
    ppMax: num(formData, "ppMax"),
    topPlaySrMin: num(formData, "topPlaySrMin"),
    topPlayPpMin: num(formData, "topPlayPpMin"),
    accuracyMin: num(formData, "accuracyMin"),
    accuracyMax: num(formData, "accuracyMax"),
    playcountMin: num(formData, "playcountMin"),
    countryCode:
      typeof countryCode === "string" && countryCode.trim() !== ""
        ? countryCode.trim().toUpperCase()
        : undefined,
  };
}

function giveawaySettingsFromForm(formData: FormData): GiveawaySettingsInput {
  return {
    triggerWord: String(formData.get("triggerWord") ?? "!join"),
    removeSpammers: formData.has("removeSpammers"),
    uniqueWinners: formData.has("uniqueWinners"),
    chatAnnouncement: formData.has("chatAnnouncement"),
    ignoreOsuCriteria: formData.has("ignoreOsuCriteria"),
    viewerLuckModifier: luckModifier(formData, "viewerLuckModifier"),
    regularLuckModifier: luckModifier(formData, "regularLuckModifier"),
    subscriberLuckModifier: luckModifier(formData, "subscriberLuckModifier"),
    vipLuckModifier: luckModifier(formData, "vipLuckModifier"),
    moderatorLuckModifier: luckModifier(formData, "moderatorLuckModifier"),
    regulars: String(formData.get("regulars") ?? ""),
  };
}

export async function saveSettingsAction(formData: FormData) {
  const streamer = await requireStreamer();
  await Promise.all([
    updateGiveawaySettings(streamer.id, giveawaySettingsFromForm(formData)),
    saveCriteria(streamer.id, criteriaFromForm(formData)),
  ]);
  await broadcastToStreamer(streamer.id, "entries");
}

export async function pickWinnerAction(formData: FormData): Promise<{ winner: boolean }> {
  const streamer = await requireStreamer();
  const criteria = criteriaFromForm(formData);
  const giveawaySettings = giveawaySettingsFromForm(formData);

  const { winner } = await pickWinner(
    streamer.id,
    criteria,
    "dashboard",
    giveawaySettings.ignoreOsuCriteria,
  );

  if (winner && giveawaySettings.chatAnnouncement) {
    const osuSuffix = winner.osuUsername ? ` (osu! ${winner.osuUsername})` : "";
    try {
      await sendTwitchChatMessage(streamer.twitchId, `🎉 Winner: ${winner.twitchDisplayName}${osuSuffix}`);
    } catch (err) {
      console.error("Dashboard pick chat announcement failed", err);
    }
  }

  revalidatePath("/admin");

  return { winner: !!winner };
}

export async function savePresetAction(formData: FormData) {
  const streamer = await requireStreamer();
  const name = String(formData.get("presetName") ?? "").trim();
  if (!name) return;
  await createPreset(streamer.id, name, criteriaFromForm(formData));
  revalidatePath("/admin");
}

export async function deletePresetAction(formData: FormData) {
  const streamer = await requireStreamer();
  const id = String(formData.get("presetId") ?? "");
  if (!id) return;
  await deletePreset(streamer.id, id);
  revalidatePath("/admin");
}

export async function startEntriesAction() {
  const streamer = await requireStreamer();
  await startEntries(streamer.id);
  await broadcastToStreamer(streamer.id, "entries");
  revalidatePath("/admin");
}

export async function stopEntriesAction() {
  const streamer = await requireStreamer();
  await stopEntries(streamer.id);
  await broadcastToStreamer(streamer.id, "entries");
  revalidatePath("/admin");
}
