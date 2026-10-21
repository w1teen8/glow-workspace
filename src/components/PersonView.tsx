"use client";

import { useState } from "react";
import { personSection } from "@/lib/sections";
import { BOTH_LABEL, type Assignee } from "@/lib/types";
import { Blocks } from "./Blocks";
import { Note } from "./Note";
import { TaskList } from "./TaskList";
import { TaskSearch } from "./TaskSearch";
import { useWorkspace } from "./WorkspaceProvider";

/** Личная вкладка: заметка, поиск и задачи этого человека, блоки (например, зона ответственности). */
export function PersonView({ who }: { who: Assignee }) {
  const { state } = useWorkspace();
  const [query, setQuery] = useState("");
  const section = personSection(who);

  return (
    <div className="page">
      <h1>{state.people[who]}</h1>
      <Note key={section} section={section} />
      <TaskSearch value={query} onChange={setQuery} />
      <TaskList assignee={who} query={query} />
      <TaskList assignee="both" title={BOTH_LABEL} addable={false} query={query} />
      <Blocks section={section} />
    </div>
  );
}
