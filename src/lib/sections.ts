// Единственный источник списка разделов — и для интерфейса, и для сервера.
export const SECTIONS = [
  { slug: "concept", emoji: "💡", title: "Концепция" },
  { slug: "mvp", emoji: "📋", title: "MVP" },
  { slug: "stack", emoji: "🔗", title: "Стек" },
  { slug: "research", emoji: "🎤", title: "Исследование" },
  { slug: "ux", emoji: "💭", title: "UX/UI" },
  { slug: "tasks", emoji: "📊", title: "Задачи" },
  { slug: "expenses", emoji: "💲", title: "Расходы" },
  { slug: "motivation", emoji: "🔥", title: "Мотивация" },
  { slug: "general", emoji: "#", title: "General" },
] as const;

export type SectionSlug = (typeof SECTIONS)[number]["slug"];
export type Section = (typeof SECTIONS)[number];

export function isSectionSlug(value: unknown): value is SectionSlug {
  return typeof value === "string" && SECTIONS.some((s) => s.slug === value);
}

export function getSection(slug: string): Section | undefined {
  return SECTIONS.find((s) => s.slug === slug);
}
