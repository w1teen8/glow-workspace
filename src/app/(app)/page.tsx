import type { Metadata } from "next";
import { ProgressView } from "@/components/ProgressView";

export const metadata: Metadata = { title: "Прогресс" };

export default function ProgressPage() {
  return <ProgressView />;
}
