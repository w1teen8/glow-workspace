"use client";

import Link from "next/link";
import { useState } from "react";
import type { Owner } from "@/lib/types";
import { LIMITS } from "@/lib/validate";
import { TaskRow } from "./TaskRow";
import { normalizeSearch } from "./TaskSearch";
import { useWorkspace } from "./WorkspaceProvider";

/** Сколько открытых задач видно сразу; остальные — по кнопке «Дальше». */
const VISIBLE_TASKS = 15;

/**
 * Без assignee — все задачи. С assignee (null — «без исполнителя») — только его задачи.
 * addable — поле добавления (новая задача получает этого исполнителя); без него у личного
 * списка — подсказка, что задачи ставятся во вкладке «Задачи», а прочие пустые списки скрыты.
 * query — поиск по ключевым словам: остаются задачи, где все слова есть в тексте задачи или её ответах.
 */
export function TaskList({
  assignee,
  title = "Задачи",
  addable = assignee === undefined,
  query = "",
}: {
  assignee?: Owner | null;
  title?: string;
  addable?: boolean;
  query?: string;
}) {
  const { state, addTask, reorderTasks } = useWorkspace();
  const [draft, setDraft] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const tasks = assignee === undefined ? state.tasks : state.tasks.filter((t) => t.assignee === assignee);
  const open = tasks.filter((t) => !t.done).sort((a, b) => a.position - b.position || a.id - b.id);

  /** Поставить задачу на место number (1 — первая) внутри этого списка. */
  function move(id: number, number: number) {
    const ids = open.map((t) => t.id).filter((x) => x !== id);
    ids.splice(Math.min(Math.max(number, 1), ids.length + 1) - 1, 0, id);
    reorderTasks(ids);
  }
  const done = tasks
    .filter((t) => t.done)
    .sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));

  const personal = assignee === "a" || assignee === "b";
  if (!addable && !personal && tasks.length === 0) return null;

  // Поиск: каждое слово запроса должно встретиться в тексте задачи или её ответов.
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  const searching = words.length > 0;
  const matches = (id: number, text: string) => {
    const haystack = normalizeSearch(
      [text, ...state.replies.filter((r) => r.taskId === id).map((r) => r.text)].join(" "),
    );
    return words.every((w) => haystack.includes(w));
  };
  // Номер задачи — её место в полном списке, даже когда часть скрыта поиском или «Дальше».
  const numbered = open.map((task, i) => ({ task, number: i + 1 }));
  const shownOpen = searching
    ? numbered.filter(({ task }) => matches(task.id, task.text))
    : showAll
      ? numbered
      : numbered.slice(0, VISIBLE_TASKS);
  const shownDone = searching ? done.filter((t) => matches(t.id, t.text)) : done;
  if (searching && !addable && !personal && shownOpen.length + shownDone.length === 0) return null;

  return (
    <section className="block">
      {assignee !== undefined && (
        <h2>
          {title}{" "}
          <span className="count">{searching ? `${shownOpen.length} из ${open.length}` : open.length}</span>
        </h2>
      )}
      {searching && shownOpen.length + shownDone.length === 0 && (
        <p className="small muted tasks-empty">Ничего не найдено</p>
      )}
      <ul className="tasks">
        {shownOpen.map(({ task, number }) => (
          <TaskRow
            key={task.id}
            task={task}
            number={number}
            total={open.length}
            onMove={(n) => move(task.id, n)}
          />
        ))}
        {!searching && open.length > VISIBLE_TASKS && (
          <li className="task-more">
            <button aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
              {showAll ? "Свернуть" : `Дальше · ещё ${open.length - VISIBLE_TASKS}`}
            </button>
          </li>
        )}
      </ul>

      {addable ? (
        <input
          className="add-task"
          value={draft}
          maxLength={LIMITS.taskText}
          placeholder="Добавить задачу…"
          aria-label={assignee === undefined ? "Новая задача" : `Новая задача: ${title}`}
          enterKeyHint="done"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
            const text = draft.trim();
            if (text) addTask(text, assignee ?? null);
            setDraft("");
          }}
        />
      ) : (
        personal && (
          <p className="small muted tasks-hint">
            {open.length === 0 && "Открытых задач нет. "}
            Новые задачи ставятся во вкладке{" "}
            <Link href="/tasks" className="link">
              «Задачи»
            </Link>
            .
          </p>
        )
      )}

      {shownDone.length > 0 && (
        <>
          <button className="done-toggle" aria-expanded={showDone} onClick={() => setShowDone(!showDone)}>
            {showDone ? "Скрыть выполненные" : `Выполнено · ${shownDone.length}`}
          </button>
          {showDone && (
            <ul className="tasks">
              {shownDone.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
