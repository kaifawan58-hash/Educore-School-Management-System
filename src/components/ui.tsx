"use client";

import { ReactNode, useEffect, useState } from "react";
import { X } from "lucide-react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--card)] border border-[var(--border)] rounded-xl ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, hint, accent = "indigo" }: { label: string; value: string | number; hint?: string; accent?: "indigo" | "teal" | "amber" | "rose" }) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
    teal: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  };
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      {hint && <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${colors[accent]}`}>{hint}</span>}
    </Card>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "success" | "warning" | "danger" }) {
  const map: Record<string, string> = {
    default: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    danger: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  };
  return <span className={`text-xs px-2 py-1 rounded-full font-medium ${map[tone]}`}>{children}</span>;
}

export function Button({ children, variant = "primary", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles: Record<string, string> = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white",
    danger: "bg-rose-600 hover:bg-rose-700 text-white",
    ghost: "hover:bg-slate-100 dark:hover:bg-white/10",
  };
  return (
    <button
      className={`px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${props.className ?? ""}`}
    />
  );
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${props.className ?? ""}`}
    >
      {children}
    </select>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="text-sm font-medium mb-1 block">{children}</label>;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--card)]">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-center py-16 text-[var(--muted)]">
      <p className="font-medium text-[var(--foreground)]">{title}</p>
      {hint && <p className="text-sm mt-1">{hint}</p>}
    </div>
  );
}

export function useToast() {
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  const Toast = message ? (
    <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-sm text-white ${message.tone === "success" ? "bg-emerald-600" : "bg-rose-600"}`}>
      {message.text}
    </div>
  ) : null;

  return { toast: (text: string, tone: "success" | "error" = "success") => setMessage({ text, tone }), Toast };
}

export function Pager({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] text-sm">
      <span className="text-[var(--muted)]">Page {page} of {totalPages}</span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg border border-[var(--border)] disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-white/5"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-[var(--border)] disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-white/5"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Reusable section picker matching the "Section — Grade 1 - A ⌄" style used
// across Attendance, Timetable, Homework, and anywhere else a single
// class+section needs picking. Always shows a label above the control.
// Pass includeAll to add an "All classes" option at the top (value: "").
export function SectionSelect({
  label = "Section",
  classes,
  value,
  onChange,
  className = "",
  includeAll = false,
  allLabel = "All classes",
}: {
  label?: string;
  classes: { id: string; name: string; sections: { id: string; name: string }[] }[];
  value: string;
  onChange: (sectionId: string) => void;
  className?: string;
  includeAll?: boolean;
  allLabel?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {includeAll && <option value="">{allLabel}</option>}
        {classes.map((c) =>
          c.sections.map((sec) => (
            <option key={sec.id} value={sec.id}>
              {c.name} - {sec.name}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
