"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Button, Input, Modal, Label, Badge, EmptyState, useToast, Pager, SectionSelect } from "@/components/ui";
import { Plus, Search, Pencil, Trash2, Download } from "lucide-react";
import Link from "next/link";

type Student = {
  id: string; firstName: string; lastName: string; admissionNumber: string;
  gender: string | null; status: string; rollNumber: string | null;
  sectionName: string | null; className: string | null;
};
type ClassRow = { id: string; name: string; sections: { id: string; name: string }[] };

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [role, setRole] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { toast, Toast } = useToast();

  const [form, setForm] = useState({ firstName: "", lastName: "", admissionNumber: "", rollNumber: "", gender: "male", phone: "", address: "" });

  const load = useCallback(async (q?: string, p?: number, sec?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sec) params.set("sectionId", sec);
    params.set("page", String(p ?? 1));
    const res = await fetch(`/api/students?${params.toString()}`);
    const json = await res.json();
    if (json.success) {
      setStudents(json.data.rows);
      setTotalPages(json.data.pagination.totalPages);
      setTotal(json.data.pagination.total);
      setPage(json.data.pagination.page);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => { if (j.success) setRole(j.data.role); });
    fetch("/api/classes").then((r) => r.json()).then((j) => { if (j.success) setClasses(j.data.classes); });
    load();
  }, [load]);

  function handleExport() {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (sectionId) params.set("sectionId", sectionId);
    window.open(`/api/students/export?${params.toString()}`, "_blank");
  }

  function openCreate() {
    setEditing(null);
    setForm({ firstName: "", lastName: "", admissionNumber: `ADM-${Math.floor(Math.random() * 9000) + 1000}`, rollNumber: "", gender: "male", phone: "", address: "" });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(editing ? `/api/students/${editing.id}` : "/api/students", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast(editing ? "Student updated" : "Student added");
    setModalOpen(false);
    load(query, page, sectionId);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this student record?")) return;
    const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast("Student removed");
    load(query, page, sectionId);
  }

  const canManage = ["admin", "manager"].includes(role);

  return (
    <div className="space-y-4">
      {Toast}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Students</h1>
          <p className="text-sm text-[var(--muted)]">{total} records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport}><span className="inline-flex items-center gap-1"><Download size={16} /> Export CSV</span></Button>
          {canManage && (
            <Button onClick={openCreate}><span className="inline-flex items-center gap-1"><Plus size={16} /> Add Student</span></Button>
          )}
        </div>
      </div>

      <Card className="p-3 flex flex-wrap gap-3 items-end">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            placeholder="Search by name or admission number..."
            className="pl-9"
            value={query}
            onChange={(e) => { setQuery(e.target.value); load(e.target.value, 1, sectionId); }}
          />
        </div>
        <SectionSelect
          label="Class"
          classes={classes}
          value={sectionId}
          onChange={(sec) => { setSectionId(sec); load(query, 1, sec); }}
          includeAll
          className="w-48"
        />
      </Card>

      <Card>
        {loading ? (
          <p className="p-6 text-sm text-[var(--muted)]">Loading...</p>
        ) : students.length === 0 ? (
          <EmptyState title="No students found" hint="Try a different search or add a new student." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th>Admission #</th>
                  <th>Class</th>
                  <th>Roll #</th>
                  <th>Status</th>
                  {canManage && <th className="text-right pr-4">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {students.map((st) => (
                  <tr key={st.id} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="py-3 px-4">
                      <Link href={`/dashboard/students/${st.id}`} className="font-medium hover:text-indigo-600">
                        {st.firstName} {st.lastName}
                      </Link>
                    </td>
                    <td className="text-[var(--muted)]">{st.admissionNumber}</td>
                    <td>{st.className ? `${st.className} - ${st.sectionName}` : "-"}</td>
                    <td>{st.rollNumber ?? "-"}</td>
                    <td><Badge tone={st.status === "active" ? "success" : "default"}>{st.status}</Badge></td>
                    {canManage && (
                      <td className="text-right pr-4">
                        <button onClick={() => { setEditing(st); setForm({ firstName: st.firstName, lastName: st.lastName, admissionNumber: st.admissionNumber, rollNumber: st.rollNumber ?? "", gender: st.gender ?? "male", phone: "", address: "" }); setModalOpen(true); }} className="p-1.5 text-[var(--muted)] hover:text-indigo-600"><Pencil size={15} /></button>
                        <button onClick={() => handleDelete(st.id)} className="p-1.5 text-[var(--muted)] hover:text-rose-600"><Trash2 size={15} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={page} totalPages={totalPages} onPageChange={(p) => load(query, p, sectionId)} />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Student" : "Add Student"}>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First name</Label><Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
            <div><Label>Last name</Label><Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
          </div>
          {!editing && (
            <div><Label>Admission number</Label><Input required value={form.admissionNumber} onChange={(e) => setForm({ ...form, admissionNumber: e.target.value })} /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Roll number</Label><Input value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editing ? "Save changes" : "Add student"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
