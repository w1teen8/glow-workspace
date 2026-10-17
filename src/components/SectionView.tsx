"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Blocks } from "./Blocks";
import { Note } from "./Note";
import { useWorkspace } from "./WorkspaceProvider";

function plural(n: number, forms: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export function SectionView({ slug }: { slug: string }) {
  const { state, deleteSection } = useWorkspace();
  const router = useRouter();
  const section = state.sections.find((s) => s.slug === slug);

  // Раздел мог удалить второй человек, пока страница была открыта.
  if (!section) {
    return (
      <div className="page">
        <h1>Раздела больше нет</h1>
        <p className="muted">
          Его удалили. <Link href="/" className="link">Вернуться к прогрессу</Link>
        </p>
      </div>
    );
  }

  async function remove() {
    const blocks = state.items.filter((i) => i.section === slug).length;
    const question =
      `Удалить раздел «${section!.title}»?` +
      (blocks
        ? `\nВместе с ним удалятся ${blocks} ${plural(blocks, ["блок", "блока", "блоков"])}. Вернуть их будет нельзя.`
        : "");
    if (!window.confirm(question)) return;
    router.push("/");
    await deleteSection(slug);
  }

  return (
    <div className="page">
      <h1>
        {section.emoji && `${section.emoji} `}
        {section.title}
      </h1>
      <Note key={slug} section={slug} />
      <Blocks section={slug} />
      <button className="section-delete" onClick={remove}>
        Удалить раздел
      </button>
    </div>
  );
}
