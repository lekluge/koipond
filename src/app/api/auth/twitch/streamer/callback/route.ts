import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { exchangeTwitchCode, getTwitchUser } from "@/lib/twitch";
import { consumeOAuthState, setSession } from "@/lib/session";
import { mayRegisterAsStreamer, registerStreamer } from "@/lib/streamers";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  const saved = await consumeOAuthState<{ state: string }>("koi_twitch_streamer_state");
  if (!code || !state || !saved || saved.state !== state) {
    return NextResponse.redirect(`${env.appUrl}/admin?error=twitch_state`);
  }

  try {
    const redirectUri = `${env.appUrl}/api/auth/twitch/streamer/callback`;
    const token = await exchangeTwitchCode(code, redirectUri);
    const user = await getTwitchUser(token.access_token);

    if (!mayRegisterAsStreamer(user.id)) {
      await setSession({ twitchId: user.id, twitchLogin: user.login, twitchDisplayName: user.display_name });
      return NextResponse.redirect(`${env.appUrl}/admin?error=not_allowed`);
    }

    const session = {
      twitchId: user.id,
      twitchLogin: user.login,
      twitchDisplayName: user.display_name,
    };
    await setSession(session);
    const scopes = (token.scope ?? []).map((s) => s.toLowerCase());
    await registerStreamer(session, scopes.includes("channel:bot"));

    return NextResponse.redirect(`${env.appUrl}/admin`);
  } catch (err) {
    console.error("Twitch streamer OAuth callback failed", err);
    return NextResponse.redirect(`${env.appUrl}/admin?error=twitch_auth`);
  }
}
