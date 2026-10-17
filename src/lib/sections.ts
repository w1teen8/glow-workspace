export type Section = { slug: string; emoji: string; title: string };

export const SECTION_TITLE_MAX = 60;

/**
 * У личных вкладок свои служебные разделы для заметки и блоков.
 * В общем списке разделов их нет, и удалить их нельзя.
 */
const PERSON_PREFIX = "person-";
export const personSection = (who: "a" | "b") => `${PERSON_PREFIX}${who}`;
export const isPersonSection = (slug: string) => slug.startsWith(PERSON_PREFIX);
export const SECTIONS_MAX = 50;

const LEADING_EMOJI = /^((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|‍|\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier})*)\s*/u;

/** «🚀 Маркетинг» → { emoji: "🚀", title: "Маркетинг" }. Без эмодзи значок остаётся пустым. */
export function splitEmoji(input: string): { emoji: string; title: string } {
  const text = input.trim();
  const match = text.match(LEADING_EMOJI);
  if (!match || match[0].length === text.length) return { emoji: "", title: text };
  return { emoji: match[1], title: text.slice(match[0].length).trim() };
}
