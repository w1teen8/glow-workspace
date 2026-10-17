import { authorize, json, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { parseId } from "@/lib/validate";

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

/** { deleted: false } — вернуть удалённый материал. */
export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await authorize(req);
  if (denied) return denied;

  const id = parseId((await ctx.params).id);
  const body = await readJson(req);
  if (!id || body?.deleted !== false) return json({ error: "bad request" }, 400);

  const rows = await db()`UPDATE items SET deleted_at = NULL WHERE id = ${id} RETURNING id`;
  if (!rows.length) return json({ error: "not found" }, 404);
  return json({ ok: true });
}
