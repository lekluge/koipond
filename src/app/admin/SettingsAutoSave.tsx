"use client";

import { useEffect, useRef, useState } from "react";
import { saveSettingsAction } from "./actions";

const DEBOUNCE_MS = 800;
const SAVED_VISIBLE_MS = 2000;

type Status = "idle" | "saving" | "saved" | "error";

export function SettingsAutoSave({ formId }: { formId: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    let cancelled = false;
    let savedTimer: ReturnType<typeof setTimeout> | undefined;

    async function save() {
      setStatus("saving");
      try {
        await saveSettingsAction(new FormData(form!));
        if (cancelled) return;
        setStatus("saved");
        clearTimeout(savedTimer);
        savedTimer = setTimeout(() => !cancelled && setStatus("idle"), SAVED_VISIBLE_MS);
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    function onEdit(e: Event) {
      if ((e.target as HTMLElement | null)?.getAttribute?.("name") === "presetName") return;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(save, DEBOUNCE_MS);
    }

    form.addEventListener("input", onEdit);
    form.addEventListener("change", onEdit);
    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
      clearTimeout(savedTimer);
      form.removeEventListener("input", onEdit);
      form.removeEventListener("change", onEdit);
    };
  }, [formId]);

  if (status === "idle") return null;

  return (
    <span
      aria-live="polite"
      className={`text-xs ${status === "error" ? "text-red-300" : "text-zinc-500"}`}
    >
      {status === "saving" && "Saving…"}
      {status === "saved" && "Saved"}
      {status === "error" && "Couldn't save — change something to retry"}
    </span>
  );
}
