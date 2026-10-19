"use client";

import Link from "next/link";
import { useState } from "react";
import { daysFromToday, formatDue } from "@/lib/dates";
import { BOTH_LABEL, type Task } from "@/lib/types";
import { useWorkspace } from "./WorkspaceProvider";

const DEADLINES_SHOWN = 7;

function Row({ label, tasks }: { label: string; tasks: Task[] }) {
  const done = tasks.filter((t) => t.done).length;
  const share = tasks.length ? done / tasks.length : 0;
  return (
    <li>
      <Link href="/tasks" className="progress-row">
        <span className="progress-title">{label}</span>
        <span className="progress-count">{tasks.length ? `${done} из ${tasks.length}` : "нет задач"}</span>
        <span className="bar" aria-hidden>
          <span className="bar-fill" style={{ width: `${share * 100}%`, display: "block" }} />
        </span>
      </Link>
    </li>
  );
}

export function ProgressView() {
  const { state, updateTask } = useWorkspace();
  const { tasks, people } = state;

  const unassigned = tasks.filter((t) => !t.assignee);
  const doneCount = tasks.filter((t) => t.done).length;
  const percent = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const deadlines = tasks
    .filter((t) => !t.done && t.due)
    .sort((a, b) => a.due!.localeCompare(b.due!))
    .slice(0, DEADLINES_SHOWN);

  return (
    <div className="overview">
      <section>
        <h1>Прогресс</h1>
        <Link href="/tasks" className="stat">
          <span className="stat-value">{percent}%</span>
          <span className="stat-label">
            {tasks.length ? `задач выполнено · ${doneCount} из ${tasks.length}` : "задач пока нет"}
          </span>
          <span className="bar bar-big" aria-hidden>
            <span className="bar-fill" style={{ width: `${percent}%`, display: "block" }} />
          </span>
        </Link>
        <ul className="progress-list">
          <Row label={people.a} tasks={tasks.filter((t) => t.assignee === "a")} />
          <Row label={people.b} tasks={tasks.filter((t) => t.assignee === "b")} />
          <Row label={BOTH_LABEL} tasks={tasks.filter((t) => t.assignee === "both")} />
          {unassigned.length > 0 && <Row label="Без исполнителя" tasks={unassigned} />}
        </ul>
      </section>

      <section>
        <h2 className="deadlines-title">Ближайшие сроки</h2>
        {deadlines.length === 0 ? (
          <p className="muted">Сроков пока нет.</p>
        ) : (
          <ul className="deadline-list">
            {deadlines.map((task) => {
              const owner =
                task.assignee === "both" ? BOTH_LABEL : task.assignee ? people[task.assignee] : null;
              return (
                <li key={task.id}>
                  <Link href="/tasks" className="deadline">
                    <span className="deadline-date" data-overdue={daysFromToday(task.due!) < 0}>
                      {formatDue(task.due!)}
                    </span>
                    <span>
                      {task.text}
                      {owner && <span className="deadline-meta">{owner}</span>}
                    </span>
                  </Link>
                  <button
                    className="deadline-clear"
                    aria-label={`Убрать срок у задачи «${task.text}»`}
                    title="Убрать срок"
                    onClick={() => updateTask(task.id, { due: null })}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <AddDeadline />
      </section>
    </div>
  );
}

/** «+ Добавить срок»: выбрать открытую задачу без срока и дату. */
function AddDeadline() {
  const { state, updateTask } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState("");
  const [due, setDue] = useState("");

  const candidates = state.tasks.filter((t) => !t.done && !t.due && t.id > 0);

  if (!open) {
    return (
      <button className="add-deadline" onClick={() => setOpen(true)} disabled={candidates.length === 0}>
        {candidates.length ? "+ Добавить срок" : "У всех открытых задач уже есть срок"}
      </button>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!taskId || !due) return;
    updateTask(Number(taskId), { due });
    setTaskId("");
    setDue("");
    setOpen(false);
  }

  return (
    <form className="deadline-form" onSubmit={submit}>
      <select
        className="field"
        value={taskId}
        onChange={(e) => setTaskId(e.target.value)}
        aria-label="Задача"
        autoFocus
        required
      >
        <option value="" disabled>
          Выберите задачу…
        </option>
        {candidates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.text}
          </option>
        ))}
      </select>
      <input
        className="field"
        type="date"
        value={due}
        onChange={(e) => setDue(e.target.value)}
        aria-label="Срок"
        required
      />
      <div className="deadline-form-actions">
        <button type="button" className="attach" onClick={() => setOpen(false)}>
          Отмена
        </button>
        <button className="button button-small" disabled={!taskId || !due}>
          Добавить
        </button>
      </div>
    </form>
  );
}
