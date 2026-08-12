import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { twitchAuthorizeUrl } from "@/lib/twitch";
import { setOAuthState } from "@/lib/session";
import { randomState } from "@/lib/oauthState";

export async function GET() {
  const state = randomState();
  await setOAuthState("koi_twitch_streamer_state", { state });

  const redirectUri = `${env.appUrl}/api/auth/twitch/streamer/callback`;
  return NextResponse.redirect(twitchAuthorizeUrl(redirectUri, state, ["channel:bot"]));
}
