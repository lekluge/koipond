import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Twitch profile pictures (winner reveal). Twitch serves every avatar
    // from this one host.
    remotePatterns: [{ protocol: "https", hostname: "static-cdn.jtvnw.net" }],
  },
};

export default nextConfig;
