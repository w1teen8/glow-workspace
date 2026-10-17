CREATE TABLE IF NOT EXISTS users (
  id            serial PRIMARY KEY,
  login         text NOT NULL UNIQUE,
  password_hash text NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id    integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_attempts_ip_at ON login_attempts (ip, at);

CREATE TABLE IF NOT EXISTS sections (
  slug       text PRIMARY KEY,
  note       text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id         serial PRIMARY KEY,
  section    text NOT NULL,
  text       text NOT NULL,
  assignee   text CHECK (assignee IN ('a', 'b')),
  due        date,
  done       boolean NOT NULL DEFAULT false,
  done_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_section ON tasks (section);

-- Материалы раздела: текст или файл. Файлы лежат прямо в базе (до 4 МБ каждый),
-- чтобы не заводить отдельное хранилище и отдавать их только после входа.
CREATE TABLE IF NOT EXISTS items (
  id         serial PRIMARY KEY,
  section    text NOT NULL,
  text       text,
  file_name  text,
  mime       text,
  size       integer,
  data       bytea,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (text IS NOT NULL OR data IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS items_section ON items (section);

CREATE TABLE IF NOT EXISTS chat_messages (
  id         serial PRIMARY KEY,
  role       text NOT NULL CHECK (role IN ('user', 'assistant')),
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
