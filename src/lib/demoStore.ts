import "server-only";
import { matchesCriteria, type DemoCriteria, type DemoParticipant } from "@/lib/demoMatch";

export type { DemoCriteria, DemoParticipant };

export type DemoCandidate = {
  twitchId: string;
  twitchDisplayName: string;
  osuUsername: string | null;
  linked: boolean;
};

export type DemoEntrant = DemoCandidate & {
  isSubscriber: boolean;
  isVip: boolean;
  isModerator: boolean;
};

export type DemoDraw = {
  id: string;
  criteria: DemoCriteria;
  triggeredBy: "dashboard" | "chat";
  createdAt: string;
  session: number;
  winnerTwitchId: string | null;
  winnerTwitchDisplayName: string | null;
  winnerOsuUsername: string | null;
  hideOsuStats: boolean;
};

export type DemoChatMessage = {
  id: string;
  author: string;
  text: string;
  isBot: boolean;
  createdAt: string;
};

export type DemoDrawMode = "keyword" | "number";

export type GiveawaySettings = {
  triggerWord: string;
  drawMode: DemoDrawMode;
  numberMin: number;
  numberMax: number;
  removeSpammers: boolean;
  uniqueWinners: boolean;
  chatAnnouncement: boolean;
  subscribersOnly: boolean;
  hideOsuStats: boolean;
  viewerLuckModifier: number;
  regularLuckModifier: number;
  subscriberLuckModifier: number;
  vipLuckModifier: number;
  moderatorLuckModifier: number;
  regulars: string;
};

const INITIAL_PARTICIPANTS: DemoParticipant[] = [
  { id: "1", twitchDisplayName: "MoonlightMika", osuUsername: "Mika", globalRank: 1830, countryRank: 42, countryCode: "DE", pp: 8920, accuracy: 98.9, playcount: 41000, topPlayPp: 780, topPlaySr: 7.8 },
  { id: "2", twitchDisplayName: "xX_ShadowSlayer_Xx", osuUsername: "ShadowSlayer", globalRank: 54210, countryRank: 1120, countryCode: "DE", pp: 5230, accuracy: 97.1, playcount: 22000, topPlayPp: 410, topPlaySr: 6.2 },
  { id: "3", twitchDisplayName: "pixel_purr", osuUsername: "pixelpurr", globalRank: 143870, countryRank: 3980, countryCode: "AT", pp: 3120, accuracy: 96.4, playcount: 15800, topPlayPp: 260, topPlaySr: 5.4 },
  { id: "4", twitchDisplayName: "KoiFanatic", osuUsername: "KoiFan", globalRank: 892340, countryRank: 21400, countryCode: "DE", pp: 980, accuracy: 94.8, playcount: 4200, topPlayPp: 95, topPlaySr: 4.1 },
  { id: "5", twitchDisplayName: "rhythmrogue", osuUsername: "RhythmRogue", globalRank: 21980, countryRank: 610, countryCode: "CH", pp: 6410, accuracy: 97.8, playcount: 31200, topPlayPp: 540, topPlaySr: 6.9 },
  { id: "6", twitchDisplayName: "nova_beam", osuUsername: "NovaBeam", globalRank: 5670, countryRank: 180, countryCode: "DE", pp: 7930, accuracy: 98.3, playcount: 38700, topPlayPp: 690, topPlaySr: 7.3 },
  { id: "7", twitchDisplayName: "clickclack99", osuUsername: "clickclack", globalRank: 412300, countryRank: 9870, countryCode: "PL", pp: 1740, accuracy: 95.6, playcount: 9100, topPlayPp: 150, topPlaySr: 4.8 },
  { id: "8", twitchDisplayName: "tama_chan", osuUsername: "tamachan", globalRank: 68900, countryRank: 1540, countryCode: "AT", pp: 4870, accuracy: 96.9, playcount: 19600, topPlayPp: 380, topPlaySr: 5.9 },
  { id: "9", twitchDisplayName: "GlassCannonGG", osuUsername: "GlassCannon", globalRank: 2410, countryRank: 65, countryCode: "DE", pp: 8410, accuracy: 98.6, playcount: 44300, topPlayPp: 740, topPlaySr: 7.6 },
  { id: "10", twitchDisplayName: "sleepysquid", osuUsername: "sleepysquid", globalRank: 231900, countryRank: 5980, countryCode: "CH", pp: 2340, accuracy: 95.9, playcount: 11700, topPlayPp: 190, topPlaySr: 5.0 },
  { id: "11", twitchDisplayName: "echo_static", osuUsername: "echostatic", globalRank: 91200, countryRank: 2130, countryCode: "DE", pp: 4210, accuracy: 96.7, playcount: 17400, topPlayPp: 340, topPlaySr: 5.7 },
  { id: "12", twitchDisplayName: "velvet_vex", osuUsername: "velvetvex", globalRank: 12870, countryRank: 340, countryCode: "DE", pp: 7020, accuracy: 97.9, playcount: 33900, topPlayPp: 600, topPlaySr: 7.0 },
  { id: "13", twitchDisplayName: "tiggy_dev", osuUsername: "t1ggy_dev", globalRank: 48246, countryRank: 2340, countryCode: "DE", pp: 6912, accuracy: 99.9, playcount: 33900, topPlayPp: 600, topPlaySr: 7.0 },
];

