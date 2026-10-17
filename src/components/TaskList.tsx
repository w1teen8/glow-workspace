"use client";

import Link from "next/link";
import { useState } from "react";
import type { Assignee } from "@/lib/types";
import { LIMITS } from "@/lib/validate";
import { TaskRow } from "./TaskRow";
import { useWorkspace } from "./WorkspaceProvider";

/**
 * Без assignee — общий список с полем добавления (вкладка «Задачи»).
 * С assignee — только задачи этого человека; новые ставятся во вкладке «Задачи».
 */
export function TaskList({ assignee }: { assignee?: Assignee }) {
  const { state, addTask } = useWorkspace();
  const [draft, setDraft] = useState("");
  const [showDone, setShowDone] = useState(false);

  const tasks = assignee ? state.tasks.filter((t) => t.assignee === assignee) : state.tasks;
  const open = tasks.filter((t) => !t.done);
  const done = tasks
    .filter((t) => t.done)
    .sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));

  return (
    <section className="block">
      {assignee && <h2>Задачи</h2>}
      <ul className="tasks">
        {open.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </ul>

      {assignee ? (
        <p className="small muted tasks-hint">
          {open.length === 0 && "Открытых задач нет. "}
          Новые задачи ставятся во вкладке{" "}
          <Link href="/tasks" className="link">
            «Задачи»
          </Link>
          .
        </p>
      ) : (
        <input
          className="add-task"
          value={draft}
          maxLength={LIMITS.taskText}
          placeholder="Добавить задачу…"
          aria-label="Новая задача"
          enterKeyHint="done"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
            const text = draft.trim();
            if (text) addTask(text);
            setDraft("");
          }}
        />
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
