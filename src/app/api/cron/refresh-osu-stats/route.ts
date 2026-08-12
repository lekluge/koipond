import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { fetchOsuStats } from "@/lib/osu";
import { saveOsuStats } from "@/lib/participants";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DEFAULT_LIMIT = 250;
const DELAY_MS = 800;
const TIME_BUDGET_MS = 240_000;

type Row = {
  id: string;
  osu_id: number;
  osu_username: string;
  osu_stats: { updated_at: string }[] | { updated_at: string } | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "not authorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const requested = Number(req.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 1000) : DEFAULT_LIMIT;

  const { data, error } = await supabaseAdmin()
    .from("participants")
    .select("id, osu_id, osu_username, osu_stats(updated_at)");
  if (error) throw error;

  const queue = (data as Row[] | null ?? [])
    .map((row) => {
      const stats = Array.isArray(row.osu_stats) ? row.osu_stats[0] : row.osu_stats;
      return {
        id: row.id,
        osuId: row.osu_id,
        osuUsername: row.osu_username,
        updatedAt: stats?.updated_at ?? "",
      };
    })
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .slice(0, limit);

  let refreshed = 0;
  let failed = 0;
  let processed = 0;

  for (const participant of queue) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) break;
    if (processed > 0) await sleep(DELAY_MS);
    processed++;

    try {
      await saveOsuStats(participant.id, await fetchOsuStats(participant.osuId));
      refreshed++;
    } catch (err) {
      failed++;
      console.error(`osu! stats refresh failed for ${participant.osuUsername}`, err);
    }
  }

  const result = {
    refreshed,
    failed,
    remaining: (data?.length ?? 0) - processed,
    durationMs: Date.now() - startedAt,
  };
  console.log("osu! stats refresh:", JSON.stringify(result));
  return NextResponse.json(result);
}
