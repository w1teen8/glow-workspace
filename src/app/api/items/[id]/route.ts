import { authorize, json, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { LIMITS, parseId } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

// Удаление мягкое: сутки материал можно вернуть кнопкой «Вернуть», потом он стирается.
export async function DELETE(req: Request, ctx: Ctx) {
  const denied = await authorize(req);
  if (denied) return denied;

  const id = parseId((await ctx.params).id);
  if (!id) return json({ error: "bad request" }, 400);

  const sql = db();
  await sql.transaction([
    sql`UPDATE items SET deleted_at = now() WHERE id = ${id} AND deleted_at IS NULL`,
    sql`DELETE FROM items WHERE deleted_at < now() - interval '1 day'`,
  ]);
  return json({ ok: true });
}

/**
 * { text: "…" } — изменить текст блока (пустой текст разрешён только у блока с файлом);
 * { deleted: false } — вернуть удалённый блок.
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await authorize(req);
  if (denied) return denied;

  const id = parseId((await ctx.params).id);
  const body = await readJson(req);
  if (!id || !body) return json({ error: "bad request" }, 400);

  if (body.deleted === false) {
    const rows = await db()`UPDATE items SET deleted_at = NULL WHERE id = ${id} RETURNING id`;
    if (!rows.length) return json({ error: "not found" }, 404);
    return json({ ok: true });
  }

  if (typeof body.text !== "string" || body.text.length > LIMITS.itemText) {
    return json({ error: "bad request" }, 400);
  }
  const text = body.text.trim() || null;
  const rows = await db()`
    UPDATE items SET text = ${text}
    WHERE id = ${id} AND deleted_at IS NULL AND (${text}::text IS NOT NULL OR data IS NOT NULL)
    RETURNING id
  `;
  if (!rows.length) return json({ error: "not found" }, 404);
  return json({ ok: true });
}
