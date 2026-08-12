"use client";

import { useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { startEntriesAction, stopEntriesAction } from "./actions";
import { useEntriesLive } from "./EntriesLive";

export function EntriesToggleButton() {
  const { entriesOpen, setOptimisticEntriesOpen } = useEntriesLive();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      setOptimisticEntriesOpen(!entriesOpen);
      await (entriesOpen ? stopEntriesAction() : startEntriesAction());
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
