import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionView } from "@/components/SectionView";
import { db } from "@/lib/db";

type Props = { params: Promise<{ slug: string }> };

async function findTitle(slug: string): Promise<string | null> {
  const [row] = await db()`SELECT title FROM sections WHERE slug = ${slug}`;
  return (row?.title as string) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await findTitle((await params).slug)) ?? undefined };
}

export default async function SectionPage({ params }: Props) {
  const { slug } = await params;
  if (!(await findTitle(slug))) notFound();
  return <SectionView slug={slug} />;
}
