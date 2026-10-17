"use client";

import Link from "next/link";
import { daysFromToday, formatDue } from "@/lib/dates";
import type { Task } from "@/lib/types";
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
          {unassigned.length > 0 && <Row label="Без исполнителя" tasks={unassigned} />}
        </ul>
      </section>

      <section>
        <h2 className="deadlines-title">Ближайшие сроки</h2>
        {deadlines.length === 0 ? (
          <p className="muted">Сроков пока нет. Их можно поставить у любой задачи.</p>
        ) : (
          <ul className="deadline-list">
            {deadlines.map((task) => {
              const owner = task.assignee ? people[task.assignee] : null;
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
      </section>
    </div>
  );
}
