export type DemoCriteria = {
  globalRankMin?: number;
  globalRankMax?: number;
  countryRankMin?: number;
  countryRankMax?: number;
  countryCode?: string;
  ppMin?: number;
  ppMax?: number;
  topPlaySrMin?: number;
  topPlayPpMin?: number;
  accuracyMin?: number;
  accuracyMax?: number;
  playcountMin?: number;
};

export type DemoParticipant = {
  id: string;
  twitchDisplayName: string;
  osuUsername: string;
  globalRank: number;
  countryRank: number;
  countryCode: string;
  pp: number;
  accuracy: number;
  playcount: number;
  topPlayPp: number;
  topPlaySr: number;
};

export function matchesCriteria(p: DemoParticipant, c: DemoCriteria): boolean {
  if (c.globalRankMin !== undefined && p.globalRank < c.globalRankMin) return false;
  if (c.globalRankMax !== undefined && p.globalRank > c.globalRankMax) return false;
  if (c.countryRankMin !== undefined && p.countryRank < c.countryRankMin) return false;
  if (c.countryRankMax !== undefined && p.countryRank > c.countryRankMax) return false;
  if (c.countryCode && p.countryCode.toUpperCase() !== c.countryCode.toUpperCase()) return false;
  if (c.ppMin !== undefined && p.pp < c.ppMin) return false;
  if (c.ppMax !== undefined && p.pp > c.ppMax) return false;
  if (c.topPlaySrMin !== undefined && p.topPlaySr < c.topPlaySrMin) return false;
  if (c.topPlayPpMin !== undefined && p.topPlayPp < c.topPlayPpMin) return false;
  if (c.accuracyMin !== undefined && p.accuracy < c.accuracyMin) return false;
  if (c.accuracyMax !== undefined && p.accuracy > c.accuracyMax) return false;
  if (c.playcountMin !== undefined && p.playcount < c.playcountMin) return false;
  return true;
}
