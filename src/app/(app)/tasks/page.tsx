import type { Metadata } from "next";
import { TaskBoard } from "@/components/TaskBoard";

export const metadata: Metadata = { title: "Задачи" };

export default function TasksPage() {
  return (
    <div className="page page-wide">
      <h1>Задачи</h1>
      <TaskBoard />
    </div>
  );
}
