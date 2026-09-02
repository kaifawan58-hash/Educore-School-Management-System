"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, GraduationCap, UserCog, BookOpen, CalendarCheck,
  ClipboardList, Wallet, Landmark, Library, Bus, NotebookPen, MessageSquare,
  FileBarChart, ShieldCheck, Settings, School, KeyRound, UserCheck, CircleUser, Link2, Clock,
} from "lucide-react";
import type { Module } from "@/lib/rbac";

type NavItem = { href: string; label: string; icon: React.ElementType; module: Module };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
  { href: "/dashboard/students", label: "Students", icon: GraduationCap, module: "students" },
  { href: "/dashboard/parents", label: "Parents", icon: Users, module: "parents" },
  { href: "/dashboard/teachers", label: "Teachers", icon: UserCog, module: "teachers" },
  { href: "/dashboard/classes", label: "Academics", icon: BookOpen, module: "classes" },
  { href: "/dashboard/subject-class", label: "Subject & Class", icon: Link2, module: "classes" },
  { href: "/dashboard/attendance", label: "Attendance", icon: CalendarCheck, module: "attendance" },
  { href: "/dashboard/timetable", label: "Timetable", icon: Clock, module: "timetable" },
  { href: "/dashboard/exams", label: "Examinations", icon: ClipboardList, module: "exams" },
  { href: "/dashboard/fees", label: "Finance", icon: Wallet, module: "fees" },
  { href: "/dashboard/payroll", label: "Payroll", icon: Landmark, module: "payroll" },
  { href: "/dashboard/library", label: "Library", icon: Library, module: "library" },
  { href: "/dashboard/transport", label: "Transport", icon: Bus, module: "transport" },
  { href: "/dashboard/homework", label: "Homework", icon: NotebookPen, module: "homework" },
  { href: "/dashboard/communication", label: "Communication", icon: MessageSquare, module: "communication" },
  { href: "/dashboard/reports", label: "Reports", icon: FileBarChart, module: "reports" },
  { href: "/dashboard/audit-logs", label: "Audit Logs", icon: ShieldCheck, module: "audit_logs" },
  { href: "/dashboard/users", label: "User Accounts", icon: KeyRound, module: "users" },
  { href: "/dashboard/account-requests", label: "Account Requests", icon: UserCheck, module: "users" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, module: "settings" },
];

export default function Sidebar({ role, allowedModules }: { role: string; allowedModules: Module[] }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => allowedModules.includes(n.module));

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-[var(--border)] bg-[var(--card)] h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
          <School size={16} />
        </div>
        <span className="font-semibold">EduCore</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                active
                  ? "bg-indigo-600 text-white font-medium"
                  : "text-[var(--muted)] hover:bg-slate-100 dark:hover:bg-white/5 hover:text-[var(--foreground)]"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}

        {/* Always visible to every role, regardless of module permissions —
            everyone should be able to find where to change their own info. */}
        <div className="pt-2 mt-2 border-t border-[var(--border)]">
          <Link
            href="/dashboard/account"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
              pathname === "/dashboard/account"
                ? "bg-indigo-600 text-white font-medium"
                : "text-[var(--muted)] hover:bg-slate-100 dark:hover:bg-white/5 hover:text-[var(--foreground)]"
            }`}
          >
            <CircleUser size={16} />
            My Account
          </Link>
        </div>
      </nav>
      <div className="px-4 py-3 border-t border-[var(--border)] text-xs text-[var(--muted)]">
        Signed in as <span className="font-medium capitalize">{role.replace("_", " ")}</span>
      </div>
    </aside>
  );
}
