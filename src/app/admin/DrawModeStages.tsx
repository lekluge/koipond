"use client";

import { useState, type ReactNode } from "react";
import { cx } from "@/components/ui";
import type { DrawMode } from "@/lib/entries";

const MODES: { value: DrawMode; label: string; hint: string }[] = [
  {
    value: "keyword",
    label: "Keyword",
    hint: "Viewers type a word to enter, you draw a winner from everyone who did.",
  },
  {
    value: "number",
    label: "Number guess",
    hint: "The app hides a number in a range you set. First correct guess in chat wins.",
  },
];

export type StageSlots = { top: ReactNode; bottom?: ReactNode };

export function DrawModeStages({
  defaultMode,
  keyword,
  number,
  common,
}: {
  defaultMode: DrawMode;
  keyword: StageSlots;
  number: StageSlots;
  common: ReactNode;
}) {
  const [mode, setMode] = useState<DrawMode>(defaultMode);
  const [picking, setPicking] = useState(false);

  const active = MODES.find((m) => m.value === mode) ?? MODES[0];

  return (
    <>
      <fieldset className={cx("mt-4", picking ? "block" : "hidden")}>
        <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Giveaway type
        </legend>
        <p className="mt-2 text-xs text-zinc-500">
          Switching while entries are open closes the round and clears the entrant list.
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {MODES.map((option) => {
            const selected = mode === option.value;
            return (
              <label
                key={option.value}
                className={cx(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 transition",
                  selected
                    ? "border-purple-500/60 bg-purple-500/10"
                    : "border-white/10 bg-white/2 hover:border-white/20 hover:bg-white/5",
                )}
              >
                <input
                  type="radio"
                  name="drawMode"
                  value={option.value}
                  checked={selected}
                  onClick={() => {
                    setMode(option.value);
                    setPicking(false);
                  }}
                  onChange={() => {
                    setMode(option.value);
                    setPicking(false);
                  }}
                  className="sr-only"
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-100">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">{option.hint}</span>
                </span>
                <span aria-hidden className="text-zinc-600">
                  ›
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className={cx("mt-4", picking ? "hidden" : "block")}>
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
          >
            <span aria-hidden>‹</span> Change type
          </button>
          <span className="text-sm font-medium text-zinc-100">{active.label}</span>
        </div>

        <div className={cx(mode === "keyword" ? "block" : "hidden")}>{keyword.top}</div>
        <div className={cx(mode === "number" ? "block" : "hidden")}>{number.top}</div>

        {common}

        <div className={cx(mode === "keyword" ? "block" : "hidden")}>{keyword.bottom}</div>
        <div className={cx(mode === "number" ? "block" : "hidden")}>{number.bottom}</div>
      </div>
    </>
  );
}
