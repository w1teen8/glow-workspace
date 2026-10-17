import { authorize, json, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { isSectionSlug } from "@/lib/sections";
import { TASK_COLUMNS, toTask } from "@/lib/state";
import { LIMITS, cleanText, parseAssignee, parseDue } from "@/lib/validate";

export async function POST(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;

  const body = await readJson(req);
  const section = body?.section;
  const text = cleanText(body?.text, LIMITS.taskText);
  const assignee = parseAssignee(body?.assignee ?? null);
  const due = parseDue(body?.due ?? null);
  const done = body?.done === true;
  if (!isSectionSlug(section) || !text || assignee === undefined || due === undefined) {
    return json({ error: "bad task" }, 400);
  }

  const [row] = await db().query(
    `INSERT INTO tasks (section, text, assignee, due, done, done_at)
     VALUES ($1, $2, $3, $4::date, $5, CASE WHEN $5 THEN now() END)
     RETURNING ${TASK_COLUMNS}`,
    [section, text, assignee, due, done],
  );
  return json(toTask(row), 201);
}
