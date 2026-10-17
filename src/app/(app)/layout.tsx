import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { WorkspaceProvider } from "@/components/WorkspaceProvider";
import { getSession } from "@/lib/auth";
import { loadState } from "@/lib/state";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await getSession())) redirect("/login");
  const initial = await loadState();

  return (
    <WorkspaceProvider initial={initial}>
      <div className="shell">
        <Sidebar />
        <main className="main">{children}</main>
      </div>
    </WorkspaceProvider>
  );
}
