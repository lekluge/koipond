"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { TwitchOsuBadges } from "@/components/WinnerReveal";
import { formatPp, formatStars } from "@/lib/format";

type Winner = {
  twitch_display_name: string;
  osu_username: string | null;
  osu_stats: {
    global_rank: number | null;
    pp: number | null;
    top_play_pp: number | null;
    top_play_sr: number | null;
  } | null;
};

type DrawRow = {
  winner_participant_id: string | null;
  winner_twitch_display_name: string | null;
  winner_osu_username: string | null;
  hide_osu_stats: boolean;
};

const AUTO_HIDE_MS = 12_000;

export function OverlayClient({ streamerId }: { streamerId: string }) {
  const [winner, setWinner] = useState<Winner | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const previous = document.body.style.background;
    document.body.style.background = "transparent";
    return () => {
      document.body.style.background = previous;
    };
  }, []);

  useEffect(() => {
    const supabase = supabaseBrowser();
    let hideTimer: ReturnType<typeof setTimeout>;

    const channel = supabase
      .channel(`draws-overlay-${streamerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "draws",
          filter: `streamer_id=eq.${streamerId}`,
        },
        async (payload) => {
          const draw = payload.new as DrawRow;
          if (!draw.winner_twitch_display_name) return;
          let stats: Winner["osu_stats"] = null;
          if (draw.winner_participant_id && !draw.hide_osu_stats) {
            const { data } = await supabase
              .from("osu_stats")
              .select("global_rank, pp, top_play_pp, top_play_sr")
              .eq("participant_id", draw.winner_participant_id)
              .maybeSingle();
            stats = data ?? null;
          }

          setWinner({
            twitch_display_name: draw.winner_twitch_display_name,
            osu_username: draw.winner_osu_username,
            osu_stats: stats,
          });
          setVisible(true);
          clearTimeout(hideTimer);
          hideTimer = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
        },
      )
      .subscribe();

    return () => {
      clearTimeout(hideTimer);
      supabase.removeChannel(channel);
    };
  }, [streamerId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent">
      {winner && (
        <div
          className={`flex flex-col items-center gap-4 transition-all duration-500 ease-out ${
            visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 scale-95 opacity-0"
          }`}
        >
          {/* <ChatWindowPopup twitchName={winner.twitch_display_name} osuName={winner.osu_username} /> */}

          <div className="rounded-2xl bg-linear-to-br from-purple-600 via-fuchsia-600 to-pink-600 p-0.5 shadow-2xl shadow-purple-950/50">
            <div className="rounded-2xl bg-[#0b0b10] px-12 py-9 text-center text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gradient">Winner</p>
              <div className="mt-3">
                <TwitchOsuBadges twitchName={winner.twitch_display_name} osuName={winner.osu_username} />
              </div>
              {winner.osu_stats && (
                <p className="mt-3 text-sm text-zinc-400">
                  #{winner.osu_stats.global_rank ?? "—"} · {formatPp(winner.osu_stats.pp)}pp · Top Play{" "}
                  {formatPp(winner.osu_stats.top_play_pp)}pp/{formatStars(winner.osu_stats.top_play_sr)}★
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
