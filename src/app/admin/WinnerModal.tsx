"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { ChatWindowPopup, TwitchOsuBadges } from "@/components/WinnerReveal";
import { formatPp, formatStars } from "@/lib/format";
import { Confetti } from "./Confetti";
import { WinnerDetails } from "./WinnerDetails";

type Winner = {
  draw_id: string;
  streamer_id: string;
  drawn_at: string | null;
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
  id: string;
  streamer_id: string;
  created_at: string | null;
  winner_participant_id: string | null;
  winner_twitch_display_name: string | null;
  winner_osu_username: string | null;
};

export function WinnerModal({ streamerId }: { streamerId: string }) {
  const [winner, setWinner] = useState<Winner | null>(null);
  const [burstId, setBurstId] = useState(0);

  useEffect(() => {
    const supabase = supabaseBrowser();

    const channel = supabase
      .channel(`draws-admin-modal:${streamerId}`)
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
          if (draw.winner_participant_id) {
            const { data } = await supabase
              .from("osu_stats")
              .select("global_rank, pp, top_play_pp, top_play_sr")
              .eq("participant_id", draw.winner_participant_id)
              .maybeSingle();
            stats = data ?? null;
          }

          setWinner({
            draw_id: draw.id,
            streamer_id: draw.streamer_id,
            drawn_at: draw.created_at,
            twitch_display_name: draw.winner_twitch_display_name,
            osu_username: draw.winner_osu_username,
            osu_stats: stats,
          });
          setBurstId((id) => id + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamerId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setWinner(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!winner) return null;

  return (
    <>
      <Confetti key={burstId} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={() => setWinner(null)}
      >
        <div className="rounded-2xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 p-[2px] shadow-2xl shadow-purple-950/50">
          <div
            className="relative flex flex-col items-center gap-4 rounded-2xl bg-[#0b0b10] px-12 py-9 text-center text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setWinner(null)}
              aria-label="Close"
              className="absolute right-3 top-3 text-zinc-500 transition hover:text-zinc-200"
            >
              ✕
            </button>

            <ChatWindowPopup twitchName={winner.twitch_display_name} osuName={winner.osu_username} />

            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gradient">Winner</p>
            <TwitchOsuBadges twitchName={winner.twitch_display_name} osuName={winner.osu_username} />

            {winner.osu_stats && (
              <p className="text-sm text-zinc-400">
                #{winner.osu_stats.global_rank ?? "—"} · {formatPp(winner.osu_stats.pp)}pp · Top Play{" "}
                {formatPp(winner.osu_stats.top_play_pp)}pp/{formatStars(winner.osu_stats.top_play_sr)}★
              </p>
            )}

            <WinnerDetails
              streamerId={winner.streamer_id}
              drawId={winner.draw_id}
              drawnAt={winner.drawn_at}
            />
          </div>
        </div>
      </div>
    </>
  );
}
