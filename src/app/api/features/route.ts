import { authorize, json, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { FEATURE_COLUMNS, toFeature } from "@/lib/state";
import { LIMITS, cleanText } from "@/lib/validate";

/** Новый кандидат в MVP: { title }. */
export async function POST(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;

  const body = await readJson(req);
  const title = cleanText(body?.title, LIMITS.featureTitle);
  if (!title) return json({ error: "bad feature" }, 400);

  const [row] = await db().query(`INSERT INTO features (title) VALUES ($1) RETURNING ${FEATURE_COLUMNS}`, [title]);
  return json(toFeature(row), 201);
}
