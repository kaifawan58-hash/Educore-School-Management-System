"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, Badge, Button, useToast, EmptyState, SectionSelect } from "@/components/ui";

type Row = { id: string; period: string; basicSalary: number; allowances: number; deductions: number; netSalary: number; status: string; teacherFirstName: string; teacherLastName: string };
type ClassRow = { id: string; name: string; sections: { id: string; name: string }[] };

export default function PayrollPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const { toast, Toast } = useToast();

  const load = useCallback(async (sec?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (sec) params.set("sectionId", sec);
    const res = await fetch(`/api/payroll?${params.toString()}`);
    const json = await res.json();
    if (json.success) setRows(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => { if (j.success) setRole(j.data.role); });
    fetch("/api/classes").then((r) => r.json()).then((j) => { if (j.success) setClasses(j.data.classes); });
    load();
  }, [load]);

  const canPay = ["admin", "manager"].includes(role);

  async function markPaid(id: string) {
    const res = await fetch("/api/payroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast("Payslip marked as paid");
    load(sectionId);
  }

  return (
    <div className="space-y-4">
      {Toast}
      <div><h1 className="text-xl font-semibold">Payroll</h1><p className="text-sm text-[var(--muted)]">Staff salary periods and payslips</p></div>
      <Card className="p-3">
        <SectionSelect
          label="Class teacher of"
          classes={classes}
          value={sectionId}
          onChange={(sec) => { setSectionId(sec); load(sec); }}
          includeAll
          allLabel="All sections"
          className="w-56"
        />
      </Card>
      <Card>
        {loading ? <p className="p-6 text-sm text-[var(--muted)]">Loading...</p> : rows.length === 0 ? <EmptyState title="No payroll records" /> : (
          <table className="w-full text-sm">
            <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]"><tr><th className="py-3 px-4">Teacher</th><th>Period</th><th>Basic</th><th>Allowances</th><th>Deductions</th><th>Net</th><th>Status</th>{canPay && <th className="text-right pr-4">Action</th>}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 px-4 font-medium">{r.teacherFirstName} {r.teacherLastName}</td>
                  <td>{r.period}</td>
                  <td>PKR {r.basicSalary.toLocaleString()}</td>
                  <td>PKR {r.allowances.toLocaleString()}</td>
                  <td>PKR {r.deductions.toLocaleString()}</td>
                  <td className="font-medium">PKR {r.netSalary.toLocaleString()}</td>
                  <td><Badge tone={r.status === "paid" ? "success" : "warning"}>{r.status}</Badge></td>
                  {canPay && <td className="text-right pr-4">{r.status !== "paid" && <Button variant="secondary" onClick={() => markPaid(r.id)}>Mark paid</Button>}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