const DEFAULT_SETTINGS: GiveawaySettings = {
  triggerWord: "!join",
  drawMode: "keyword",
  numberMin: 1,
  numberMax: 100,
  removeSpammers: true,
  uniqueWinners: false,
  chatAnnouncement: true,
  subscribersOnly: false,
  hideOsuStats: false,
  viewerLuckModifier: 1,
  regularLuckModifier: 1,
  subscriberLuckModifier: 1,
  vipLuckModifier: 1,
  moderatorLuckModifier: 1,
  regulars: "",
};

type Store = {
  participants: DemoParticipant[];
  draws: DemoDraw[];
  criteria: DemoCriteria;
  nextId: number;
  settings: GiveawaySettings;
  entriesOpen: boolean;
  entriesSession: number;
  entrants: DemoEntrant[];
  chatLog: DemoChatMessage[];
  numberTarget: number | null;
  streamStartedAt: string;
};

const g = globalThis as unknown as { __demoStore?: Store };

function freshStore(): Store {
  return {
    participants: [...INITIAL_PARTICIPANTS],
    draws: [],
    criteria: {},
    nextId: INITIAL_PARTICIPANTS.length + 1,
    settings: { ...DEFAULT_SETTINGS },
    entriesOpen: false,
    entriesSession: 0,
    entrants: [],
    chatLog: [],
    numberTarget: null,
    streamStartedAt: new Date(Date.now() - 97 * 60_000).toISOString(),
  };
}

function store(): Store {
  if (!g.__demoStore) g.__demoStore = freshStore();
  return g.__demoStore;
}

