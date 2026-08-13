"use client";

import { useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { startEntriesAction, stopEntriesAction } from "./actions";
import { useEntriesLive } from "./EntriesLive";

export function EntriesToggleButton() {
  const { entriesOpen, setOptimisticEntriesOpen } = useEntriesLive();
  const [pending, startTransition] = useTransition();

  function toggle() {
    const form = document.querySelector<HTMLFormElement>("#criteria-form");
    const data = form ? new FormData(form) : null;

    startTransition(async () => {
      setOptimisticEntriesOpen(!entriesOpen);
      await (entriesOpen ? stopEntriesAction() : startEntriesAction(data));
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={buttonClass(entriesOpen ? "danger" : "success")}
    >
      {entriesOpen ? "Close entries" : "Open entries"}
    </button>
  );
}
