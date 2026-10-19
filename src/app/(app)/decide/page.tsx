import type { Metadata } from "next";
import { DecideView } from "@/components/DecideView";

export const metadata: Metadata = { title: "Решаем MVP" };

export default function DecidePage() {
  return <DecideView />;
}
