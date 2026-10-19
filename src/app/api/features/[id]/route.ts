import { authorize, json, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { FEATURE_COLUMNS, toFeature } from "@/lib/state";
import { LIMITS, cleanText, parseDecision, parseId, parseVote } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Каждое поле необязательно: { title, note, voteA, voteB, decision }.
 * { deleted: false } — вернуть удалённого кандидата.
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await authorize(req);
  if (denied) return denied;

  const id = parseId((await ctx.params).id);
  const body = await readJson(req);
  if (!id || !body) return json({ error: "bad request" }, 400);

  if (body.deleted === false) {
    const rows = await db().query(
      `UPDATE features SET deleted_at = NULL WHERE id = $1 RETURNING ${FEATURE_COLUMNS}`,
      [id],
    );
    if (!rows.length) return json({ error: "not found" }, 404);
    return json(toFeature(rows[0]));
  }

  const has = (key: string) => Object.hasOwn(body, key);
  const title = has("title") ? cleanText(body.title, LIMITS.featureTitle) : null;
  const note = has("note") ? body.note : null;
  const voteA = has("voteA") ? parseVote(body.voteA) : null;
  const voteB = has("voteB") ? parseVote(body.voteB) : null;
  const decision = has("decision") ? parseDecision(body.decision) : null;
  if (
    (has("title") && !title) ||
    (has("note") && (typeof note !== "string" || note.length > LIMITS.featureNote)) ||
    voteA === undefined ||
    voteB === undefined ||
    decision === undefined
  ) {
    return json({ error: "bad feature" }, 400);
  }

  const rows = await db().query(
    `UPDATE features SET
       title    = COALESCE($2, title),
       note     = COALESCE($3, note),
       vote_a   = CASE WHEN $4 THEN $5 ELSE vote_a END,
       vote_b   = CASE WHEN $6 THEN $7 ELSE vote_b END,
       decision = CASE WHEN $8 THEN $9 ELSE decision END
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING ${FEATURE_COLUMNS}`,
    [
      id,
      title,
      typeof note === "string" ? note.trim() : null,
      has("voteA"),
      voteA,
      has("voteB"),
      voteB,
      has("decision"),
      decision,
    ],
  );
  if (!rows.length) return json({ error: "not found" }, 404);
  return json(toFeature(rows[0]));
}

// Удаление мягкое: сутки кандидата можно вернуть кнопкой «Вернуть», потом он стирается.
export async function DELETE(req: Request, ctx: Ctx) {
  const denied = await authorize(req);
  if (denied) return denied;

  const id = parseId((await ctx.params).id);
  if (!id) return json({ error: "bad request" }, 400);

  const sql = db();
  await sql.transaction([
    sql`UPDATE features SET deleted_at = now() WHERE id = ${id} AND deleted_at IS NULL`,
    sql`DELETE FROM features WHERE deleted_at < now() - interval '1 day'`,
  ]);
  return json({ ok: true });
}
