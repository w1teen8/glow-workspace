import type { Section } from "./sections";

export type Assignee = "a" | "b";

export type Task = {
  id: number;
  text: string;
  assignee: Assignee | null;
  due: string | null; // YYYY-MM-DD
  done: boolean;
  doneAt: string | null;
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
  items: Item[];
  people: People;
};
