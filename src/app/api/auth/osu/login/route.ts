import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { osuAuthorizeUrl } from "@/lib/osu";
import { getSession, setOAuthState } from "@/lib/session";
import { randomState } from "@/lib/oauthState";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(`${env.appUrl}/link?error=need_twitch`);
  }

  const state = randomState();
  await setOAuthState("koi_osu_state", { state });

  const redirectUri = `${env.appUrl}/api/auth/osu/callback`;
  return NextResponse.redirect(osuAuthorizeUrl(redirectUri, state));
}
