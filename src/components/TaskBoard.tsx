"use client";

import { useState } from "react";
import { BOTH_LABEL } from "@/lib/types";
import { TaskList } from "./TaskList";
import { TaskSearch } from "./TaskSearch";
import { useWorkspace } from "./WorkspaceProvider";

/** Вкладка «Задачи»: поиск, колонка на каждого человека, под ними — общие задачи и задачи без исполнителя. */
export function TaskBoard() {
  const { state } = useWorkspace();
  const [query, setQuery] = useState("");
  return (
    <>
      <TaskSearch value={query} onChange={setQuery} />
      <div className="task-board">
        <TaskList assignee="b" title={state.people.b} addable query={query} />
        <TaskList assignee="a" title={state.people.a} addable query={query} />
      </div>
      <TaskList assignee="both" title={BOTH_LABEL} addable query={query} />
      <TaskList assignee={null} title="Без исполнителя" addable={false} query={query} />
    </>
  );
}
