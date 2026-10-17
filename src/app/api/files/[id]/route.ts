import { authorize, json } from "@/lib/api";
import { db } from "@/lib/db";
import { INLINE_MIME, parseId } from "@/lib/validate";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await authorize(req);
  if (denied) return denied;

  const id = parseId((await ctx.params).id);
  if (!id) return json({ error: "bad request" }, 400);

  const [row] = await db()`
    SELECT file_name, mime, encode(data, 'base64') AS data
    FROM items WHERE id = ${id} AND data IS NOT NULL AND deleted_at IS NULL
  `;
  if (!row) return json({ error: "not found" }, 404);

  const name = row.file_name as string;
  const inline = INLINE_MIME.includes(row.mime as string);
  const asciiName = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const disposition = `${inline ? "inline" : "attachment"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`;

  return new Response(Buffer.from(row.data as string, "base64"), {
    headers: {
      // Чужие форматы отдаются как «просто байты», чтобы браузер ничего не исполнял.
      "Content-Type": inline ? (row.mime as string) : "application/octet-stream",
      "Content-Disposition": disposition,
      "Content-Security-Policy": "default-src 'none'; sandbox",
      // Файл после загрузки не меняется — кэшируем в браузере, но не на общих прокси.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
