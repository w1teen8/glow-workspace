import { authorize, json, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { TASK_COLUMNS, toTask } from "@/lib/state";
import { LIMITS, cleanText, parseAssignee, parseDue } from "@/lib/validate";

export async function POST(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;

  const body = await readJson(req);
  const text = cleanText(body?.text, LIMITS.taskText);
  const assignee = parseAssignee(body?.assignee ?? null);
  const due = parseDue(body?.due ?? null);
  const done = body?.done === true;
  if (!text || assignee === undefined || due === undefined) {
    return json({ error: "bad task" }, 400);
  }

  const [row] = await db().query(
    `INSERT INTO tasks (text, assignee, due, done, done_at, position)
     VALUES ($1, $2, $3::date, $4, CASE WHEN $4 THEN now() END,
             (SELECT COALESCE(max(position), 0) + 1 FROM tasks))
     RETURNING ${TASK_COLUMNS}`,
    [text, assignee, due, done],
  );
  return json(toTask(row), 201);
}
