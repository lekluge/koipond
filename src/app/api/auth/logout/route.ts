import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { clearSession } from "@/lib/session";

export async function POST() {
  await clearSession();
  return NextResponse.redirect(`${env.appUrl}/link`, { status: 303 });
}
