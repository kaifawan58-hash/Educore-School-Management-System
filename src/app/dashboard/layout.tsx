import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can, type Module } from "@/lib/rbac";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

const ALL_MODULES: Module[] = [
  "dashboard", "students", "parents", "teachers", "classes", "attendance", "timetable",
  "exams", "fees", "payroll", "library", "transport", "homework", "communication",
  "reports", "documents", "audit_logs", "settings", "users",
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const allowedModules = ALL_MODULES.filter((m) => can(session.role, m, "view"));

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.role} allowedModules={allowedModules} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar name={session.name} role={session.role} />
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
