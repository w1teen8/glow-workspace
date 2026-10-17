"use client";

import type { ReactNode, RefObject } from "react";

/*
 * Лёгкая разметка блоков — то, что ставят кнопки панели форматирования:
 *   # Заголовок      ## Подзаголовок
 *   • пункт / - пункт       1. пункт
 *   **жирный**  *курсив*  и ссылки http(s)://…
 * Рендерится в React-элементы, без HTML из текста.
 */

const URL_RE = /(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]*])/;
const INLINE_RE = new RegExp(`\\*\\*([^*]+?)\\*\\*|\\*([^*\\s][^*]*?)\\*|${URL_RE.source}`, "g");

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1] !== undefined) out.push(<strong key={k}>{inline(m[1], k)}</strong>);
    else if (m[2] !== undefined) out.push(<em key={k}>{inline(m[2], k)}</em>);
    else
      out.push(
        <a key={k} href={m[3]} target="_blank" rel="noopener noreferrer" className="link">
          {m[3]}
        </a>,
      );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const BULLET = /^\s*[•\-–*]\s+/;
const NUMBER = /^\s*(\d+)[.)]\s*/;
const HEADING = /^(#{1,2})\s+/;

/** Текст → список верхнеуровневых элементов (абзацы, заголовки, списки). */
export function renderRich(text: string): ReactNode[] {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = `b${i}`;

    if (!line.trim()) {
      i++;
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      const content = inline(line.slice(heading[0].length), key);
      out.push(heading[1].length === 1 ? <h3 key={key}>{content}</h3> : <h4 key={key}>{content}</h4>);
      i++;
      continue;
    }

    if (BULLET.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && BULLET.test(lines[i])) {
        items.push(<li key={i}>{inline(lines[i].replace(BULLET, ""), `${key}-${i}`)}</li>);
        i++;
      }
      out.push(<ul key={key}>{items}</ul>);
      continue;
    }

    const num = line.match(NUMBER);
    if (num && line.slice(num[0].length).trim()) {
      const items: ReactNode[] = [];
      while (i < lines.length) {
        const m = lines[i].match(NUMBER);
        if (!m || !lines[i].slice(m[0].length).trim()) break;
        items.push(<li key={i}>{inline(lines[i].slice(m[0].length), `${key}-${i}`)}</li>);
        i++;
      }
      out.push(
        <ol key={key} start={Number(num[1])}>
          {items}
        </ol>,
      );
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !HEADING.test(lines[i]) &&
      !BULLET.test(lines[i]) &&
      !(NUMBER.test(lines[i]) && lines[i].replace(NUMBER, "").trim())
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(
      <p key={key}>
        {para.flatMap((p, j) => (j ? [<br key={`br${j}`} />, ...inline(p, `${key}-${j}`)] : inline(p, `${key}-${j}`)))}
      </p>,
    );
  }

  return out;
}

/** limit — показать только первые N элементов (свёрнутый длинный блок). */
export function RichText({ text, limit }: { text: string; limit?: number }) {
  const nodes = renderRich(text);
  return <div className="rich">{limit ? nodes.slice(0, limit) : nodes}</div>;
}

type Apply = (value: string, selection: [number, number]) => void;

/** Меняет текст в textarea и ставит курсор/выделение после того, как React обновит значение. */
function edit(
  ref: RefObject<HTMLTextAreaElement | null>,
  apply: Apply,
  transform: (value: string, start: number, end: number) => { value: string; start: number; end: number },
) {
  const el = ref.current;
  if (!el) return;
  const result = transform(el.value, el.selectionStart, el.selectionEnd);
  apply(result.value, [result.start, result.end]);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(result.start, result.end);
  });
}

function wrap(marker: string) {
  return (value: string, start: number, end: number) => {
    const selected = value.slice(start, end) || "текст";
    const next = value.slice(0, start) + marker + selected + marker + value.slice(end);
    return { value: next, start: start + marker.length, end: start + marker.length + selected.length };
  };
}

/** Ставит префикс в начало каждой выделенной строки (или убирает, если он уже есть у всех). */
function prefixLines(make: (n: number) => string, strip: RegExp) {
  return (value: string, start: number, end: number) => {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEndIdx = value.indexOf("\n", end > start ? end - 1 : end);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const lines = value.slice(lineStart, lineEnd).split("\n");
    const allHave = lines.every((l) => strip.test(l));
    const changed = lines.map((l, n) => (allHave ? l.replace(strip, "") : make(n + 1) + l.replace(strip, "")));
    const replaced = changed.join("\n");
    const next = value.slice(0, lineStart) + replaced + value.slice(lineEnd);
    return { value: next, start: lineStart, end: lineStart + replaced.length };
  };
}

const ANY_PREFIX = /^(#{1,2}\s+|\s*[•\-–*]\s+|\s*\d+[.)]\s*)/;

export const FORMATS = {
  h1: prefixLines(() => "# ", ANY_PREFIX),
  h2: prefixLines(() => "## ", ANY_PREFIX),
  bold: wrap("**"),
  italic: wrap("*"),
  bullets: prefixLines(() => "• ", ANY_PREFIX),
  numbers: prefixLines((n) => `${n}. `, ANY_PREFIX),
};

/** Ctrl/Cmd+B и Ctrl/Cmd+I в поле ввода. Возвращает true, если клавиша обработана. */
export function handleFormatKey(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  ref: RefObject<HTMLTextAreaElement | null>,
  apply: Apply,
) {
  if (!(e.metaKey || e.ctrlKey) || e.altKey) return false;
  const key = e.key.toLowerCase();
  const fmt = key === "b" || key === "и" ? FORMATS.bold : key === "i" || key === "ш" ? FORMATS.italic : null;
  if (!fmt) return false;
  e.preventDefault();
  edit(ref, apply, fmt);
  return true;
}

export function FormatBar({
  target,
  apply,
}: {
  target: RefObject<HTMLTextAreaElement | null>;
  apply: Apply;
}) {
  const button = (label: ReactNode, title: string, fmt: keyof typeof FORMATS) => (
    <button
      type="button"
      className="fmt"
      title={title}
      aria-label={title}
      // не забираем фокус у поля ввода, чтобы не потерять выделение
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => edit(target, apply, FORMATS[fmt])}
    >
      {label}
    </button>
  );

  return (
    <div className="fmt-bar" role="toolbar" aria-label="Форматирование">
      {button("Заголовок", "Заголовок", "h1")}
      {button("Подзаголовок", "Подзаголовок", "h2")}
      {button(<strong>Ж</strong>, "Жирный (Ctrl+B)", "bold")}
      {button(<em>К</em>, "Курсив (Ctrl+I)", "italic")}
      {button("• Список", "Маркированный список", "bullets")}
      {button("1. Список", "Нумерованный список", "numbers")}
    </div>
  );
}
