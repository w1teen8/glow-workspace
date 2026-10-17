import { randomBytes } from "node:crypto";
import { authorize, json, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { SECTIONS_MAX, SECTION_TITLE_MAX, splitEmoji } from "@/lib/sections";

/** { title: "🚀 Маркетинг" } — новый раздел в конце списка. */
export async function POST(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;

  const body = await readJson(req);
  const raw = typeof body?.title === "string" ? body.title : "";
  const { emoji, title } = splitEmoji(raw);
  if (!title || title.length > SECTION_TITLE_MAX) return json({ error: "bad title" }, 400);

  const sql = db();
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM sections`;
  if ((n as number) >= SECTIONS_MAX) return json({ error: "Разделов уже слишком много" }, 409);

  const slug = randomBytes(5).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "x");
  const [row] = await sql`
    INSERT INTO sections (slug, title, emoji, position)
    VALUES (${slug}, ${title}, ${emoji}, (SELECT COALESCE(max(position), -1) + 1 FROM sections))
    RETURNING slug, title, emoji
  `;
  return json(row, 201);
}
