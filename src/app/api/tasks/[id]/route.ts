import { authorize, json, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { TASK_COLUMNS, toTask } from "@/lib/state";
import { LIMITS, cleanText, parseAssignee, parseDue, parseId } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await authorize(req);
  if (denied) return denied;

  const id = parseId((await ctx.params).id);
  const body = await readJson(req);
  if (!id || !body) return json({ error: "bad request" }, 400);

  // { deleted: false } — вернуть удалённую задачу вместе с её ответами.
  if (body.deleted === false) {
    const rows = await db().query(
      `UPDATE tasks SET deleted_at = NULL WHERE id = $1 RETURNING ${TASK_COLUMNS}`,
      [id],
    );
    if (!rows.length) return json({ error: "not found" }, 404);
    return json(toTask(rows[0]));
  }

  // Каждое поле необязательно: меняется только то, что пришло в запросе.
  const has = (key: string) => Object.hasOwn(body, key);
  const text = has("text") ? cleanText(body.text, LIMITS.taskText) : null;
  const assignee = has("assignee") ? parseAssignee(body.assignee) : null;
  const due = has("due") ? parseDue(body.due) : null;
  const done = has("done") ? body.done : null;
  if (
    (has("text") && !text) ||
    assignee === undefined ||
    due === undefined ||
    (has("done") && typeof done !== "boolean")
  ) {
    return json({ error: "bad task" }, 400);
  }

  const rows = await db().query(
    `UPDATE tasks SET
       text     = COALESCE($2, text),
       assignee = CASE WHEN $3 THEN $4 ELSE assignee END,
       due      = CASE WHEN $5 THEN $6::date ELSE due END,
       done     = COALESCE($7::boolean, done),
       done_at  = CASE
                    WHEN $7::boolean IS NULL THEN done_at
                    WHEN $7::boolean THEN COALESCE(done_at, now())
                    ELSE NULL
                  END
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING ${TASK_COLUMNS}`,
    [id, text, has("assignee"), assignee, has("due"), due, done],
  );
  if (!rows.length) return json({ error: "not found" }, 404);
  return json(toTask(rows[0]));
}

// Удаление мягкое: сутки задачу можно вернуть кнопкой «Вернуть», потом она стирается вместе с ответами.
export async function DELETE(req: Request, ctx: Ctx) {
  const denied = await authorize(req);
  if (denied) return denied;

  const id = parseId((await ctx.params).id);
  if (!id) return json({ error: "bad request" }, 400);
  const sql = db();
  await sql.transaction([
    sql`UPDATE tasks SET deleted_at = now() WHERE id = ${id} AND deleted_at IS NULL`,
    sql`DELETE FROM tasks WHERE deleted_at < now() - interval '1 day'`,
  ]);
  return json({ ok: true });
}
