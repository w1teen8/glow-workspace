import { authorize, json, readJson } from "@/lib/api";
import { db } from "@/lib/db";

const MAX_IDS = 500;

/** Новый порядок задач одного списка: { ids } — от первой к последней. */
export async function PUT(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;

  const body = await readJson(req);
  const ids = body?.ids;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > MAX_IDS ||
    !ids.every((id) => Number.isInteger(id) && id > 0) ||
    new Set(ids).size !== ids.length
  ) {
    return json({ error: "bad order" }, 400);
  }

  await db().query(
    `UPDATE tasks SET position = x.pos
     FROM unnest($1::int[]) WITH ORDINALITY AS x(id, pos)
     WHERE tasks.id = x.id`,
    [ids],
  );
  return json({ ok: true });
}
