import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { exchangeTwitchCode, getTwitchUser } from "@/lib/twitch";
import { consumeOAuthState, safeReturnTo, setSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  const saved = await consumeOAuthState<{ state: string; returnTo: string }>("koi_twitch_state");
  if (!code || !state || !saved || saved.state !== state) {
    console.error("Twitch OAuth state check failed", {
      hasCode: !!code,
      hasState: !!state,
      hasSavedCookie: !!saved,
      stateMatches: saved ? saved.state === state : null,
      cookieHeaderPresent: req.headers.has("cookie"),
    });
    return NextResponse.redirect(`${env.appUrl}/link?error=twitch_state`);
  }

  try {
    const redirectUri = `${env.appUrl}/api/auth/twitch/callback`;
    const token = await exchangeTwitchCode(code, redirectUri);
    const user = await getTwitchUser(token.access_token);

    await setSession({
      twitchId: user.id,
      twitchLogin: user.login,
      twitchDisplayName: user.display_name,
    });

    return NextResponse.redirect(`${env.appUrl}${safeReturnTo(saved.returnTo)}`);
  } catch (err) {
    console.error("Twitch OAuth callback failed", err);
    return NextResponse.redirect(`${env.appUrl}/link?error=twitch_auth`);
  }
}
