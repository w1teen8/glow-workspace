"use client";

import { BOTH_LABEL } from "@/lib/types";
import { TaskList } from "./TaskList";
import { useWorkspace } from "./WorkspaceProvider";

/** Вкладка «Задачи»: колонка на каждого человека, под ними — общие задачи и задачи без исполнителя. */
export function TaskBoard() {
  const { state } = useWorkspace();
  return (
    <>
      <div className="task-board">
        <TaskList assignee="b" title={state.people.b} addable />
        <TaskList assignee="a" title={state.people.a} addable />
      </div>
      <TaskList assignee="both" title={BOTH_LABEL} addable />
      <TaskList assignee={null} title="Без исполнителя" addable={false} />
    </>
  );
}
