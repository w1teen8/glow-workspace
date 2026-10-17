import type { Metadata } from "next";
import { Chat } from "@/components/Chat";

export const metadata: Metadata = { title: "ИИ-агент" };

export default function AgentPage() {
  return <Chat />;
}
