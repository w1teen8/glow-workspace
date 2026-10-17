import type { SectionSlug } from "./sections";

export type Assignee = "a" | "b";

export type Task = {
  id: number;
  section: SectionSlug;
  text: string;
  assignee: Assignee | null;
  due: string | null; // YYYY-MM-DD
  done: boolean;
  doneAt: string | null;
  createdAt: string;
};

export type Item = {
  id: number;
  section: SectionSlug;
  text: string | null;
  file: { name: string; mime: string; size: number } | null;
  createdAt: string;
};

export type People = Record<Assignee, string>;

export type WorkspaceState = {
  notes: Partial<Record<SectionSlug, string>>;
  tasks: Task[];
  items: Item[];
  people: People;
};
