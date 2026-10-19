"use client";

import Link from "next/link";
import { useState } from "react";
import type { Owner } from "@/lib/types";
import { LIMITS } from "@/lib/validate";
import { TaskRow } from "./TaskRow";
import { useWorkspace } from "./WorkspaceProvider";

/**
 * Без assignee — все задачи. С assignee (null — «без исполнителя») — только его задачи.
 * addable — поле добавления (новая задача получает этого исполнителя); без него у личного
 * списка — подсказка, что задачи ставятся во вкладке «Задачи», а прочие пустые списки скрыты.
 */
export function TaskList({
  assignee,
  title = "Задачи",
  addable = assignee === undefined,
}: {
  assignee?: Owner | null;
  title?: string;
  addable?: boolean;
}) {
  const { state, addTask, reorderTasks } = useWorkspace();
  const [draft, setDraft] = useState("");
  const [showDone, setShowDone] = useState(false);

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

  return (
    <section className="block">
      {assignee !== undefined && (
        <h2>
          {title} <span className="count">{open.length}</span>
        </h2>
      )}
      <ul className="tasks">
        {open.map((task, i) => (
          <TaskRow
            key={task.id}
            task={task}
            number={i + 1}
            total={open.length}
            onMove={(n) => move(task.id, n)}
          />
        ))}
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

      {done.length > 0 && (
        <>
          <button className="done-toggle" aria-expanded={showDone} onClick={() => setShowDone(!showDone)}>
            {showDone ? "Скрыть выполненные" : `Выполнено · ${done.length}`}
          </button>
          {showDone && (
            <ul className="tasks">
              {done.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
