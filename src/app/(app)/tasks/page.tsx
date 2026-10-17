import type { Metadata } from "next";
import { TaskList } from "@/components/TaskList";

export const metadata: Metadata = { title: "Задачи" };

export default function TasksPage() {
  return (
    <div className="page">
      <h1>Задачи</h1>
      <TaskList />
    </div>
  );
}
