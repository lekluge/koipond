import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { BackgroundGlow, SourceLink, cardClass } from "@/components/ui";
import { formatPp, formatStars } from "@/lib/format";

const ERROR_MESSAGES: Record<string, string> = {
  twitch_state: "Twitch login expired or invalid. Please try again.",
  twitch_auth: "Twitch login failed. Please try again.",
  osu_state: "osu! login expired or invalid. Please try again.",
  osu_auth: "osu! login failed. Please try again.",
  need_twitch: "Please log in with Twitch first.",
};

type ParticipantWithStats = {
  osu_username: string;
  osu_stats: {
    global_rank: number | null;
    country_rank: number | null;
    pp: number | null;
    top_play_pp: number | null;
    top_play_sr: number | null;
  } | null;
};

export default async function LinkPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; linked?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();

  let participant: ParticipantWithStats | null = null;

  if (session) {
    const db = supabaseAdmin();
    const { data } = await db
      .from("participants")
      .select("osu_username, osu_stats(global_rank, country_rank, pp, top_play_pp, top_play_sr)")
      .eq("twitch_id", session.twitchId)
      .maybeSingle();
    participant = data as unknown as ParticipantWithStats | null;
  }

  return (
    <>
      <BackgroundGlow />
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Link your Twitch × osu! account</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Link your Twitch and osu! account to take part in the tournaments and giveaways of
            any channel using this app.
          </p>
        </div>

        {params.error && (
          <p className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {ERROR_MESSAGES[params.error] ?? "Something went wrong. Please try again."}
          </p>
        )}

        {params.linked && (
          <p className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
            Successfully linked!
          </p>
        )}

        <div className={cardClass + " flex w-full flex-col gap-3 text-left"}>
          <Step
            done={!!session}
            label={session ? `Logged in as ${session.twitchDisplayName}` : "Log in with Twitch"}
            href={!session ? "/api/auth/twitch/login?returnTo=/link" : undefined}
          />
          <Step
            done={!!participant}
            disabled={!session}
            label={
              participant ? `osu! account linked: ${participant.osu_username}` : "Link osu! account"
            }
            href={session && !participant ? "/api/auth/osu/login" : undefined}
          />
        </div>

        {session && (
          <form action="/api/auth/logout" method="post" className="w-full">
            <button type="submit" className="text-xs text-zinc-500 transition hover:text-zinc-300">
              Log out
            </button>
          </form>
        )}

        {participant?.osu_stats && (
          <div className={cardClass + " w-full text-left text-sm"}>
            <h2 className="mb-3 font-semibold text-zinc-200">Your osu! stats (cached)</h2>
            <dl className="grid grid-cols-2 gap-y-2">
              <dt className="text-zinc-500">Global Rank</dt>
              <dd className="text-right font-medium text-zinc-100">#{participant.osu_stats.global_rank ?? "—"}</dd>
              <dt className="text-zinc-500">Country Rank</dt>
              <dd className="text-right font-medium text-zinc-100">#{participant.osu_stats.country_rank ?? "—"}</dd>
              <dt className="text-zinc-500">PP</dt>
              <dd className="text-right font-medium text-zinc-100">{formatPp(participant.osu_stats.pp)}</dd>
              <dt className="text-zinc-500">Top Play</dt>
              <dd className="text-right font-medium text-zinc-100">
                {formatPp(participant.osu_stats.top_play_pp)}pp / {formatStars(participant.osu_stats.top_play_sr)}★
              </dd>
            </dl>
          </div>
        )}
      </main>
      <SourceLink floating />
    </>
  );
}

function Step({
  done,
  disabled,
  label,
  href,
}: {
  done: boolean;
  disabled?: boolean;
  label: string;
  href?: string;
}) {
  const content = (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-3 transition ${
        done
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          : disabled
            ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-zinc-600"
            : "border-white/10 bg-white/5 text-zinc-200 hover:border-purple-500/40 hover:bg-white/10"
      }`}
    >
      <span>{label}</span>
      {done && <span aria-hidden>✓</span>}
    </div>
  );

  if (!href || disabled) return content;
  return <a href={href}>{content}</a>;
}
