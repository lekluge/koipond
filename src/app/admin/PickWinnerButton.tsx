"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { pickWinnerAction } from "./actions";

export function PickWinnerButton() {
  const [pending, startTransition] = useTransition();
  const [noWinner, setNoWinner] = useState(false);

  function pick() {
    const form = document.querySelector<HTMLFormElement>("#criteria-form");
    if (!form) return;

    const data = new FormData(form);
    setNoWinner(false);
    startTransition(async () => {
      const result = await pickWinnerAction(data);
      setNoWinner(!result.winner);
    });
  }

  return (
    <>
      {noWinner && (
        <p className="mt-2 w-full text-right text-xs text-amber-300">
          Nobody eligible right now — with Unique Winners on, everyone who entered this round has
          already won.
        </p>
      )}
      <button
        id="pick-winner-btn"
        type="button"
        onClick={pick}
        className={buttonClass("primary")}
        disabled={pending}
      >
        {pending ? "Picking…" : "Pick Winner"}
      </button>
    </>
  );
}
