"use client";

import { useEffect, useRef, useState } from "react";
import type { DemoParticipant } from "@/lib/demoMatch";
import type { DemoDraw } from "@/lib/demoStore";
import { TwitchOsuBadges } from "@/components/WinnerReveal";
import { formatPp, formatStars } from "@/lib/format";

const POLL_MS = 1500;
const AUTO_HIDE_MS = 12_000;

type Winner = { twitchDisplayName: string; osuUsername: string | null; stats: DemoParticipant | null };

export default function DemoOverlayPage() {
  const [winner, setWinner] = useState<Winner | null>(null);
  const [visible, setVisible] = useState(false);
  const lastDrawId = useRef<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const participantsRef = useRef<DemoParticipant[]>([]);

  useEffect(() => {
    const previous = document.body.style.background;
    document.body.style.background = "transparent";
    return () => {
      document.body.style.background = previous;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/demo/state", { cache: "no-store" });
        const data = await res.json();
        participantsRef.current = data.participants;
        const draw = data.latestDraw as DemoDraw | null;
        if (!cancelled && draw && draw.id !== lastDrawId.current) {
          lastDrawId.current = draw.id;
          if (draw.winnerTwitchDisplayName) {
            const stats = draw.hideOsuStats
              ? null
              : participantsRef.current.find((p) => p.twitchDisplayName === draw.winnerTwitchDisplayName) ?? null;
            setWinner({ twitchDisplayName: draw.winnerTwitchDisplayName, osuUsername: draw.winnerOsuUsername, stats });
            setVisible(true);
            clearTimeout(hideTimer.current);
            hideTimer.current = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
          }
        }
      } catch {
      }
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent">
      {winner && (
        <div
          className={`flex flex-col items-center gap-4 transition-all duration-500 ease-out ${
            visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 scale-95 opacity-0"
          }`}
        >

          <div className="rounded-2xl bg-linear-to-br from-purple-600 via-fuchsia-600 to-pink-600 p-0.5 shadow-2xl shadow-purple-950/50">
            <div className="rounded-2xl bg-[#0b0b10] px-12 py-9 text-center text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gradient">Winner</p>
              <div className="mt-3">
                <TwitchOsuBadges twitchName={winner.twitchDisplayName} osuName={winner.osuUsername} />
              </div>
              {winner.stats && (
                <p className="mt-3 text-sm text-zinc-400">
                  #{winner.stats.globalRank} · {formatPp(winner.stats.pp)}pp · Top Play{" "}
                  {formatPp(winner.stats.topPlayPp)}pp/{formatStars(winner.stats.topPlaySr)}★
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
