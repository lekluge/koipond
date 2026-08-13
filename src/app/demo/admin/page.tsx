"use client";

import { useEffect, useMemo, useState } from "react";
import { matchesCriteria, type DemoCriteria, type DemoParticipant } from "@/lib/demoMatch";
import type { DemoCandidate, DemoChatMessage, DemoDraw, DemoEntrant, GiveawaySettings } from "@/lib/demoStore";
import { RANK_DIGIT_PRESETS } from "@/lib/rankPresets";
import { TwitchOsuBadges } from "@/components/WinnerReveal";
import { Confetti } from "@/app/admin/Confetti";
import { BackgroundGlow, SourceLink, buttonClass, cardClass, inputClass, labelClass } from "@/components/ui";

type EntryState = {
  triggerWord: string;
  entriesOpen: boolean;
  entriesSession: number;
  entrants: DemoEntrant[];
};

type SavedPreset = { id: string; name: string; criteria: DemoCriteria };

const emptyCriteria: DemoCriteria = {};
const PRESETS_STORAGE_KEY = "koi_demo_presets";
const AUTO_CLOSE_MS = 8_000;

export default function DemoAdminPage() {
  const [participants, setParticipants] = useState<DemoParticipant[]>([]);
  const [draws, setDraws] = useState<DemoDraw[]>([]);
  const [entryState, setEntryState] = useState<EntryState>({
    triggerWord: "!join",
    entriesOpen: false,
    entriesSession: 0,
    entrants: [],
  });
  const [settings, setSettings] = useState<GiveawaySettings>({
    triggerWord: "!join",
    removeSpammers: true,
    uniqueWinners: false,
    chatAnnouncement: true,
    viewerLuckModifier: 1,
    regularLuckModifier: 1,
    subscriberLuckModifier: 1,
    vipLuckModifier: 1,
    moderatorLuckModifier: 1,
    regulars: "",
  });
  const [pastWinnerTwitchIds, setPastWinnerTwitchIds] = useState<string[]>([]);
  const [chatLog, setChatLog] = useState<DemoChatMessage[]>([]);
  const [criteria, setCriteria] = useState<DemoCriteria>(emptyCriteria);
  const [ignoreOsuCriteria, setIgnoreOsuCriteria] = useState(false);
  const [picking, setPicking] = useState(false);
  const [noWinnerNotice, setNoWinnerNotice] = useState(false);

  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [presetName, setPresetName] = useState("");

  const [entrantMode, setEntrantMode] = useState<"participant" | "guest">("participant");
  const [chatParticipantId, setChatParticipantId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [chatText, setChatText] = useState("!join");
  const [chatBadges, setChatBadges] = useState({ isSubscriber: false, isVip: false, isModerator: false });
  const [entrantSearch, setEntrantSearch] = useState("");

  const [winner, setWinner] = useState<DemoCandidate | null>(null);
  const [burstId, setBurstId] = useState(0);

  async function refreshLive() {
    const res = await fetch("/api/demo/state");
    const data = await res.json();
    setParticipants(data.participants);
    setDraws(data.draws);
    setEntryState(data.entryState);
    setPastWinnerTwitchIds(data.pastWinnerTwitchIds);
    setChatLog(data.chatLog);
    setChatParticipantId((prev) => prev || data.participants[0]?.id || "");
  }

  async function refreshAll() {
    const res = await fetch("/api/demo/state");
    const data = await res.json();
    setParticipants(data.participants);
    setDraws(data.draws);
    setEntryState(data.entryState);
    setSettings(data.settings);
    setPastWinnerTwitchIds(data.pastWinnerTwitchIds);
    setChatLog(data.chatLog);
    setChatParticipantId((prev) => prev || data.participants[0]?.id || "");
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    refreshAll();
    try {
      const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (raw) setPresets(JSON.parse(raw));
    } catch {
    }
    const interval = setInterval(refreshLive, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!winner) return;
    const timer = setTimeout(() => setWinner(null), AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [winner]);

  function persistPresets(next: SavedPreset[]) {
    setPresets(next);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(next));
  }

  const remainingEntrants = useMemo(
    () => entryState.entrants.filter((e) => !pastWinnerTwitchIds.includes(e.twitchId)),
    [entryState.entrants, pastWinnerTwitchIds],
  );

  const eligible = useMemo(() => {
    if (ignoreOsuCriteria) return remainingEntrants;
    return remainingEntrants.filter(
      (e) => e.linked && matchesCriteria(participants.find((p) => p.id === e.twitchId) as DemoParticipant, criteria),
    );
  }, [remainingEntrants, criteria, ignoreOsuCriteria, participants]);

  const filteredEntrants = entryState.entrants.filter((e) =>
    e.twitchDisplayName.toLowerCase().includes(entrantSearch.toLowerCase()),
  );

  function setNum(key: keyof DemoCriteria, raw: string) {
    setCriteria((c) => ({ ...c, [key]: raw.trim() === "" ? undefined : Number(raw) }));
  }

  function applyRankPreset(min: number | undefined, max: number | undefined) {
    setCriteria((c) => ({ ...c, globalRankMin: min, globalRankMax: max }));
  }

  function saveCurrentAsPreset() {
    const name = presetName.trim();
    if (!name) return;
    const next = [...presets, { id: String(Date.now()), name, criteria }];
    persistPresets(next);
    setPresetName("");
  }

  function applyPreset(preset: SavedPreset) {
    setCriteria(preset.criteria);
  }

  function deletePreset(id: string) {
    persistPresets(presets.filter((p) => p.id !== id));
  }

  async function saveSettings() {
    const res = await fetch("/api/demo/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "saveSettings", settings }),
    });
    const data = await res.json();
    setSettings(data.settings);
    setEntryState(data.entryState);
  }

  async function pickWinner() {
    setPicking(true);
    setNoWinnerNotice(false);
    try {
      const res = await fetch("/api/demo/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria, ignoreOsuCriteria, settings }),
      });
      const result = (await res.json()) as { winner: DemoCandidate | null };
      if (result.winner) {
        setWinner(result.winner);
        setBurstId((id) => id + 1);
      } else {
        setNoWinnerNotice(true);
      }
      await refreshLive();
    } finally {
      setPicking(false);
    }
  }

  async function reset() {
    await fetch("/api/demo/reset", { method: "POST" });
    setCriteria(emptyCriteria);
    setIgnoreOsuCriteria(false);
    setNoWinnerNotice(false);
    setWinner(null);
    await refreshAll();
  }

  async function startEntries() {
    const res = await fetch("/api/demo/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    const data = await res.json();
    setEntryState(data.entryState);
    setNoWinnerNotice(false);
  }

  async function stopEntries() {
    const res = await fetch("/api/demo/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop" }),
    });
    const data = await res.json();
    setEntryState(data.entryState);
  }

  async function sendChatMessage() {
    const body =
      entrantMode === "participant"
        ? { participantId: chatParticipantId, text: chatText, ...chatBadges }
        : { guestName, text: chatText, ...chatBadges };
    if (entrantMode === "participant" && !chatParticipantId) return;
    if (entrantMode === "guest" && !guestName.trim()) return;

    await fetch("/api/demo/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await refreshLive();
  }

  return (
    <>
      <BackgroundGlow />
      {winner && (
        <>
          <Confetti key={burstId} />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setWinner(null)}
          >
            <div className="rounded-2xl bg-linear-to-br from-purple-600 via-fuchsia-600 to-pink-600 p-0.5 shadow-2xl shadow-purple-950/50">
              <div
                className="relative flex flex-col items-center gap-4 rounded-2xl bg-[#0b0b10] px-12 py-9 text-center text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setWinner(null)}
                  aria-label="Close"
                  className="absolute right-3 top-3 text-zinc-500 transition hover:text-zinc-200"
                >
                  ✕
                </button>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gradient">Winner</p>
                <TwitchOsuBadges twitchName={winner.twitchDisplayName} osuName={winner.osuUsername} />
              </div>
            </div>
          </div>
        </>
      )}

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gradient">Streamer Dashboard (Demo)</h1>
          <button onClick={reset} className="text-sm text-zinc-500 underline hover:text-zinc-300">
            Reset demo data
          </button>
        </div>
        <p className="-mt-4 w-fit rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
          DEMO — {participants.length} dummy participants, no login needed
        </p>

        {noWinnerNotice && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            No winner picked: nobody currently entered is eligible. With Unique Winners on,
            everyone who typed the keyword this round has already won once — open a fresh round
            or turn Unique Winners off to pick again.
          </div>
        )}

        <div className={cardClass}>
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="font-semibold text-zinc-100">Entries</h2>
            {entryState.entriesOpen ? (
              <button onClick={stopEntries} className={buttonClass("danger")}>
                Close entries
              </button>
            ) : (
              <button onClick={startEntries} className={buttonClass("success")}>
                Open entries
              </button>
            )}
          </div>
          {entryState.entriesOpen && (
            <p className="mb-3 text-xs text-zinc-500">
              Pick a winner before closing — closing ends the round and clears the entrant list.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-400">
              Status:{" "}
              <span className={entryState.entriesOpen ? "font-medium text-emerald-400" : "font-medium text-zinc-500"}>
                {entryState.entriesOpen ? "open" : "closed"}
              </span>{" "}
              · {entryState.entrants.length} entered
            </p>
            {entryState.entrants.length > 0 && (
              <input
                value={entrantSearch}
                onChange={(e) => setEntrantSearch(e.target.value)}
                placeholder="Search participants…"
                className={inputClass + " w-56"}
              />
            )}
          </div>

          <div className="mt-3">
            {filteredEntrants.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-500">
                {entryState.entrants.length === 0 ? "Viewers will appear here as they enter." : "No participants match your search."}
              </p>
            ) : (
              <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                {filteredEntrants.map((e) => {
                  const alreadyWon = pastWinnerTwitchIds.includes(e.twitchId);
                  return (
                    <span
                      key={e.twitchId}
                      className={`animate-entry-pop flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                        alreadyWon
                          ? "border-emerald-500/20 bg-emerald-500/5 text-zinc-500"
                          : "border-white/10 bg-white/5 text-zinc-200"
                      }`}
                    >
                      <span className="font-medium">{e.twitchDisplayName}</span>
                      <span className="text-zinc-500">{e.osuUsername ? `· osu! ${e.osuUsername}` : "· not linked"}</span>
                      {alreadyWon && <span className="text-emerald-400">· won</span>}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-start">
          <div className="flex flex-col gap-6">
            <div className={cardClass}>
              <h2 className="font-semibold text-zinc-100">Configure the settings for the giveaway.</h2>

              <div className="mt-4 flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-100">Keyword</span>
                <p className="text-xs text-zinc-500">The phrase that users must type to enter the giveaway.</p>
                <input
                  value={settings.triggerWord}
                  onChange={(e) => setSettings((s) => ({ ...s, triggerWord: e.target.value }))}
                  className={inputClass + " mt-1"}
                />
              </div>

              <div className="mt-4 divide-y divide-white/10 border-t border-white/10">
                <DemoToggle
                  label="Remove Spammers"
                  description="Require an exact keyword match — messages with extra text won't count."
                  checked={settings.removeSpammers}
                  onChange={(checked) => setSettings((s) => ({ ...s, removeSpammers: checked }))}
                />
                <DemoToggle
                  label="Unique Winners"
                  description="Past winners won't be picked again."
                  checked={settings.uniqueWinners}
                  onChange={(checked) => setSettings((s) => ({ ...s, uniqueWinners: checked }))}
                />
                <DemoToggle
                  label="Chat Announcement"
                  description="Announce the winner in chat when picked from the dashboard."
                  checked={settings.chatAnnouncement}
                  onChange={(checked) => setSettings((s) => ({ ...s, chatAnnouncement: checked }))}
                />
              </div>

              <details className="group mt-4 border-t border-white/10 pt-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-zinc-200 [&::-webkit-details-marker]:hidden">
                  <span>Advanced Settings</span>
                  <span className="text-zinc-500 transition group-open:rotate-180" aria-hidden>
                    ⌄
                  </span>
                </summary>

                <div className="mt-2 flex flex-col divide-y divide-white/10">
                  <LuckModifierField
                    label="Viewer Luck Modifier"
                    value={settings.viewerLuckModifier}
                    onChange={(v) => setSettings((s) => ({ ...s, viewerLuckModifier: v }))}
                  />
                  <LuckModifierField
                    label="Regular Luck Modifier"
                    value={settings.regularLuckModifier}
                    onChange={(v) => setSettings((s) => ({ ...s, regularLuckModifier: v }))}
                  />
                  <LuckModifierField
                    label="Subscriber Luck Modifier"
                    value={settings.subscriberLuckModifier}
                    onChange={(v) => setSettings((s) => ({ ...s, subscriberLuckModifier: v }))}
                  />
                  <LuckModifierField
                    label="VIP Luck Modifier"
                    value={settings.vipLuckModifier}
                    onChange={(v) => setSettings((s) => ({ ...s, vipLuckModifier: v }))}
                  />
                  <LuckModifierField
                    label="Moderator Luck Modifier"
                    value={settings.moderatorLuckModifier}
                    onChange={(v) => setSettings((s) => ({ ...s, moderatorLuckModifier: v }))}
                  />
                </div>

                <div className="mt-3 flex flex-col gap-1">
                  <span className="text-sm font-medium text-zinc-100">Regulars</span>
                  <p className="text-xs text-zinc-500">
                    One Twitch username per line. Used by the Regular Luck Modifier — Twitch has
                    no built-in &quot;regular&quot; status, so this list is managed manually.
                  </p>
                  <textarea
                    value={settings.regulars}
                    onChange={(e) => setSettings((s) => ({ ...s, regulars: e.target.value }))}
                    rows={3}
                    className={inputClass + " mt-1 resize-y"}
                  />
                </div>
              </details>

              <details open className="group mt-4 border-t border-white/10 pt-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-zinc-200 [&::-webkit-details-marker]:hidden">
                  <span>osu! Criteria</span>
                  <span className="text-zinc-500 transition group-open:rotate-180" aria-hidden>
                    ⌄
                  </span>
                </summary>

                <div className="mt-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <span className={labelClass}>Rank presets</span>
                    <div className="flex flex-wrap gap-2">
                      {RANK_DIGIT_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => applyRankPreset(preset.min, preset.max)}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 transition hover:border-purple-500/40 hover:bg-white/10"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <RangeField label="Global Rank" onMin={(v) => setNum("globalRankMin", v)} onMax={(v) => setNum("globalRankMax", v)} min={criteria.globalRankMin} max={criteria.globalRankMax} />
                  <RangeField label="Country Rank" onMin={(v) => setNum("countryRankMin", v)} onMax={(v) => setNum("countryRankMax", v)} min={criteria.countryRankMin} max={criteria.countryRankMax} />
                  <RangeField label="PP" onMin={(v) => setNum("ppMin", v)} onMax={(v) => setNum("ppMax", v)} min={criteria.ppMin} max={criteria.ppMax} />
                  <RangeField label="Accuracy (%)" onMin={(v) => setNum("accuracyMin", v)} onMax={(v) => setNum("accuracyMax", v)} min={criteria.accuracyMin} max={criteria.accuracyMax} />

                  <Field
                    label="Country Code (e.g. DE)"
                    value={criteria.countryCode ?? ""}
                    onChange={(v) => setCriteria((c) => ({ ...c, countryCode: v.trim() === "" ? undefined : v.trim().toUpperCase() }))}
                  />
                  <NumField label="Min. Playcount" value={criteria.playcountMin} onChange={(v) => setNum("playcountMin", v)} />
                  <NumField label="Min. Top-Play Star Rating" value={criteria.topPlaySrMin} onChange={(v) => setNum("topPlaySrMin", v)} step="0.1" />
                  <NumField label="Min. Top-Play PP" value={criteria.topPlayPpMin} onChange={(v) => setNum("topPlayPpMin", v)} />
                </div>
              </details>

              <label className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={ignoreOsuCriteria}
                  onChange={(e) => setIgnoreOsuCriteria(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5"
                />
                Ignore osu! criteria — pick from anyone who typed the keyword, even without a linked account
              </label>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-zinc-400">
                  <span className="font-semibold text-zinc-100">{eligible.length}</span> eligible
                </p>
                <div className="flex gap-2">
                  <button onClick={saveSettings} className={buttonClass("secondary")}>
                    Save Settings
                  </button>
                  <button
                    onClick={pickWinner}
                    disabled={eligible.length === 0 || picking}
                    className={buttonClass("primary")}
                  >
                    {picking ? "Picking…" : "Pick Winner"}
                  </button>
                </div>
              </div>
            </div>

            <div className={cardClass}>
              <span className={labelClass}>Custom presets</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <span
                    key={preset.id}
                    className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 py-1 pl-3 pr-1 text-xs text-zinc-300"
                  >
                    <button onClick={() => applyPreset(preset)} className="py-1 hover:text-purple-300 hover:underline">
                      {preset.name}
                    </button>
                    <button
                      onClick={() => deletePreset(preset.id)}
                      aria-label={`Delete ${preset.name}`}
                      className="rounded-full px-2 py-1 text-zinc-500 hover:bg-white/10 hover:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {presets.length === 0 && <span className="text-xs text-zinc-600">No presets saved yet.</span>}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name (e.g. 6-digit DE)"
                  className={inputClass + " flex-1"}
                />
                <button onClick={saveCurrentAsPreset} className={buttonClass("secondary")}>
                  Save current criteria
                </button>
              </div>
            </div>
          </div>

          <div className={cardClass + " flex h-160 flex-col overflow-hidden p-0 lg:sticky lg:top-6"}>
            <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-zinc-100">
              Stream Chat (simulated)
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto px-4 py-3 text-sm">
              {chatLog.length === 0 && <p className="text-zinc-600">No chat messages yet.</p>}
              {chatLog.map((m) => (
                <p key={m.id}>
                  <span className={m.isBot ? "font-semibold text-gradient" : "font-semibold text-purple-300"}>
                    {m.author}
                  </span>{" "}
                  <span className="text-zinc-200">{m.text}</span>
                </p>
              ))}
            </div>

            <div className="border-t border-white/10 p-3">
              <div className="mb-2 flex gap-2 text-xs">
                <button
                  onClick={() => setEntrantMode("participant")}
                  className={`rounded-full px-3 py-1 ${entrantMode === "participant" ? "bg-white/15 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  Linked viewer
                </button>
                <button
                  onClick={() => setEntrantMode("guest")}
                  className={`rounded-full px-3 py-1 ${entrantMode === "guest" ? "bg-white/15 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  Guest (not linked)
                </button>
              </div>

              {entrantMode === "participant" ? (
                <select
                  value={chatParticipantId}
                  onChange={(e) => setChatParticipantId(e.target.value)}
                  className={inputClass + " mb-2 w-full"}
                >
                  {participants.map((p) => (
                    <option key={p.id} value={p.id} className="bg-zinc-900">
                      {p.twitchDisplayName}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Guest Twitch name (e.g. RandomViewer42)"
                  className={inputClass + " mb-2 w-full"}
                />
              )}

              <div className="mb-2 flex flex-wrap gap-3 text-xs text-zinc-400">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={chatBadges.isSubscriber}
                    onChange={(e) => setChatBadges((b) => ({ ...b, isSubscriber: e.target.checked }))}
                  />
                  Subscriber
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={chatBadges.isVip}
                    onChange={(e) => setChatBadges((b) => ({ ...b, isVip: e.target.checked }))}
                  />
                  VIP
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={chatBadges.isModerator}
                    onChange={(e) => setChatBadges((b) => ({ ...b, isModerator: e.target.checked }))}
                  />
                  Moderator
                </label>
              </div>

              <div className="flex gap-2">
                <input
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  className={inputClass + " flex-1"}
                  onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                />
                <button onClick={sendChatMessage} className={buttonClass("primary")}>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        <section className={cardClass}>
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-zinc-100">
            <span aria-hidden>📜</span> History
          </h2>
          <ul className="flex flex-col gap-2">
            {draws.map((draw) => (
              <li key={draw.id} className="rounded-lg border border-white/10 bg-white/2 px-4 py-2 text-sm">
                <span className="font-medium text-zinc-200">
                  {draw.winnerTwitchDisplayName
                    ? `${draw.winnerTwitchDisplayName}${draw.winnerOsuUsername ? ` (${draw.winnerOsuUsername})` : ""}`
                    : "No winner (no one entered or matched the criteria)"}
                </span>{" "}
                <span className="text-zinc-500">
                  · {draw.triggeredBy} · {new Date(draw.createdAt).toLocaleTimeString("en-US")}
                </span>
              </li>
            ))}
            {draws.length === 0 && <li className="text-sm text-zinc-500">No draws yet.</li>}
          </ul>
        </section>

        <p className="text-sm text-zinc-500">
          Overlay preview (e.g. for OBS) in a separate tab:{" "}
          <a className="text-purple-300 underline hover:text-purple-200" href="/demo/overlay" target="_blank" rel="noreferrer">
            /demo/overlay
          </a>
        </p>
      </main>
      <SourceLink />
    </>
  );
}

function DemoToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="block text-sm font-medium text-zinc-100">{label}</span>
        <span className="block text-xs text-zinc-500">{description}</span>
      </span>
      <span className="relative inline-flex shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-white/10 transition peer-checked:bg-linear-to-r peer-checked:from-purple-600 peer-checked:to-pink-600" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className={labelClass}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </label>
  );
}

function NumField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className={labelClass}>{label}</span>
      <input
        type="number"
        step={step}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}

function RangeField({
  label,
  min,
  max,
  onMin,
  onMax,
}: {
  label: string;
  min: number | undefined;
  max: number | undefined;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className={labelClass}>{label}</span>
      <div className="flex gap-2">
        <input type="number" placeholder="min" value={min ?? ""} onChange={(e) => onMin(e.target.value)} className={inputClass + " w-1/2"} />
        <input type="number" placeholder="max" value={max ?? ""} onChange={(e) => onMax(e.target.value)} className={inputClass + " w-1/2"} />
      </div>
    </div>
  );
}

function LuckModifierField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-zinc-200">{label}</span>
      <input
        type="number"
        min={0}
        step="0.1"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) && n >= 0 ? n : 1);
        }}
        className={inputClass + " w-24"}
      />
    </div>
  );
}
