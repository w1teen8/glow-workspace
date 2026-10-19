"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Section } from "@/lib/sections";
import type { Item, Owner, Reply, Task, WorkspaceState } from "@/lib/types";

export const POLL_MS = 5000;

type TaskPatch = Partial<Pick<Task, "text" | "assignee" | "due" | "done">>;

type Workspace = {
  state: WorkspaceState;
  addTask: (text: string, assignee?: Owner | null) => void;
  updateTask: (id: number, patch: TaskPatch) => void;
  deleteTask: (task: Task) => void;
  reorderTasks: (ids: number[]) => void;
  addReply: (taskId: number, text: string) => void;
  updateReply: (id: number, text: string) => void;
  deleteReply: (reply: Reply) => void;
  saveNote: (section: string, note: string) => Promise<boolean>;
  addItem: (section: string, content: { text?: string; file?: File }) => Promise<boolean>;
  updateItem: (id: number, text: string) => Promise<boolean>;
  deleteItem: (item: Item) => void;
  addSection: (title: string) => Promise<Section | null>;
  deleteSection: (slug: string) => Promise<boolean>;
  notify: (text: string) => void;
};

const WorkspaceContext = createContext<Workspace | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace outside WorkspaceProvider");
  return ctx;
}

/** Вызывает fn сразу, когда вкладка становится видимой, и дальше раз в interval — пока она видима. */
export function useVisiblePolling(fn: () => void, interval: number) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(timer);
      if (document.visibilityState === "visible") {
        timer = setInterval(() => fnRef.current(), interval);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") fnRef.current();
      start();
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [interval]);
}

