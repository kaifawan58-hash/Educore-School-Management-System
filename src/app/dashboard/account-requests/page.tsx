"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, Badge, Button, EmptyState, useToast } from "@/components/ui";
import { Check, X } from "lucide-react";

type Req = {
  id: string; requestedName: string | null; requestedEmail: string | null; hasPasswordChange: boolean;
  status: string; createdAt: string; userName: string; userEmail: string; userRole: string;
};

export default function AccountRequestsPage() {
  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, Toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/account-requests?status=pending");
    const json = await res.json();
    if (json.success) setRows(json.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string) {
    const res = await fetch(`/api/account-requests/${id}/approve`, { method: "POST" });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast("Request approved and applied");
    load();
  }

  async function handleReject(id: string) {
    const note = prompt("Optional note for the user (why this was rejected):") ?? undefined;
    const res = await fetch(`/api/account-requests/${id}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast("Request rejected");
    load();
  }

  return (
    <div className="space-y-4">
      {Toast}
      <div>
        <h1 className="text-xl font-semibold">Account Change Requests</h1>
        <p className="text-sm text-[var(--muted)]">
          Teachers, students, parents, and managers can&rsquo;t change their own name/email/password directly &mdash;
          their requests land here and only take effect once you approve them.
        </p>
      </div>

      <Card>
        {loading ? <p className="p-6 text-sm text-[var(--muted)]">Loading...</p> : rows.length === 0 ? (
          <EmptyState title="No pending requests" hint="You're all caught up." />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]">
              <tr><th className="py-3 px-4">User</th><th>Requested changes</th><th>Submitted</th><th className="text-right pr-4">Action</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 px-4">
                    <div className="font-medium">{r.userName}</div>
                    <div className="text-xs text-[var(--muted)]">{r.userEmail} &middot; <span className="capitalize">{r.userRole}</span></div>
                  </td>
                  <td className="text-xs space-y-1">
                    {r.requestedName && <div>Name &rarr; <span className="font-medium text-[var(--foreground)]">{r.requestedName}</span></div>}
                    {r.requestedEmail && <div>Email &rarr; <span className="font-medium text-[var(--foreground)]">{r.requestedEmail}</span></div>}
                    {r.hasPasswordChange && <div><Badge tone="warning">Password change</Badge></div>}
                  </td>
                  <td className="text-[var(--muted)] text-xs">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="text-right pr-4 whitespace-nowrap">
                    <Button variant="secondary" onClick={() => handleApprove(r.id)} className="mr-1"><span className="inline-flex items-center gap-1"><Check size={14} /> Approve</span></Button>
                    <Button variant="danger" onClick={() => handleReject(r.id)}><span className="inline-flex items-center gap-1"><X size={14} /> Reject</span></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
