"use client";

import { useEffect, useState, use } from "react";
import { Card, Badge, EmptyState } from "@/components/ui";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Detail = {
  student: { id: string; firstName: string; lastName: string; admissionNumber: string; dob: string | null; gender: string | null; bloodGroup: string | null; address: string | null; status: string; admissionDate: string | null };
  parents: { id: string; firstName: string; lastName: string; relation: string | null; phone: string | null; email: string | null }[];
  attendance: { id: string; date: string; status: string }[];
  invoices: { id: string; invoiceNumber: string; totalAmount: number; status: string; dueDate: string | null }[];
};

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Detail | null>(null);
  const [tab, setTab] = useState<"overview" | "attendance" | "fees" | "parents">("overview");

  useEffect(() => {
    fetch(`/api/students/${id}`).then((r) => r.json()).then((j) => { if (j.success) setData(j.data); });
  }, [id]);

  if (!data) return <p className="text-sm text-[var(--muted)]">Loading...</p>;
  const { student, parents, attendance, invoices } = data;

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const attendanceRate = attendance.length ? Math.round((presentCount / attendance.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <Link href="/dashboard/students" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft size={14} /> Back to students
      </Link>

      <Card className="p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-semibold">
          {student.firstName[0]}{student.lastName[0]}
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{student.firstName} {student.lastName}</h1>
          <p className="text-sm text-[var(--muted)]">{student.admissionNumber} · Admitted {student.admissionDate ?? "-"}</p>
        </div>
        <Badge tone={student.status === "active" ? "success" : "default"}>{student.status}</Badge>
      </Card>

      <div className="flex gap-1 border-b border-[var(--border)]">
        {(["overview", "attendance", "fees", "parents"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition ${tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <Card className="p-5 grid sm:grid-cols-2 gap-4 text-sm">
          <div><p className="text-[var(--muted)]">Date of Birth</p><p className="font-medium">{student.dob ?? "-"}</p></div>
          <div><p className="text-[var(--muted)]">Gender</p><p className="font-medium capitalize">{student.gender ?? "-"}</p></div>
          <div><p className="text-[var(--muted)]">Blood Group</p><p className="font-medium">{student.bloodGroup ?? "-"}</p></div>
          <div><p className="text-[var(--muted)]">Attendance Rate</p><p className="font-medium">{attendanceRate}%</p></div>
          <div className="sm:col-span-2"><p className="text-[var(--muted)]">Address</p><p className="font-medium">{student.address ?? "-"}</p></div>
        </Card>
      )}

      {tab === "attendance" && (
        <Card>
          {attendance.length === 0 ? <EmptyState title="No attendance records" /> : (
            <table className="w-full text-sm">
              <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]"><tr><th className="py-3 px-4">Date</th><th>Status</th></tr></thead>
              <tbody>
                {attendance.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 px-4">{a.date}</td>
                    <td><Badge tone={a.status === "present" ? "success" : a.status === "absent" ? "danger" : "warning"}>{a.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === "fees" && (
        <Card>
          {invoices.length === 0 ? <EmptyState title="No invoices" /> : (
            <table className="w-full text-sm">
              <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]"><tr><th className="py-3 px-4">Invoice #</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 px-4">{inv.invoiceNumber}</td>
                    <td>PKR {inv.totalAmount.toLocaleString()}</td>
                    <td>{inv.dueDate ?? "-"}</td>
                    <td><Badge tone={inv.status === "paid" ? "success" : "warning"}>{inv.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === "parents" && (
        <Card>
          {parents.length === 0 ? <EmptyState title="No linked parents" /> : (
            <table className="w-full text-sm">
              <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]"><tr><th className="py-3 px-4">Name</th><th>Relation</th><th>Phone</th><th>Email</th></tr></thead>
              <tbody>
                {parents.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 px-4">{p.firstName} {p.lastName}</td>
                    <td className="capitalize">{p.relation}</td>
                    <td>{p.phone ?? "-"}</td>
                    <td>{p.email ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
