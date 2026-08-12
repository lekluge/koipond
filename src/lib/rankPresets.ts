export type RankPreset = {
  id: string;
  label: string;
  min?: number;
  max?: number;
};

export const RANK_DIGIT_PRESETS: RankPreset[] = [
  { id: "d3", label: "≤ 999 (3-digit)", max: 999 },
  { id: "d4", label: "4-digit", min: 1_000, max: 9_999 },
  { id: "d5", label: "5-digit", min: 10_000, max: 99_999 },
  { id: "d6", label: "6-digit", min: 100_000, max: 999_999 },
  { id: "d7", label: "7-digit+", min: 1_000_000 },
];
