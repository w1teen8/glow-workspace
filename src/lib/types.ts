import type { Section } from "./sections";

export type Assignee = "a" | "b";
/** Исполнитель задачи: один из двоих или оба сразу. */
export type Owner = Assignee | "both";
export const BOTH_LABEL = "Вдвоём";

export type Task = {
  id: number;
  text: string;
  assignee: Owner | null;
  due: string | null; // YYYY-MM-DD
  position: number; // порядок в списке: меньше — раньше
  done: boolean;
  doneAt: string | null;
  createdAt: string;
};

/** Ответ под задачей. */
export type Reply = {
  id: number;
  taskId: number;
  text: string;
  createdAt: string;
};

export type Item = {
  id: number;
  section: string;
  text: string | null;
  file: { name: string; mime: string; size: number } | null;
  createdAt: string;
};

export type People = Record<Assignee, string>;

export type WorkspaceState = {
  sections: Section[];
  notes: Record<string, string>;
  tasks: Task[];
  replies: Reply[];
  items: Item[];
  people: People;
};
