import { authorize, json, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { REPLY_COLUMNS, toReply } from "@/lib/state";
import { LIMITS, cleanText, parseId } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

/** Изменить текст ответа: { text }. */
export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await authorize(req);
  if (denied) return denied;

  const id = parseId((await ctx.params).id);
  const body = await readJson(req);
  const text = cleanText(body?.text, LIMITS.replyText);
  if (!id || !text) return json({ error: "bad reply" }, 400);

  const rows = await db().query(`UPDATE replies SET text = $2 WHERE id = $1 RETURNING ${REPLY_COLUMNS}`, [
    id,
    text,
  ]);
  if (!rows.length) return json({ error: "not found" }, 404);
  return json(toReply(rows[0]));
}

export async function DELETE(req: Request, ctx: Ctx) {
  const denied = await authorize(req);
  if (denied) return denied;

  const id = parseId((await ctx.params).id);
  if (!id) return json({ error: "bad request" }, 400);
  await db()`DELETE FROM replies WHERE id = ${id}`;
  return json({ ok: true });
}
