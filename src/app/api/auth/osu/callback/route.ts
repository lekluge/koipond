import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { exchangeOsuCode, getOsuMe } from "@/lib/osu";
import { consumeOAuthState, getSession } from "@/lib/session";
import { linkParticipant } from "@/lib/participants";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  const saved = await consumeOAuthState<{ state: string }>("koi_osu_state");
  const session = await getSession();

  if (!code || !state || !saved || saved.state !== state) {
    return NextResponse.redirect(`${env.appUrl}/link?error=osu_state`);
  }
  if (!session) {
    return NextResponse.redirect(`${env.appUrl}/link?error=need_twitch`);
  }

  try {
    const redirectUri = `${env.appUrl}/api/auth/osu/callback`;
    const token = await exchangeOsuCode(code, redirectUri);
    const osuUser = await getOsuMe(token.access_token);

    await linkParticipant(session, osuUser);

    return NextResponse.redirect(`${env.appUrl}/link?linked=1`);
  } catch (err) {
    console.error("osu! OAuth callback failed", err);
    return NextResponse.redirect(`${env.appUrl}/link?error=osu_auth`);
  }
}
