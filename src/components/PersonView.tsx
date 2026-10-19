"use client";

import { personSection } from "@/lib/sections";
import { BOTH_LABEL, type Assignee } from "@/lib/types";
import { Blocks } from "./Blocks";
import { Note } from "./Note";
import { TaskList } from "./TaskList";
import { useWorkspace } from "./WorkspaceProvider";

/** Личная вкладка: заметка, задачи этого человека и блоки (например, зона ответственности). */
export function PersonView({ who }: { who: Assignee }) {
  const { state } = useWorkspace();
  const section = personSection(who);

  return (
    <div className="page">
      <h1>{state.people[who]}</h1>
      <Note key={section} section={section} />
      <TaskList assignee={who} />
      <TaskList assignee="both" title={BOTH_LABEL} addable={false} />
      <Blocks section={section} />
    </div>
  );
}
