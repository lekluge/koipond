import "server-only";
import { supabaseAdmin } from "@/lib/supabaseServer";
import type { DrawCriteria } from "@/lib/draw";

export type Preset = {
  id: string;
  name: string;
  criteria: DrawCriteria;
  created_at: string;
};

export async function listPresets(streamerId: string): Promise<Preset[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("presets")
    .select("*")
    .eq("streamer_id", streamerId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createPreset(streamerId: string, name: string, criteria: DrawCriteria) {
  const db = supabaseAdmin();
  const { error } = await db.from("presets").insert({ streamer_id: streamerId, name, criteria });
  if (error) throw error;
}

export async function deletePreset(streamerId: string, id: string) {
  const db = supabaseAdmin();
  const { error } = await db.from("presets").delete().eq("id", id).eq("streamer_id", streamerId);
  if (error) throw error;
}
