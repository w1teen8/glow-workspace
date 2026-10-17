import { authorize, json } from "@/lib/api";
import { db } from "@/lib/db";

/** Удаляет раздел вместе с его блоками и файлами. */
export async function DELETE(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const denied = await authorize(req);
  if (denied) return denied;

  const { slug } = await ctx.params;
  const sql = db();
  const [, deleted] = await sql.transaction([
    sql`DELETE FROM items WHERE section = ${slug}`,
    sql`DELETE FROM sections WHERE slug = ${slug} RETURNING slug`,
  ]);
  if (!deleted.length) return json({ error: "not found" }, 404);
  return json({ ok: true });
}
