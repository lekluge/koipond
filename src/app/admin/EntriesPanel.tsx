"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";
import { useEntriesLive } from "./EntriesLive";

export function EntriesPanel() {
  const { entriesOpen, entrants, pastWinnerTwitchIds, uniqueWinners } = useEntriesLive();
  const [query, setQuery] = useState("");

  const filtered = entrants.filter((e) =>
    e.twitch_display_name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-3">
      {entriesOpen && (
        <p className="text-xs text-zinc-500">
          Pick a winner before closing — closing ends the round and clears the entrant list.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">
          Status:{" "}
          <span className={entriesOpen ? "font-medium text-emerald-400" : "font-medium text-zinc-500"}>
            {entriesOpen ? "open" : "closed"}
          </span>{" "}
          · {entrants.length} entered
        </p>
        {entrants.length > 0 && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search participants…"
            className={inputClass + " w-56"}
          />
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-500">
          {entrants.length === 0 ? "Viewers will appear here as they enter." : "No participants match your search."}
        </p>
      ) : (
        <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
          {filtered.map((e) => {
            const alreadyWon = uniqueWinners && pastWinnerTwitchIds.includes(e.twitch_id);
            return (
              <span
                key={e.twitch_id}
                className={`animate-entry-pop flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                  alreadyWon
                    ? "border-emerald-500/20 bg-emerald-500/5 text-zinc-500"
                    : "border-white/10 bg-white/5 text-zinc-200"
                }`}
              >
                <span className="font-medium">{e.twitch_display_name}</span>
                <span className="text-zinc-500">
                  {e.osu_username ? `· osu! ${e.osu_username}` : "· not linked"}
                </span>
                {alreadyWon && <span className="text-emerald-400">· won</span>}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
