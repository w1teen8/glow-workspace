"use client";

import { TaskList } from "./TaskList";
import { useWorkspace } from "./WorkspaceProvider";

/** Вкладка «Задачи»: колонка на каждого человека, под ними — задачи без исполнителя. */
export function TaskBoard() {
  const { state } = useWorkspace();
  return (
    <>
      <div className="task-board">
        <TaskList assignee="b" title={state.people.b} addable />
        <TaskList assignee="a" title={state.people.a} addable />
      </div>
      <TaskList assignee={null} title="Общие" addable />
    </>
  );
}
