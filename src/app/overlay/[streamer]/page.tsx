import { notFound } from "next/navigation";
import { getStreamerByLogin } from "@/lib/streamers";
import { OverlayClient } from "../OverlayClient";

export default async function OverlayPage({ params }: { params: Promise<{ streamer: string }> }) {
  const { streamer: login } = await params;
  const streamer = await getStreamerByLogin(decodeURIComponent(login));
  if (!streamer) notFound();

  return <OverlayClient streamerId={streamer.id} />;
}
