import "server-only";

const CACHE_TTL_MS = 10 * 60 * 1000;

export type EmoteProvider = "7tv" | "bttv" | "ffz";

export type Emote = {
  url: string;
  provider: EmoteProvider;
  zeroWidth: boolean;
};

export type EmoteMap = Record<string, Emote>;

const cache = new Map<string, { emotes: EmoteMap; expiresAt: number }>();

async function json(url: string): Promise<unknown | null> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

type SevenTvEmote = {
  name: string;
  flags?: number;
  data?: { host?: { url?: string; files?: { name: string }[] } };
};

function collectSevenTv(emotes: SevenTvEmote[] | undefined, into: EmoteMap) {
  for (const emote of emotes ?? []) {
    const host = emote.data?.host;
    const file = host?.files?.find((f) => f.name === "2x.webp");
    if (!host?.url || !file) continue;
    into[emote.name] = {
      url: `https:${host.url}/${file.name}`,
      provider: "7tv",
      zeroWidth: ((emote.flags ?? 0) & 1) === 1,
    };
  }
}

type BttvEmote = { id: string; code: string };

function collectBttv(emotes: BttvEmote[] | undefined, into: EmoteMap) {
  for (const emote of emotes ?? []) {
    if (!emote.id || !emote.code) continue;
    into[emote.code] = {
      url: `https://cdn.betterttv.net/emote/${emote.id}/2x`,
      provider: "bttv",
      zeroWidth: false,
    };
  }
}

type FfzEmote = { name: string; urls?: Record<string, string>; modifier?: boolean };
type FfzSets = { sets?: Record<string, { emoticons?: FfzEmote[] }>; default_sets?: number[] };

function collectFfz(data: FfzSets | null, into: EmoteMap, onlyDefaultSets = false) {
  if (!data?.sets) return;
  const wanted = onlyDefaultSets ? (data.default_sets ?? []).map(String) : Object.keys(data.sets);

  for (const key of wanted) {
    for (const emote of data.sets[key]?.emoticons ?? []) {
      const url = emote.urls?.["2"] ?? emote.urls?.["1"] ?? emote.urls?.["4"];
      if (!emote.name || !url) continue;
      into[emote.name] = { url, provider: "ffz", zeroWidth: !!emote.modifier };
    }
  }
}

export async function getChatEmotes(broadcasterTwitchId: string): Promise<EmoteMap> {
  const cached = cache.get(broadcasterTwitchId);
  if (cached && cached.expiresAt > Date.now()) return cached.emotes;

  const [ffzGlobal, bttvGlobal, sevenTvGlobal, ffzRoom, bttvUser, sevenTvUser] = await Promise.all([
    json("https://api.frankerfacez.com/v1/set/global").catch(() => null),
    json("https://api.betterttv.net/3/cached/emotes/global").catch(() => null),
    json("https://7tv.io/v3/emote-sets/global").catch(() => null),
    json(`https://api.frankerfacez.com/v1/room/id/${broadcasterTwitchId}`).catch(() => null),
    json(`https://api.betterttv.net/3/cached/users/twitch/${broadcasterTwitchId}`).catch(() => null),
    json(`https://7tv.io/v3/users/twitch/${broadcasterTwitchId}`).catch(() => null),
  ]);

  const emotes: EmoteMap = {};

  collectFfz(ffzGlobal as FfzSets | null, emotes, true);
  collectBttv(bttvGlobal as BttvEmote[] | null ?? undefined, emotes);
  collectSevenTv((sevenTvGlobal as { emotes?: SevenTvEmote[] } | null)?.emotes, emotes);

  collectFfz(ffzRoom as FfzSets | null, emotes);
  const bttv = bttvUser as { channelEmotes?: BttvEmote[]; sharedEmotes?: BttvEmote[] } | null;
  collectBttv(bttv?.channelEmotes, emotes);
  collectBttv(bttv?.sharedEmotes, emotes);
  collectSevenTv((sevenTvUser as { emote_set?: { emotes?: SevenTvEmote[] } } | null)?.emote_set?.emotes, emotes);

  cache.set(broadcasterTwitchId, { emotes, expiresAt: Date.now() + CACHE_TTL_MS });
  return emotes;
}
