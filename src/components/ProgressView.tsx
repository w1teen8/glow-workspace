"use client";

import Link from "next/link";
import { daysFromToday, formatDue } from "@/lib/dates";
import { SECTIONS, getSection } from "@/lib/sections";
import { useWorkspace } from "./WorkspaceProvider";

const DEADLINES_SHOWN = 7;

export function ProgressView() {
  const { state } = useWorkspace();

  const deadlines = state.tasks
    .filter((t) => !t.done && t.due)
    .sort((a, b) => a.due!.localeCompare(b.due!))
    .slice(0, DEADLINES_SHOWN);

  return (
    <div className="overview">
      <section>
        <h1>Прогресс</h1>
        <ul className="progress-list">
          {SECTIONS.map((section) => {
            const tasks = state.tasks.filter((t) => t.section === section.slug);
            const done = tasks.filter((t) => t.done).length;
            const share = tasks.length ? done / tasks.length : 0;
            return (
              <li key={section.slug}>
                <Link href={`/s/${section.slug}`} className="progress-row">
                  <span aria-hidden>{section.emoji}</span>
                  <span className="progress-title">{section.title}</span>
                  <span className="progress-count">{tasks.length ? `${done} из ${tasks.length}` : "нет задач"}</span>
                  <span className="bar" aria-hidden>
                    <span className="bar-fill" style={{ width: `${share * 100}%`, display: "block" }} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="deadlines-title">Ближайшие сроки</h2>
        {deadlines.length === 0 ? (
          <p className="muted">Сроков пока нет. Их можно поставить у любой задачи.</p>
        ) : (
          <ul className="deadline-list">
            {deadlines.map((task) => {
              const section = getSection(task.section)!;
              const owner = task.assignee ? state.people[task.assignee] : null;
              return (
                <li key={task.id}>
                  <Link href={`/s/${task.section}`} className="deadline">
                    <span className="deadline-date" data-overdue={daysFromToday(task.due!) < 0}>
                      {formatDue(task.due!)}
                    </span>
                    <span>
                      {task.text}
                      <span className="deadline-meta">
                        {section.title}
                        {owner && ` · ${owner}`}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
