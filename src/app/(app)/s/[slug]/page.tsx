import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Materials } from "@/components/Materials";
import { Note } from "@/components/Note";
import { TaskList } from "@/components/TaskList";
import { getSection } from "@/lib/sections";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const section = getSection((await params).slug);
  return { title: section?.title };
}

export default async function SectionPage({ params }: Props) {
  const section = getSection((await params).slug);
  if (!section) notFound();

  return (
    <div className="page">
      <h1>
        {section.emoji} {section.title}
      </h1>
      <Note key={section.slug} section={section.slug} />
      <TaskList section={section.slug} />
      <Materials section={section.slug} />
    </div>
  );
}
