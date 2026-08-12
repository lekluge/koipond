import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { twitchAuthorizeUrl } from "@/lib/twitch";
import { safeReturnTo, setOAuthState } from "@/lib/session";
import { randomState } from "@/lib/oauthState";

export async function GET(req: NextRequest) {
  const returnTo = safeReturnTo(req.nextUrl.searchParams.get("returnTo"));
  const state = randomState();
  await setOAuthState("koi_twitch_state", { state, returnTo });

  const redirectUri = `${env.appUrl}/api/auth/twitch/callback`;
  return NextResponse.redirect(twitchAuthorizeUrl(redirectUri, state));
}
