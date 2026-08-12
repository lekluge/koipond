"use client";

import { useEffect, useState } from "react";
import { matchesCriteria, type DemoCriteria, type DemoParticipant } from "@/lib/demoMatch";
import type { Entrant } from "@/lib/entries";
import { useEntriesLive } from "./EntriesLive";

function toParticipant(e: Entrant): DemoParticipant {
  return {
    id: e.participant_id ?? e.twitch_id,
    twitchDisplayName: e.twitch_display_name,
    osuUsername: e.osu_username ?? "",
    globalRank: e.global_rank ?? 0,
    countryRank: e.country_rank ?? 0,
    countryCode: e.country_code ?? "",
    pp: e.pp ?? 0,
    accuracy: e.accuracy ?? 0,
    playcount: e.playcount ?? 0,
    topPlayPp: e.top_play_pp ?? 0,
    topPlaySr: e.top_play_sr ?? 0,
  };
}

function readCriteriaFromForm(): DemoCriteria {
  const get = (name: string) => document.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value.trim() ?? "";
  const num = (name: string) => {
    const v = get(name);
    return v === "" ? undefined : Number(v);
  };
  return {
    globalRankMin: num("globalRankMin"),
    globalRankMax: num("globalRankMax"),
    countryRankMin: num("countryRankMin"),
    countryRankMax: num("countryRankMax"),
    ppMin: num("ppMin"),
    ppMax: num("ppMax"),
    accuracyMin: num("accuracyMin"),
    accuracyMax: num("accuracyMax"),
    playcountMin: num("playcountMin"),
    topPlaySrMin: num("topPlaySrMin"),
    topPlayPpMin: num("topPlayPpMin"),
    countryCode: get("countryCode") || undefined,
  };
}

export function LiveEligibleCount({ initialCount }: { initialCount: number }) {
  const { entrants, pastWinnerTwitchIds } = useEntriesLive();
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const pastWinners = new Set(pastWinnerTwitchIds);

    function checked(name: string): boolean {
      return document.querySelector<HTMLInputElement>(`[name="${name}"]`)?.checked ?? false;
    }

    function recompute() {
      const remaining = checked("uniqueWinners")
        ? entrants.filter((e) => !pastWinners.has(e.twitch_id))
        : entrants;
      const eligible = checked("ignoreOsuCriteria")
        ? remaining
        : remaining.filter((e) => e.linked).filter((e) => matchesCriteria(toParticipant(e), readCriteriaFromForm()));
      setCount(eligible.length);
    }

    recompute();

    const form = document.querySelector("#criteria-form");
    form?.addEventListener("input", recompute);
    form?.addEventListener("change", recompute);
    return () => {
      form?.removeEventListener("input", recompute);
      form?.removeEventListener("change", recompute);
    };
  }, [entrants, pastWinnerTwitchIds]);

  return <>{count}</>;
}
