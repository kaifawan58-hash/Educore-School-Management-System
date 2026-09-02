"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Button, Input, Modal, Label, Badge, EmptyState, useToast, Pager } from "@/components/ui";
import { Plus, Search } from "lucide-react";

type Teacher = {
  id: string; firstName: string; lastName: string; employeeId: string;
  designation: string | null; department: string | null; phone: string | null; status: string;
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { toast, Toast } = useToast();
  const [form, setForm] = useState({ firstName: "", lastName: "", employeeId: "", qualification: "", phone: "", designation: "Teacher", department: "" });

  const load = useCallback(async (q?: string, p?: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(p ?? 1));
    const res = await fetch(`/api/teachers?${params.toString()}`);
    const json = await res.json();
    if (json.success) {
      setTeachers(json.data.rows);
      setTotalPages(json.data.pagination.totalPages);
      setTotal(json.data.pagination.total);
      setPage(json.data.pagination.page);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => { if (j.success) setRole(j.data.role); });
    load();
  }, [load]);

  const canManage = ["admin", "manager"].includes(role);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/teachers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast("Teacher added");
    setModalOpen(false);
    load(query, page);
  }

  return (
    <div className="space-y-4">
      {Toast}
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-semibold">Teachers</h1><p className="text-sm text-[var(--muted)]">{total} staff members</p></div>
        {canManage && <Button onClick={() => { setForm({ firstName: "", lastName: "", employeeId: `EMP-${Math.floor(Math.random() * 9000) + 1000}`, qualification: "", phone: "", designation: "Teacher", department: "" }); setModalOpen(true); }}><span className="inline-flex items-center gap-1"><Plus size={16} /> Add Teacher</span></Button>}
      </div>

      <Card className="p-3">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <Input placeholder="Search teachers..." className="pl-9" value={query} onChange={(e) => { setQuery(e.target.value); load(e.target.value, 1); }} />
        </div>
      </Card>

      <Card>
        {loading ? <p className="p-6 text-sm text-[var(--muted)]">Loading...</p> : teachers.length === 0 ? (
          <EmptyState title="No teachers found" />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]"><tr><th className="py-3 px-4">Name</th><th>Employee ID</th><th>Designation</th><th>Department</th><th>Phone</th><th>Status</th></tr></thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 px-4 font-medium">{t.firstName} {t.lastName}</td>
                  <td className="text-[var(--muted)]">{t.employeeId}</td>
                  <td>{t.designation ?? "-"}</td>
                  <td>{t.department ?? "-"}</td>
                  <td>{t.phone ?? "-"}</td>
                  <td><Badge tone={t.status === "active" ? "success" : "default"}>{t.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pager page={page} totalPages={totalPages} onPageChange={(p) => load(query, p)} />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Teacher">
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First name</Label><Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
            <div><Label>Last name</Label><Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
          </div>
          <div><Label>Employee ID</Label><Input required value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Designation</Label><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
            <div><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
          </div>
          <div><Label>Qualification</Label><Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">Add teacher</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
