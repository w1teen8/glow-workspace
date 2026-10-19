import type { Decision, Owner, Vote } from "./types";

export const LIMITS = {
  taskText: 500,
  replyText: 5000,
  featureTitle: 200,
  featureNote: 5000,
  note: 20000,
  itemText: 50000,
  // Файлы лежат в базе, а у бесплатного Neon 0,5 ГБ — поэтому не больше 4 МБ на файл.
  fileBytes: 4 * 1024 * 1024,
};

/** Типы, которые браузер может безопасно показать сам; остальное отдаётся на скачивание. */
export const INLINE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= max ? text : null;
}

export function parseAssignee(value: unknown): Owner | null | undefined {
  if (value === null) return null;
  if (value === "a" || value === "b" || value === "both") return value;
  return undefined;
}

export function parseVote(value: unknown): Vote | null | undefined {
  if (value === null) return null;
  return value === "yes" || value === "no" ? value : undefined;
}

export function parseDecision(value: unknown): Decision | null | undefined {
  if (value === null) return null;
  return value === "mvp" || value === "later" || value === "no" ? value : undefined;
}

export function parseDue(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return Number.isNaN(Date.parse(value)) ? undefined : value;
}

export function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
