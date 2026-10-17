import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "./db";

const COOKIE = "gw_session";
const SESSION_DAYS = 90;
const MAX_FAILURES = 10;
// Общий предел на все адреса: IP за прокси можно подделать, а этот предел — нет.
const MAX_FAILURES_TOTAL = 50;
const FAILURE_WINDOW_MINUTES = 15;

// Хэш для сравнения, когда логина нет: ответ занимает столько же времени, сколько при неверном пароле.
let dummyHash: string | null = null;
function getDummyHash() {
  dummyHash ??= bcrypt.hashSync(randomBytes(16).toString("hex"), 12);
  return dummyHash;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getSession(): Promise<{ userId: number } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db()`
    SELECT user_id FROM sessions
    WHERE token_hash = ${hashToken(token)} AND expires_at > now()
  `;
  return rows.length ? { userId: rows[0].user_id as number } : null;
}

export type LoginResult = "ok" | "invalid" | "locked";

export async function logIn(login: string, password: string, ip: string): Promise<LoginResult> {
  const sql = db();
  const [recent] = await sql`
    SELECT count(*) FILTER (WHERE ip = ${ip})::int AS mine, count(*)::int AS total
    FROM login_attempts
    WHERE at > now() - make_interval(mins => ${FAILURE_WINDOW_MINUTES})
  `;
  if ((recent.mine as number) >= MAX_FAILURES || (recent.total as number) >= MAX_FAILURES_TOTAL) {
    return "locked";
  }

  const [user] = await sql`SELECT id, password_hash FROM users WHERE login = ${login}`;
  const valid = await bcrypt.compare(password, (user?.password_hash as string) ?? getDummyHash());

  if (!user || !valid) {
    await sql.transaction([
      sql`INSERT INTO login_attempts (ip) VALUES (${ip})`,
      sql`DELETE FROM login_attempts WHERE at < now() - interval '1 day'`,
    ]);
    return "invalid";
  }

  const token = randomBytes(32).toString("base64url");
  await sql.transaction([
    sql`DELETE FROM login_attempts WHERE ip = ${ip}`,
    sql`DELETE FROM sessions WHERE expires_at < now()`,
    sql`
      INSERT INTO sessions (token_hash, user_id, expires_at)
      VALUES (${hashToken(token)}, ${user.id}, now() + make_interval(days => ${SESSION_DAYS}))
    `,
  ]);

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return "ok";
}

export async function logOut() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db()`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`;
  jar.delete(COOKIE);
}
