"use client";

import { useRef, useState } from "react";
import { daysFromToday, formatDue } from "@/lib/dates";
import type { Assignee, Task } from "@/lib/types";
import { LIMITS } from "@/lib/validate";
import { useWorkspace } from "./WorkspaceProvider";

export function TaskRow({ task }: { task: Task }) {
  const { state, updateTask, deleteTask } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const dateInput = useRef<HTMLInputElement>(null);
  const pending = task.id < 0;

  function finishEdit(input: HTMLInputElement, save: boolean) {
    const text = input.value.trim();
    if (save && text && text !== task.text) updateTask(task.id, { text });
    setEditing(false);
  }

  function openDatePicker() {
    const input = dateInput.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
      input.click();
    }
  }

  const overdue = !task.done && task.due !== null && daysFromToday(task.due) < 0;

  return (
    <li className="task" data-done={task.done} data-pending={pending}>
      <label className="check-hit">
        <input
          type="checkbox"
          className="check"
          checked={task.done}
          aria-label={task.done ? "Вернуть в работу" : "Отметить выполненной"}
          onChange={(e) => updateTask(task.id, { done: e.target.checked })}
        />
      </label>

      {editing ? (
        <input
          className="task-edit"
          defaultValue={task.text}
          maxLength={LIMITS.taskText}
          autoFocus
          enterKeyHint="done"
          aria-label="Текст задачи"
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter") finishEdit(e.currentTarget, true);
            if (e.key === "Escape") finishEdit(e.currentTarget, false);
          }}
          onBlur={(e) => finishEdit(e.currentTarget, true)}
        />
      ) : (
        <span
          className="task-text"
          role="button"
          tabIndex={0}
          title="Изменить"
          onClick={() => setEditing(true)}
          onKeyDown={(e) => e.key === "Enter" && setEditing(true)}
        >
          {task.text}
        </span>
      )}

      <div className="task-meta">
        <select
          className="meta-select"
          value={task.assignee ?? ""}
          data-empty={!task.assignee}
          aria-label="Исполнитель"
          onChange={(e) => updateTask(task.id, { assignee: (e.target.value || null) as Assignee | null })}
        >
          <option value="">кто?</option>
          <option value="a">{state.people.a}</option>
          <option value="b">{state.people.b}</option>
        </select>

        <span className="due">
          <button
            className="meta-button"
            data-empty={!task.due}
            data-overdue={overdue}
            aria-label={task.due ? `Срок: ${formatDue(task.due)}. Изменить` : "Поставить срок"}
            onClick={openDatePicker}
          >
            {task.due ? formatDue(task.due) : "срок"}
          </button>
          <input
            ref={dateInput}
            type="date"
            tabIndex={-1}
            aria-hidden
            value={task.due ?? ""}
            onChange={(e) => updateTask(task.id, { due: e.target.value || null })}
          />
          {task.due && (
            <button
              className="due-clear"
              aria-label="Убрать срок"
              title="Убрать срок"
              onClick={() => updateTask(task.id, { due: null })}
            >
              ×
            </button>
          )}
        </span>

        <button className="delete" aria-label="Удалить задачу" title="Удалить" onClick={() => deleteTask(task)}>
          ×
        </button>
      </div>
    </li>
  );
}
