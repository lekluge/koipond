import "server-only";
import { env } from "@/lib/env";

const AUTHORIZE_URL = "https://osu.ppy.sh/oauth/authorize";
const TOKEN_URL = "https://osu.ppy.sh/oauth/token";
const API_URL = "https://osu.ppy.sh/api/v2";

export type OsuMe = {
  id: number;
  username: string;
};

export type OsuStats = {
  globalRank: number | null;
  countryRank: number | null;
  countryCode: string | null;
  pp: number | null;
  accuracy: number | null;
  playcount: number | null;
  topPlayPp: number | null;
  topPlaySr: number | null;
};

export function osuAuthorizeUrl(redirectUri: string, state: string) {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", env.osuClientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "identify public");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeOsuCode(code: string, redirectUri: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.osuClientId,
      client_secret: env.osuClientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    throw new Error(`osu! token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
}

export async function getOsuMe(accessToken: string): Promise<OsuMe> {
  const res = await fetch(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`osu! get me failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return { id: json.id, username: json.username };
}

let appTokenCache: { token: string; expiresAt: number } | null = null;

export async function getOsuAppToken(): Promise<string> {
  if (appTokenCache && appTokenCache.expiresAt > Date.now() + 30_000) {
    return appTokenCache.token;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.osuClientId,
      client_secret: env.osuClientSecret,
      grant_type: "client_credentials",
      scope: "public",
    }),
  });
  if (!res.ok) {
    throw new Error(`osu! app token failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  appTokenCache = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

function modAcronyms(mods: unknown): string[] {
  if (!Array.isArray(mods)) return [];
  return mods
    .map((m) => (typeof m === "string" ? m : (m as { acronym?: string })?.acronym))
    .filter((m): m is string => typeof m === "string");
}

const starRatingCache = new Map<string, { value: number; expiresAt: number }>();
const STAR_RATING_TTL_MS = 24 * 60 * 60 * 1000;

async function fetchStarRatingWithMods(
  beatmapId: number,
  mods: string[],
  headers: Record<string, string>,
): Promise<number | null> {
  const key = `${beatmapId}:${[...mods].sort().join(",")}`;
  const cached = starRatingCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const res = await fetch(`${API_URL}/beatmaps/${beatmapId}/attributes`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ mods, ruleset: "osu" }),
  });
  if (!res.ok) {
    console.error(`osu! beatmap attributes failed: ${res.status} ${await res.text()}`);
    return null;
  }
  const json = (await res.json()) as { attributes?: { star_rating?: number } };
  const starRating = json.attributes?.star_rating;
  if (typeof starRating !== "number") return null;

  starRatingCache.set(key, { value: starRating, expiresAt: Date.now() + STAR_RATING_TTL_MS });
  return starRating;
}

export async function fetchOsuStats(osuUserId: number): Promise<OsuStats> {
  const token = await getOsuAppToken();
  const headers = { Authorization: `Bearer ${token}` };

  const [profileRes, topPlayRes] = await Promise.all([
    fetch(`${API_URL}/users/${osuUserId}/osu`, { headers }),
    fetch(`${API_URL}/users/${osuUserId}/scores/best?mode=osu&limit=1`, { headers }),
  ]);

  if (!profileRes.ok) {
    throw new Error(`osu! get profile failed: ${profileRes.status} ${await profileRes.text()}`);
  }
  const profile = await profileRes.json();
  const stats = profile.statistics ?? {};

  let topPlayPp: number | null = null;
  let topPlaySr: number | null = null;
  if (topPlayRes.ok) {
    const scores = await topPlayRes.json();
    const best = scores[0];
    if (best) {
      topPlayPp = best.pp ?? null;
      topPlaySr = best.beatmap?.difficulty_rating ?? null;

      const mods = modAcronyms(best.mods);
      const beatmapId = best.beatmap?.id;
      if (beatmapId && mods.length > 0) {
        const withMods = await fetchStarRatingWithMods(beatmapId, mods, headers);
        if (withMods !== null) topPlaySr = withMods;
      }
    }
  }

  return {
    globalRank: stats.global_rank ?? null,
    countryRank: stats.country_rank ?? null,
    countryCode: profile.country?.code ?? null,
    pp: stats.pp ?? null,
    accuracy: stats.hit_accuracy ?? null,
    playcount: stats.play_count ?? null,
    topPlayPp,
    topPlaySr,
  };
}
