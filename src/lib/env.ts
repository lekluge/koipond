function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function idList(name: string): string[] {
  return (process.env[name] ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const env = {
  get appUrl() {
    return required("NEXT_PUBLIC_APP_URL");
  },
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
  get twitchClientId() {
    return required("TWITCH_CLIENT_ID");
  },
  get twitchClientSecret() {
    return required("TWITCH_CLIENT_SECRET");
  },
  get allowedStreamerTwitchIds(): string[] {
    return idList("ALLOWED_STREAMER_TWITCH_IDS");
  },
  get twitchEventSubSecret() {
    return required("TWITCH_EVENTSUB_SECRET");
  },
  get eventsubCallbackUrl() {
    const base = (process.env.EVENTSUB_PUBLIC_URL || env.appUrl).replace(/\/+$/, "");
    return `${base}/api/eventsub`;
  },
  get botUserId(): string | null {
    return process.env.TWITCH_BOT_USER_ID || null;
  },
  get osuClientId() {
    return required("OSU_CLIENT_ID");
  },
  get osuClientSecret() {
    return required("OSU_CLIENT_SECRET");
  },
};
