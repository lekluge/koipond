import { notFound } from "next/navigation";
import { demoEnabled } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  if (!demoEnabled()) notFound();
  return <>{children}</>;
}
