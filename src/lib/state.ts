import { db } from "./db";
import { isPersonSection, type Section } from "./sections";
import type { Item, People, Reply, Task, WorkspaceState } from "./types";

export function getPeople(): People {
  return {
    a: process.env.PERSON_A?.trim() || "Первый",
    b: process.env.PERSON_B?.trim() || "Второй",
  };
}

export const TASK_COLUMNS = `
  id, text, assignee, to_char(due, 'YYYY-MM-DD') AS due, position, done,
  done_at AS "doneAt", created_at AS "createdAt"
`;

export function toTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as number,
    text: row.text as string,
    assignee: (row.assignee as Task["assignee"]) ?? null,
    due: (row.due as string) ?? null,
    position: row.position as number,
    done: row.done as boolean,
    doneAt: row.doneAt ? new Date(row.doneAt as string).toISOString() : null,
    createdAt: new Date(row.createdAt as string).toISOString(),
  };
}

export const REPLY_COLUMNS = `id, task_id AS "taskId", text, created_at AS "createdAt"`;

export function toReply(row: Record<string, unknown>): Reply {
  return {
    id: row.id as number,
    taskId: row.taskId as number,
    text: row.text as string,
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

export async function sectionExists(slug: unknown): Promise<boolean> {
  if (typeof slug !== "string" || !slug) return false;
  const rows = await db()`SELECT 1 FROM sections WHERE slug = ${slug}`;
  return rows.length > 0;
}

export async function loadState(): Promise<WorkspaceState> {
  const sql = db();
  const [sectionRows, taskRows, replyRows, itemRows] = await sql.transaction([
    sql`SELECT slug, title, emoji, note FROM sections ORDER BY position, title`,
    sql.query(`SELECT ${TASK_COLUMNS} FROM tasks WHERE deleted_at IS NULL ORDER BY position, created_at, id`),
    sql.query(
      `SELECT ${REPLY_COLUMNS} FROM replies
       WHERE task_id IN (SELECT id FROM tasks WHERE deleted_at IS NULL)
       ORDER BY created_at, id`,
    ),
    sql.query(`SELECT ${ITEM_COLUMNS} FROM items WHERE deleted_at IS NULL ORDER BY created_at, id`),
  ]);

  const sections: Section[] = sectionRows
    .filter((row) => !isPersonSection(row.slug as string))
    .map((row) => ({ slug: row.slug as string, title: row.title as string, emoji: row.emoji as string }));
  const notes: WorkspaceState["notes"] = {};
  for (const row of sectionRows) notes[row.slug as string] = row.note as string;

  return {
    sections,
    notes,
    tasks: taskRows.map(toTask),
    replies: replyRows.map(toReply),
    items: itemRows.map(toItem),
    people: getPeople(),
  };
}
