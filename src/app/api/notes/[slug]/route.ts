import { authorize, json, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { isSectionSlug } from "@/lib/sections";
import { LIMITS } from "@/lib/validate";

export async function PUT(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const denied = await authorize(req);
  if (denied) return denied;

  const { slug } = await ctx.params;
  if (!isSectionSlug(slug)) return json({ error: "not found" }, 404);

  const body = await readJson(req);
  const note = body?.note;
  if (typeof note !== "string" || note.length > LIMITS.note) return json({ error: "bad note" }, 400);

  await db()`
    INSERT INTO sections (slug, note) VALUES (${slug}, ${note})
    ON CONFLICT (slug) DO UPDATE SET note = EXCLUDED.note, updated_at = now()
  `;
  return json({ ok: true });
}
