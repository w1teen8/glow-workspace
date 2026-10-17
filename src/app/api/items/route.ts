import { authorize, json } from "@/lib/api";
import { db } from "@/lib/db";
import { isSectionSlug } from "@/lib/sections";
import { ITEM_COLUMNS, toItem } from "@/lib/state";
import { LIMITS, cleanText } from "@/lib/validate";

// Принимает multipart/form-data: section, text и/или file.
export async function POST(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "bad form" }, 400);
  }

  const section = form.get("section");
  const rawText = form.get("text");
  const text = rawText ? cleanText(rawText, LIMITS.itemText) : null;
  const file = form.get("file");
  const hasFile = file instanceof File && file.size > 0;

  if (!isSectionSlug(section) || (rawText && !text) || (!text && !hasFile)) {
    return json({ error: "bad item" }, 400);
  }
  if (hasFile && file.size > LIMITS.fileBytes) {
    return json({ error: "Файл больше 4 МБ" }, 413);
  }

  const name = hasFile ? file.name.slice(0, 200) || "файл" : null;
  const mime = hasFile ? file.type || "application/octet-stream" : null;
  const data = hasFile ? Buffer.from(await file.arrayBuffer()).toString("base64") : null;

  const [row] = await db().query(
    `INSERT INTO items (section, text, file_name, mime, size, data)
     VALUES ($1, $2, $3, $4, $5, decode($6, 'base64'))
     RETURNING ${ITEM_COLUMNS}`,
    [section, text, name, mime, hasFile ? file.size : null, data],
  );
  return json(toItem(row), 201);
}