function parseRegulars(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export type DemoChannelStatus = {
  displayName: string;
  profileImageUrl: string | null;
  stream: { startedAt: string; title: string; gameName: string | null; viewerCount: number } | null;
};
export function getChannelStatus(): DemoChannelStatus {
  const s = store();
  if (!s.streamStartedAt) s.streamStartedAt = new Date(Date.now() - 97 * 60_000).toISOString();

  const minutes = Math.floor((Date.now() - new Date(s.streamStartedAt).getTime()) / 60000);

  return {
    displayName: "KoiFishu (Demo)",
    profileImageUrl: null,
    stream: {
      startedAt: s.streamStartedAt,
      title: "RANK GUESSING UNTIL EXACTish + PROFILE REVIEW IF WRONG, SUBATHON DAY 3 | !subathon !guessing",
      gameName: "osu!",
      viewerCount: 420 + (minutes % 7) * 13 + Math.floor(Math.random() * 20),
    },
  };
}

export function getParticipants(): DemoParticipant[] {
  return store().participants;
}

export function addParticipant(twitchDisplayName: string, osuUsername: string): DemoParticipant {
  const s = store();
  const globalRank = Math.floor(1000 + Math.random() * 500000);
  const countryRank = Math.max(1, Math.floor(globalRank / (15 + Math.random() * 10)));
  const pp = Math.max(200, Math.round(9500 - globalRank * 0.015 + (Math.random() - 0.5) * 400));
  const participant: DemoParticipant = {
    id: String(s.nextId++),
    twitchDisplayName,
    osuUsername,
    globalRank,
    countryRank,
    countryCode: "DE",
    pp,
    accuracy: Math.round((94 + Math.random() * 5) * 10) / 10,
    playcount: Math.floor(3000 + Math.random() * 40000),
    topPlayPp: Math.round(pp * 0.09 + Math.random() * 50),
    topPlaySr: Math.round((4 + Math.random() * 4) * 10) / 10,
  };
  s.participants.push(participant);
  return participant;
}

export function findMatchingParticipants(criteria: DemoCriteria): DemoParticipant[] {
  return store().participants.filter((p) => matchesCriteria(p, criteria));
}

export function saveCriteria(criteria: DemoCriteria) {
  store().criteria = criteria;
}

export function loadCriteria(): DemoCriteria {
  return store().criteria;
}

export function getSettings(): GiveawaySettings {
  return store().settings;
}

export function updateSettings(input: Partial<GiveawaySettings>) {
  const s = store();
  const previous = s.settings;

  const min = Math.min(input.numberMin ?? previous.numberMin, input.numberMax ?? previous.numberMax);
  const max = Math.max(input.numberMin ?? previous.numberMin, input.numberMax ?? previous.numberMax);

  s.settings = {
    ...previous,
    ...input,
    triggerWord: (input.triggerWord ?? previous.triggerWord).trim() || "!join",
    numberMin: min,
    numberMax: max,
  };

  const modeChanged = previous.drawMode !== s.settings.drawMode;
  const rangeChanged = previous.numberMin !== min || previous.numberMax !== max;

  if (modeChanged && s.entriesOpen) stopEntries();
  else if (rangeChanged && s.entriesOpen && s.settings.drawMode === "number") drawSecretNumber();
  else if (rangeChanged) s.numberTarget = null;
}

function drawSecretNumber() {
  const s = store();
  const min = Math.min(s.settings.numberMin, s.settings.numberMax);
  const max = Math.max(s.settings.numberMin, s.settings.numberMax);
  s.numberTarget = min + Math.floor(Math.random() * (max - min + 1));
}

export function parseGuess(text: string, min: number, max: number): number | null {
  const trimmed = text.trim();
  if (!/^-?\d{1,9}$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value >= Math.min(min, max) && value <= Math.max(min, max) ? value : null;
}

export type EntryState = {
  triggerWord: string;
  entriesOpen: boolean;
  entriesSession: number;
  entrants: DemoEntrant[];
};

export function getEntryState(): EntryState {
  const s = store();
  return {
    triggerWord: s.settings.triggerWord,
    entriesOpen: s.entriesOpen,
    entriesSession: s.entriesSession,
    entrants: s.entrants,
  };
}

export function startEntries() {
  const s = store();
  s.entriesOpen = true;
  s.entriesSession += 1;
  s.entrants = [];
  if (s.settings.drawMode === "number") drawSecretNumber();
  else s.numberTarget = null;
}

export function stopEntries() {
  const s = store();
  s.entriesOpen = false;
  s.entriesSession += 1;
  s.entrants = [];
  s.numberTarget = null;
}

export function simulateChatMessage(input: {
  participantId?: string;
  guestName?: string;
  text: string;
  isSubscriber?: boolean;
  isVip?: boolean;
  isModerator?: boolean;
}): { joined: boolean; winner: DemoCandidate | null } {
  const s = store();
  const miss = { joined: false, winner: null };
  if (!s.entriesOpen) return miss;

  const numberMode = s.settings.drawMode === "number";
  const guess = numberMode ? parseGuess(input.text, s.settings.numberMin, s.settings.numberMax) : null;

  if (numberMode) {
    if (guess === null) return miss;
  } else {
    const text = input.text.trim().toLowerCase();
    const keyword = s.settings.triggerWord.trim().toLowerCase();
    const isMatch = s.settings.removeSpammers ? text === keyword : text.includes(keyword);
    if (!isMatch) return miss;
  }

  let candidate: DemoCandidate | null = null;
  if (input.participantId) {
    const participant = s.participants.find((p) => p.id === input.participantId);
    if (!participant) return miss;
    candidate = {
      twitchId: participant.id,
      twitchDisplayName: participant.twitchDisplayName,
      osuUsername: participant.osuUsername,
      linked: true,
    };
  } else {
    const name = (input.guestName ?? "").trim();
    if (!name) return miss;
    candidate = { twitchId: `guest:${name.toLowerCase()}`, twitchDisplayName: name, osuUsername: null, linked: false };
  }

  const existing = s.entrants.find((e) => e.twitchId === candidate!.twitchId);
  if (!existing) {
    s.entrants.push({
      ...candidate,
      isSubscriber: !!input.isSubscriber,
      isVip: !!input.isVip,
      isModerator: !!input.isModerator,
    });
  }

  s.chatLog.push({
    id: String(Date.now()) + Math.random(),
    author: candidate.twitchDisplayName,
    text: input.text,
    isBot: false,
    createdAt: new Date().toISOString(),
  });
  s.chatLog = s.chatLog.slice(-50);

  const wins =
    numberMode &&
    guess !== null &&
    guess === s.numberTarget &&
    (!s.settings.subscribersOnly || !!input.isSubscriber);

  if (wins) {
    s.numberTarget = null;
    recordDraw(candidate, {}, "chat", `🎉 ${candidate.twitchDisplayName} guessed ${guess} and wins!`);
    stopEntries();
    return { joined: true, winner: candidate };
  }

  return { joined: true, winner: null };
}

function recordDraw(
  winner: DemoCandidate,
  criteria: DemoCriteria,
  triggeredBy: "dashboard" | "chat",
  announcement?: string,
) {
  const s = store();

  s.draws.unshift({
    id: String(Date.now()) + Math.random(),
    criteria,
    triggeredBy,
    createdAt: new Date().toISOString(),
    session: s.entriesSession,
    winnerTwitchId: winner.twitchId,
    winnerTwitchDisplayName: winner.twitchDisplayName,
    winnerOsuUsername: winner.osuUsername,
    hideOsuStats: s.settings.hideOsuStats,
  });
  s.draws = s.draws.slice(0, 20);

  if (s.settings.chatAnnouncement) {
    const osuSuffix = winner.osuUsername ? ` (osu! ${winner.osuUsername})` : "";
    s.chatLog.push({
      id: String(Date.now()) + Math.random(),
      author: "t1ggy_bot",
      text: announcement ? `${announcement}${osuSuffix}` : `🎉 Winner: ${winner.twitchDisplayName}${osuSuffix}`,
      isBot: true,
      createdAt: new Date().toISOString(),
    });
    s.chatLog = s.chatLog.slice(-50);
  }
}

export function findEligibleCandidates(criteria: DemoCriteria, ignoreOsuCriteria: boolean): DemoCandidate[] {
  const s = store();
  if (ignoreOsuCriteria) {
    return s.entrants.map((e) => ({ twitchId: e.twitchId, twitchDisplayName: e.twitchDisplayName, osuUsername: e.osuUsername, linked: e.linked }));
  }

  const matchingIds = new Set(findMatchingParticipants(criteria).map((p) => p.id));
  return s.entrants
    .filter((e) => e.linked && matchingIds.has(e.twitchId))
    .map((e) => ({ twitchId: e.twitchId, twitchDisplayName: e.twitchDisplayName, osuUsername: e.osuUsername, linked: e.linked }));
}

export function getPastWinnerTwitchIds(session: number): Set<string> {
  return new Set(
    store()
      .draws.filter((d) => d.session === session && d.winnerTwitchId)
      .map((d) => d.winnerTwitchId as string),
  );
}

function weightFor(candidate: DemoCandidate, settings: GiveawaySettings, entrant: DemoEntrant | undefined): number {
  if (entrant?.isModerator) return settings.moderatorLuckModifier;
  if (entrant?.isVip) return settings.vipLuckModifier;
  if (entrant?.isSubscriber) return settings.subscriberLuckModifier;
  if (parseRegulars(settings.regulars).includes(candidate.twitchDisplayName.toLowerCase())) {
    return settings.regularLuckModifier;
  }
  return settings.viewerLuckModifier;
}

function pickWeighted(candidates: DemoCandidate[], weights: number[]): DemoCandidate {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return candidates[Math.floor(Math.random() * candidates.length)];
  let roll = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

export function pickWinner(
  criteria: DemoCriteria,
  triggeredBy: "dashboard" | "chat",
  ignoreOsuCriteria: boolean,
): { winner: DemoCandidate | null; candidateCount: number } {
  const s = store();
  if (s.settings.drawMode === "number") return { winner: null, candidateCount: 0 };

  const candidatesRaw = findEligibleCandidates(criteria, ignoreOsuCriteria);
  const subscriberIds = new Set(s.entrants.filter((e) => e.isSubscriber).map((e) => e.twitchId));

  let candidates = candidatesRaw;
  if (s.settings.subscribersOnly) {
    candidates = candidates.filter((c) => subscriberIds.has(c.twitchId));
  }
  if (s.settings.uniqueWinners) {
    const pastWinners = getPastWinnerTwitchIds(s.entriesSession);
    candidates = candidates.filter((c) => !pastWinners.has(c.twitchId));
  }

  if (candidates.length === 0) {
    return { winner: null, candidateCount: 0 };
  }

  const entrantsById = new Map(s.entrants.map((e) => [e.twitchId, e]));
  const weights = candidates.map((c) => Math.max(weightFor(c, s.settings, entrantsById.get(c.twitchId)), 0));
  const winner = pickWeighted(candidates, weights);

  recordDraw(winner, criteria, triggeredBy);

  return { winner, candidateCount: candidates.length };
}

export function getDraws(): DemoDraw[] {
  return store().draws;
}

export function getLatestDraw(): DemoDraw | null {
  return store().draws[0] ?? null;
}

export function getChatLog(): DemoChatMessage[] {
  return store().chatLog;
}

export function resetDemo() {
  g.__demoStore = freshStore();
}
