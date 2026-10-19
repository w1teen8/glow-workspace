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
  title      text NOT NULL,
  emoji      text NOT NULL DEFAULT '',
  position   integer NOT NULL DEFAULT 0,
  note       text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Для баз, созданных до того, как разделы стали редактируемыми.
-- setup.mjs заполняет title и делает его обязательным.
ALTER TABLE sections ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS emoji text NOT NULL DEFAULT '';
ALTER TABLE sections ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS tasks (
  id         serial PRIMARY KEY,
  text       text NOT NULL,
  assignee   text CHECK (assignee IN ('a', 'b', 'both')),
  due        date,
  done       boolean NOT NULL DEFAULT false,
  done_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Задачи общие, без привязки к разделу: живут только во вкладке «Задачи».
ALTER TABLE tasks DROP COLUMN IF EXISTS section;

-- «Вдвоём» — третий вариант исполнителя.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_assignee_check CHECK (assignee IN ('a', 'b', 'both'));

-- Удаление задачи мягкое: сутки её можно вернуть вместе с ответами, потом она стирается.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Ответы под задачей: решение, ссылки, уточнения.
CREATE TABLE IF NOT EXISTS replies (
  id         serial PRIMARY KEY,
  task_id    integer NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS replies_task_id_idx ON replies (task_id);

-- Блоки раздела: текст и/или файл. Файлы лежат прямо в базе (до 4 МБ каждый),
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

-- Таблица бывшего раздела «Решаем MVP» (раздел убран).
DROP TABLE IF EXISTS features;

-- Порядок задач внутри списка («что за чем»): меньше — раньше. Нумерация в интерфейсе — по нему.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;
