import "server-only";
import { getTwitchProfile, getTwitchStream, type TwitchStream } from "@/lib/twitch";

export type ChannelStatus = {
  displayName: string;
  profileImageUrl: string | null;
  stream: TwitchStream | null;
  unavailable?: boolean;
};

export async function getChannelStatus(streamer: {
  twitchId: string;
  twitchDisplayName: string;
}): Promise<ChannelStatus> {
  try {
    const [profile, stream] = await Promise.all([
      getTwitchProfile(streamer.twitchId),
      getTwitchStream(streamer.twitchId),
    ]);

    return {
      displayName: profile?.displayName ?? streamer.twitchDisplayName,
      profileImageUrl: profile?.profileImageUrl ?? null,
      stream,
    };
  } catch (err) {
    console.error("Channel status lookup failed", err);
    return {
      displayName: streamer.twitchDisplayName,
      profileImageUrl: null,
      stream: null,
      unavailable: true,
    };
  }
}
