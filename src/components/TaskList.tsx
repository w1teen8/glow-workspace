"use client";

import { useState } from "react";
import type { SectionSlug } from "@/lib/sections";
import { LIMITS } from "@/lib/validate";
import { TaskRow } from "./TaskRow";
import { useWorkspace } from "./WorkspaceProvider";

export function TaskList({ section }: { section: SectionSlug }) {
  const { state, addTask } = useWorkspace();
  const [draft, setDraft] = useState("");
  const [showDone, setShowDone] = useState(false);

  const tasks = state.tasks.filter((t) => t.section === section);
  const open = tasks.filter((t) => !t.done);
  const done = tasks
    .filter((t) => t.done)
    .sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));

  return (
    <section className="block">
      <h2>Задачи</h2>
      <ul className="tasks">
        {open.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </ul>

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
          if (text) addTask(section, text);
          setDraft("");
        }}
      />

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
