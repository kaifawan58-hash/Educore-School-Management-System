"use client";
import { useEffect, useState } from "react";
import { Card, Badge, EmptyState } from "@/components/ui";

type Log = { id: string; action: string; entity: string; entityId: string | null; createdAt: string; userName: string | null; userEmail: string | null };

const TONE: Record<string, "default" | "success" | "warning" | "danger"> = {
  login: "success", logout: "default", login_failed: "danger", create: "success", update: "warning", delete: "danger",
};

export default function AuditLogsPage() {
  const [rows, setRows] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit-logs").then((r) => r.json()).then((j) => { if (j.success) setRows(j.data); setLoading(false); });
  }, []);

  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-semibold">Audit Logs</h1><p className="text-sm text-[var(--muted)]">Security-relevant activity across the system</p></div>
      <Card>
        {loading ? <p className="p-6 text-sm text-[var(--muted)]">Loading...</p> : rows.length === 0 ? <EmptyState title="No activity recorded yet" /> : (
          <table className="w-full text-sm">
            <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]"><tr><th className="py-3 px-4">User</th><th>Action</th><th>Entity</th><th>When</th></tr></thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 px-4">{l.userName ?? "System"} <span className="text-[var(--muted)] text-xs">{l.userEmail}</span></td>
                  <td><Badge tone={TONE[l.action] ?? "default"}>{l.action.replace("_", " ")}</Badge></td>
                  <td className="capitalize">{l.entity}</td>
                  <td className="text-[var(--muted)]">{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
