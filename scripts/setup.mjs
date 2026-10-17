// Создаёт таблицы и общий аккаунт. Можно запускать повторно:
// существующие данные не трогаются, пароль аккаунта обновляется.
//   npm run setup
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const { DATABASE_URL, ADMIN_LOGIN, ADMIN_PASSWORD } = process.env;

if (!DATABASE_URL) fail("Не задан DATABASE_URL");
if (!ADMIN_LOGIN || !ADMIN_PASSWORD) fail("Не заданы ADMIN_LOGIN и ADMIN_PASSWORD");
if (ADMIN_PASSWORD.length < 10) fail("Пароль должен быть не короче 10 символов");

const sql = neon(DATABASE_URL);

const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
for (const statement of schema.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
  await sql.query(statement);
}
console.log("✓ таблицы");

// Стартовые разделы создаются один раз — пока в базе нет ни одного раздела с названием.
// Дальше разделы добавляются и удаляются в интерфейсе, и повторный setup их не возвращает.
const DEFAULT_SECTIONS = [
  ["concept", "💡", "Концепция"],
  ["mvp", "📋", "MVP"],
  ["stack", "🔗", "Стек"],
  ["research", "🎤", "Исследование"],
  ["ux", "💭", "UX/UI"],
  ["expenses", "💲", "Расходы"],
  ["motivation", "🔥", "Мотивация"],
  ["general", "#", "General"],
];
const [{ titled }] = await sql.query("SELECT count(*)::int AS titled FROM sections WHERE title IS NOT NULL");
if (titled === 0) {
  for (const [i, [slug, emoji, title]] of DEFAULT_SECTIONS.entries()) {
    await sql.query(
      `INSERT INTO sections (slug, title, emoji, position) VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, emoji = EXCLUDED.emoji, position = EXCLUDED.position`,
      [slug, title, emoji, i],
    );
  }
  console.log("✓ стартовые разделы");
}
// Служебные разделы личных вкладок: заметка и блоки Котика и Бусинки (PERSON_A / PERSON_B).
for (const who of ["a", "b"]) {
  await sql.query(
    "INSERT INTO sections (slug, title, position) VALUES ($1, $2, -1) ON CONFLICT (slug) DO NOTHING",
    [`person-${who}`, `Личное: ${who}`],
  );
}
await sql.query("DELETE FROM sections WHERE title IS NULL");
await sql.query("ALTER TABLE sections ALTER COLUMN title SET NOT NULL");

const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
await sql.query(
  `INSERT INTO users (login, password_hash) VALUES ($1, $2)
   ON CONFLICT (login) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
  [ADMIN_LOGIN, hash],
);
// Смена пароля завершает все старые сессии.
await sql.query(
  "DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE login = $1)",
  [ADMIN_LOGIN],
);
console.log(`✓ аккаунт «${ADMIN_LOGIN}»`);

function fail(message) {
  console.error(message);
  process.exit(1);
}
