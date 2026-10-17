import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PersonView } from "@/components/PersonView";
import { getPeople } from "@/lib/state";

type Props = { params: Promise<{ who: string }> };

function parseWho(value: string) {
  return value === "a" || value === "b" ? value : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const who = parseWho((await params).who);
  return { title: who ? getPeople()[who] : undefined };
}

export default async function PersonPage({ params }: Props) {
  const who = parseWho((await params).who);
  if (!who) notFound();
  return <PersonView who={who} />;
}
