"use client";

/** Текст для поиска: без регистра, «ё» = «е», лишние пробелы схлопнуты. */
export function normalizeSearch(text: string) {
  return text.toLowerCase().replaceAll("ё", "е").replace(/\s+/g, " ").trim();
}

/** Поле поиска задач по ключевым словам; Esc очищает. */
export function TaskSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="search"
      className="task-search"
      value={value}
      placeholder="Поиск по задачам…"
      aria-label="Поиск по задачам"
      enterKeyHint="search"
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape") onChange("");
      }}
    />
  );
}
