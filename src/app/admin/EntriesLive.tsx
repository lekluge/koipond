"use client";

import {
  createContext,
  useContext,
  useEffect,
  useOptimistic,
  useState,
  type ReactNode,
} from "react";
import type { Entrant } from "@/lib/entries";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type EntriesLive = {
  entriesOpen: boolean;
  entrants: Entrant[];
  pastWinnerTwitchIds: string[];
  uniqueWinners: boolean;
  setOptimisticEntriesOpen: (open: boolean) => void;
};

const FALLBACK_POLL_MS = 60_000;

const EntriesLiveContext = createContext<EntriesLive | null>(null);

export function useEntriesLive(): EntriesLive {
  const value = useContext(EntriesLiveContext);
  if (!value) throw new Error("useEntriesLive must be used inside <EntriesLiveProvider>");
  return value;
}

export function EntriesLiveProvider({
  streamerId,
  entriesOpen,
  entrants,
  children,
}: {
  streamerId: string;
  entriesOpen: boolean;
  entrants: Entrant[];
  children: ReactNode;
}) {
  const [live, setLive] = useState({
    entriesOpen,
    entrants,
    pastWinnerTwitchIds: [] as string[],
    uniqueWinners: false,
  });

  const [serverSnapshot, setServerSnapshot] = useState({ entriesOpen, entrants });
  if (serverSnapshot.entriesOpen !== entriesOpen || serverSnapshot.entrants !== entrants) {
    setServerSnapshot({ entriesOpen, entrants });
    setLive((prev) => ({ ...prev, entriesOpen, entrants }));
  }

  const [optimisticEntriesOpen, setOptimisticEntriesOpen] = useOptimistic(live.entriesOpen);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function refresh() {
      if (cancelled) return;
      try {
        const res = await fetch("/api/admin/entries", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setLive({
              entriesOpen: data.entriesOpen,
              entrants: data.entrants,
              pastWinnerTwitchIds: data.pastWinnerTwitchIds ?? [],
              uniqueWinners: !!data.uniqueWinners,
            });
          }
        }
      } catch {}
      scheduleFallback();
    }

    function scheduleFallback() {
      if (cancelled) return;
      timer = setTimeout(() => {
        if (document.hidden) {
          scheduleFallback();
          return;
        }
        void refresh();
      }, FALLBACK_POLL_MS);
    }

    function onVisibilityChange() {
      if (document.hidden || cancelled) return;
      clearTimeout(timer);
      void refresh();
    }

    const supabase = supabaseBrowser();
    const channel = supabase
      .channel(`streamer:${streamerId}:entries`)
      .on("broadcast", { event: "ping" }, () => {
        clearTimeout(timer);
        void refresh();
      })
      .subscribe();

    void refresh();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [streamerId]);

  return (
    <EntriesLiveContext.Provider
      value={{
        entriesOpen: optimisticEntriesOpen,
        entrants: live.entrants,
        pastWinnerTwitchIds: live.pastWinnerTwitchIds,
        uniqueWinners: live.uniqueWinners,
        setOptimisticEntriesOpen,
      }}
    >
      {children}
    </EntriesLiveContext.Provider>
  );
}
