"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Bell, Menu, User, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Notification = { id: string; title: string; body: string | null; isRead: boolean; createdAt: string };

export default function Topbar({ name, role }: { name: string; role: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function loadNotifications() {
    const res = await fetch("/api/notifications");
    const json = await res.json();
    if (json.success) setNotifications(json.data);
  }

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleOpen() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unreadCount > 0) {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--card)] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button className="lg:hidden p-2 -ml-2 text-[var(--muted)]">
          <Menu size={20} />
        </button>
        <div className="text-sm text-[var(--muted)]">Greenwood International School</div>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative" ref={ref}>
          <button onClick={handleOpen} className="relative p-2 text-[var(--muted)] hover:text-[var(--foreground)]">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg z-20">
              <div className="px-4 py-3 border-b border-[var(--border)] font-medium text-sm">Notifications</div>
              {notifications.length === 0 ? (
                <p className="p-4 text-sm text-[var(--muted)]">No notifications yet.</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="px-4 py-3 border-b border-[var(--border)] last:border-0 text-sm">
                    <p className="font-medium">{n.title}</p>
                    {n.body && <p className="text-[var(--muted)] text-xs mt-0.5">{n.body}</p>}
                    <p className="text-[var(--muted)] text-xs mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-sm font-medium">{name}</span>
              <span className="text-xs text-[var(--muted)] capitalize">{role.replace("_", " ")}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
              {name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </div>
            <ChevronDown size={14} className="text-[var(--muted)] hidden sm:block" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg z-20 overflow-hidden">
              <Link
                href="/dashboard/account"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <User size={15} /> My Account
              </Link>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <LogOut size={15} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