async function send(url: string, method: string, body?: unknown) {
  const isForm = body instanceof FormData;
  const res = await fetch(url, {
    method,
    headers: body === undefined || isForm ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  if (res.status === 401) window.location.href = "/login";
  if (!res.ok) throw new Error(`${method} ${url}: ${res.status}`);
  return res;
}

export function WorkspaceProvider({
  initial,
  children,
}: {
  initial: WorkspaceState;
  children: React.ReactNode;
}) {
  const [state, setState] = useState(initial);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);

  // Пока идут свои изменения, ответы опроса могут быть устаревшими —
  // такие ответы отбрасываются, а после изменения состояние перечитывается.
  const pending = useRef(0);
  const epoch = useRef(0);
  const tempId = useRef(-1);

  const refresh = useCallback(async () => {
    const started = epoch.current;
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) return;
      const next: WorkspaceState = await res.json();
      if (pending.current === 0 && epoch.current === started) setState(next);
    } catch {
      // сеть пропала — попробуем на следующем шаге опроса
    }
  }, []);

  useVisiblePolling(refresh, POLL_MS);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const mutate = useCallback(
    async (optimistic: (s: WorkspaceState) => WorkspaceState, request: () => Promise<unknown>) => {
      epoch.current++;
      pending.current++;
      setState(optimistic);
      let ok = true;
      try {
        await request();
      } catch {
        ok = false;
        setToast({ text: "Не удалось сохранить. Проверь соединение." });
      } finally {
        pending.current--;
        epoch.current++;
        void refresh();
      }
      return ok;
    },
    [refresh],
  );

  const createTask = useCallback(
    (fields: Pick<Task, "text" | "assignee" | "due" | "done">) => {
      const id = tempId.current--;
      const now = new Date().toISOString();
      const draft: Task = { ...fields, id, position: 0, doneAt: fields.done ? now : null, createdAt: now };
      void mutate(
        (s) => {
          // новая задача — в конец списка, как и на сервере
          const position = Math.max(0, ...s.tasks.map((t) => t.position)) + 1;
          return { ...s, tasks: [...s.tasks, { ...draft, position }] };
        },
        async () => {
          const created: Task = await (await send("/api/tasks", "POST", fields)).json();
          setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? created : t)) }));
        },
      );
    },
    [mutate],
  );

  const createReply = useCallback(
    (taskId: number, text: string) => {
      const id = tempId.current--;
      const draft: Reply = { id, taskId, text, createdAt: new Date().toISOString() };
      void mutate(
        (s) => ({ ...s, replies: [...s.replies, draft] }),
        async () => {
          const created: Reply = await (await send(`/api/tasks/${taskId}/replies`, "POST", { text })).json();
          setState((s) => ({ ...s, replies: s.replies.map((r) => (r.id === id ? created : r)) }));
        },
      );
    },
    [mutate],
  );

  const value: Workspace = {
    state,

    addTask: (text, assignee = null) => createTask({ text, assignee, due: null, done: false }),

    updateTask: (id, patch) => {
      if (id < 0) return;
      void mutate(
        (s) => ({
          ...s,
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  ...patch,
                  doneAt: patch.done === undefined ? t.doneAt : patch.done ? new Date().toISOString() : null,
                }
              : t,
          ),
        }),
        () => send(`/api/tasks/${id}`, "PATCH", patch),
      );
    },

    deleteTask: (task) => {
      if (task.id < 0) return;
      void mutate(
        (s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== task.id) }),
        () => send(`/api/tasks/${task.id}`, "DELETE"),
      ).then((ok) => {
        if (!ok) return;
        setToast({
          text: "Задача удалена",
          undo: () => {
            setToast(null);
            void mutate(
              (s) => ({ ...s, tasks: [...s.tasks, task].sort((a, b) => a.id - b.id) }),
              () => send(`/api/tasks/${task.id}`, "PATCH", { deleted: false }),
            );
          },
        });
      });
    },

    reorderTasks: (ids) => {
      if (ids.some((id) => id < 0)) return;
      const order = new Map(ids.map((id, i) => [id, i + 1]));
      void mutate(
        (s) => ({ ...s, tasks: s.tasks.map((t) => (order.has(t.id) ? { ...t, position: order.get(t.id)! } : t)) }),
        () => send("/api/tasks/order", "PUT", { ids }),
      );
    },

    addReply: (taskId, text) => {
      if (taskId > 0) createReply(taskId, text);
    },

    updateReply: (id, text) => {
      if (id < 0) return;
      void mutate(
        (s) => ({ ...s, replies: s.replies.map((r) => (r.id === id ? { ...r, text } : r)) }),
        () => send(`/api/replies/${id}`, "PATCH", { text }),
      );
    },

    deleteReply: (reply) => {
      if (reply.id < 0) return;
      void mutate(
        (s) => ({ ...s, replies: s.replies.filter((r) => r.id !== reply.id) }),
        () => send(`/api/replies/${reply.id}`, "DELETE"),
      ).then((ok) => {
        if (!ok) return;
        setToast({
          text: "Ответ удалён",
          undo: () => {
            setToast(null);
            createReply(reply.taskId, reply.text);
          },
        });
      });
    },

    saveNote: (section, note) =>
      mutate(
        (s) => ({ ...s, notes: { ...s.notes, [section]: note } }),
        () => send(`/api/notes/${section}`, "PUT", { note }),
      ),

    addItem: (section, { text, file }) => {
      const form = new FormData();
      form.set("section", section);
      if (text) form.set("text", text);
      if (file) form.set("file", file);
      return mutate(
        (s) => s,
        async () => {
          const created: Item = await (await send("/api/items", "POST", form)).json();
          setState((s) => ({ ...s, items: [...s.items, created] }));
        },
      );
    },

    updateItem: (id, text) =>
      mutate(
        (s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, text: text.trim() || null } : i)) }),
        () => send(`/api/items/${id}`, "PATCH", { text }),
      ),

    deleteItem: (item) => {
      void mutate(
        (s) => ({ ...s, items: s.items.filter((i) => i.id !== item.id) }),
        () => send(`/api/items/${item.id}`, "DELETE"),
      ).then((ok) => {
        if (!ok) return;
        setToast({
          text: item.file ? "Файл удалён" : "Блок удалён",
          undo: () => {
            setToast(null);
            void mutate(
              (s) => ({ ...s, items: [...s.items, item].sort((a, b) => a.id - b.id) }),
              () => send(`/api/items/${item.id}`, "PATCH", { deleted: false }),
            );
          },
        });
      });
    },

    addSection: async (title) => {
      let created: Section | null = null;
      await mutate(
        (s) => s,
        async () => {
          created = await (await send("/api/sections", "POST", { title })).json();
          setState((s) => ({ ...s, sections: [...s.sections, created!], notes: { ...s.notes, [created!.slug]: "" } }));
        },
      );
      return created;
    },

    deleteSection: (slug) =>
      mutate(
        (s) => ({
          ...s,
          sections: s.sections.filter((x) => x.slug !== slug),
          items: s.items.filter((i) => i.section !== slug),
        }),
        () => send(`/api/sections/${slug}`, "DELETE"),
      ),

    notify: (text) => setToast({ text }),
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          {toast.undo && <button onClick={toast.undo}>Вернуть</button>}
        </div>
      )}
    </WorkspaceContext.Provider>
  );
}
