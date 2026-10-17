import { authorize, json, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { LIMITS } from "@/lib/validate";

export async function PUT(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const denied = await authorize(req);
  if (denied) return denied;

  const { slug } = await ctx.params;
  const body = await readJson(req);
  const note = body?.note;
  if (typeof note !== "string" || note.length > LIMITS.note) return json({ error: "bad note" }, 400);

  const rows = await db()`
    UPDATE sections SET note = ${note}, updated_at = now() WHERE slug = ${slug} RETURNING slug
  `;
  if (!rows.length) return json({ error: "not found" }, 404);
  return json({ ok: true });
}
