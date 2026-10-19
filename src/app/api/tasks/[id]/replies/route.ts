import { authorize, json, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { REPLY_COLUMNS, toReply } from "@/lib/state";
import { LIMITS, cleanText, parseId } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

/** Новый ответ под задачей: { text }. */
export async function POST(req: Request, ctx: Ctx) {
  const denied = await authorize(req);
  if (denied) return denied;

  const taskId = parseId((await ctx.params).id);
  const body = await readJson(req);
  const text = cleanText(body?.text, LIMITS.replyText);
  if (!taskId || !text) return json({ error: "bad reply" }, 400);

  const rows = await db().query(
    `INSERT INTO replies (task_id, text)
     SELECT id, $2 FROM tasks WHERE id = $1 AND deleted_at IS NULL
     RETURNING ${REPLY_COLUMNS}`,
    [taskId, text],
  );
  if (!rows.length) return json({ error: "not found" }, 404);
  return json(toReply(rows[0]), 201);
}
