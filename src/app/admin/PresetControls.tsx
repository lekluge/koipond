"use client";

import { RANK_DIGIT_PRESETS } from "@/lib/rankPresets";
import type { DrawCriteria } from "@/lib/draw";

function setFormInput(name: string, value: string | number | undefined) {
  const el = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
  if (!el) return;
  el.value = value === undefined ? "" : String(value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export function RankPresetButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      {RANK_DIGIT_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => {
            setFormInput("globalRankMin", preset.min);
            setFormInput("globalRankMax", preset.max);
          }}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 transition hover:border-purple-500/40 hover:bg-white/10"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

const CRITERIA_FIELDS: (keyof DrawCriteria)[] = [
  "globalRankMin",
  "globalRankMax",
  "countryRankMin",
  "countryRankMax",
  "ppMin",
  "ppMax",
  "accuracyMin",
  "accuracyMax",
  "playcountMin",
  "topPlaySrMin",
  "topPlayPpMin",
];

export function ApplyPresetButton({ criteria, name }: { criteria: DrawCriteria; name: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        for (const key of CRITERIA_FIELDS) setFormInput(key, criteria[key]);
        setFormInput("countryCode", criteria.countryCode ?? "");
      }}
      className="py-1 text-xs text-zinc-300 hover:text-purple-300 hover:underline"
    >
      {name}
    </button>
  );
}
