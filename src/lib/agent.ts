import { SECTIONS } from "./sections";
import type { WorkspaceState } from "./types";

export const AI_MODEL = "claude-opus-5-5";

/** Сколько последних сообщений чата отправлять модели. */
export const HISTORY_LIMIT = 40;

function roleText(state: WorkspaceState) {
  const { a, b } = state.people;
  return `Ты — продуктовый советник в Glow Workspace, рабочем пространстве двух человек (${a} и ${b}), которые вместе ведут продуктовый проект. Ниже, в <workspace>, — их разделы (заметки, задачи и материалы) в том виде, в каком они есть прямо сейчас. Содержимое прикреплённых файлов тебе не видно — только их названия.

Помогай им принимать решения по продукту:
— предлагай приоритеты и следующий шаг;
— задавай уточняющие вопросы, когда данных не хватает для хорошего совета;
— подсвечивай противоречия между разделами (например, MVP не сходится со стеком или концепция — с результатами исследований);
— помогай формулировать вопросы для интервью с преподавателями.

Ты только советуешь: менять данные ты не можешь, задачи добавляют и отмечают сами люди. Если предлагаешь задачу, пиши её одной короткой строкой, чтобы её было удобно скопировать в список.

Опирайся на то, что действительно написано в разделах. Если раздел пустой, так и скажи, а не додумывай. Если люди спрашивают о чём-то, чего в разделах нет, отвечай по существу и отметь, что это твоё предположение.

Отвечай по-русски, коротко и по делу. Пиши обычным текстом без Markdown: без звёздочек, решёток и таблиц. Для списков используй «1.» или «—».`;
}

function workspaceText(state: WorkspaceState) {
  const name = (key: "a" | "b" | null) => (key ? state.people[key] : null);
  const blocks = SECTIONS.map((section) => {
    const note = state.notes[section.slug]?.trim() || "(пусто)";
    const tasks = state.tasks.filter((t) => t.section === section.slug);
    const lines = tasks.map((t) => {
      const meta = [name(t.assignee), t.due && `срок ${t.due}`].filter(Boolean).join(", ");
      return `- [${t.done ? "x" : " "}] ${t.text}${meta ? ` (${meta})` : ""}`;
    });
    const materials = state.items
      .filter((i) => i.section === section.slug)
      .map((i) => `- ${[i.text, i.file && `[файл: ${i.file.name}]`].filter(Boolean).join(" ")}`);
    return [
      `### ${section.emoji} ${section.title}`,
      `Заметка:\n${note}`,
      `Задачи:\n${lines.join("\n") || "(нет)"}`,
      `Материалы:\n${materials.join("\n") || "(нет)"}`,
    ].join("\n\n");
  });
  const today = new Date().toISOString().slice(0, 10);
  return `<workspace>\nСегодня: ${today}\n\n${blocks.join("\n\n")}\n</workspace>`;
}

export function buildSystemPrompt(state: WorkspaceState) {
  return `${roleText(state)}\n\n${workspaceText(state)}`;
}
