import { getSession } from "./auth";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

// Запросы, меняющие данные, принимаются только со своего сайта (защита от CSRF
// в дополнение к SameSite=Lax у cookie).
export function isSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Возвращает готовый ответ с ошибкой, если запрос нельзя пускать дальше. */
export async function authorize(req: Request): Promise<Response | null> {
  if (req.method !== "GET" && !isSameOrigin(req)) return json({ error: "forbidden" }, 403);
  if (!(await getSession())) return json({ error: "unauthorized" }, 401);
  return null;
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}
