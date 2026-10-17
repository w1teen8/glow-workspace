import { logIn } from "@/lib/auth";
import { clientIp, isSameOrigin, json, readJson } from "@/lib/api";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json({ error: "forbidden" }, 403);

  const body = await readJson(req);
  const login = typeof body?.login === "string" ? body.login.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!login || !password || login.length > 100 || password.length > 200) {
    return json({ error: "Введите логин и пароль" }, 400);
  }

  const result = await logIn(login, password, clientIp(req));
  if (result === "locked") return json({ error: "Слишком много попыток. Подождите 15 минут." }, 429);
  if (result === "invalid") return json({ error: "Неверный логин или пароль" }, 401);
  return json({ ok: true });
}
