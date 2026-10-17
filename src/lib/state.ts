import { db } from "./db";
import { isSectionSlug } from "./sections";
import type { Item, People, Task, WorkspaceState } from "./types";

export function getPeople(): People {
  return {
    a: process.env.PERSON_A?.trim() || "Первый",
    b: process.env.PERSON_B?.trim() || "Второй",
  };
}

export const TASK_COLUMNS = `
  id, section, text, assignee, to_char(due, 'YYYY-MM-DD') AS due, done,
  done_at AS "doneAt", created_at AS "createdAt"
`;

export function toTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as number,
    section: row.section as Task["section"],
    text: row.text as string,
    assignee: (row.assignee as Task["assignee"]) ?? null,
    due: (row.due as string) ?? null,
    done: row.done as boolean,
    doneAt: row.doneAt ? new Date(row.doneAt as string).toISOString() : null,
    createdAt: new Date(row.createdAt as string).toISOString(),
  };
}

// Сами файлы сюда не входят — только описание; содержимое отдаёт /api/files/[id].
export const ITEM_COLUMNS = `id, section, text, file_name, mime, size, created_at AS "createdAt"`;

export function toItem(row: Record<string, unknown>): Item {
  return {
    id: row.id as number,
    section: row.section as Item["section"],
    text: (row.text as string) ?? null,
    file: row.file_name
      ? { name: row.file_name as string, mime: row.mime as string, size: row.size as number }
      : null,
    createdAt: new Date(row.createdAt as string).toISOString(),
  };
}

export async function loadState(): Promise<WorkspaceState> {
  const sql = db();
  const [noteRows, taskRows, itemRows] = await sql.transaction([
    sql`SELECT slug, note FROM sections`,
    sql.query(`SELECT ${TASK_COLUMNS} FROM tasks ORDER BY created_at, id`),
    sql.query(`SELECT ${ITEM_COLUMNS} FROM items WHERE deleted_at IS NULL ORDER BY created_at, id`),
  ]);

  const notes: WorkspaceState["notes"] = {};
  for (const row of noteRows) {
    if (isSectionSlug(row.slug)) notes[row.slug] = row.note as string;
  }
  const tasks = taskRows.map(toTask).filter((t) => isSectionSlug(t.section));
  const items = itemRows.map(toItem).filter((i) => isSectionSlug(i.section));

  return { notes, tasks, items, people: getPeople() };
}
