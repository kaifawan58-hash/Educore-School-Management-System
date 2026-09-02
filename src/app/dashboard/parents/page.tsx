"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, Input, Button, Modal, Label, Select, EmptyState, useToast, Pager, SectionSelect } from "@/components/ui";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";

type Child = { studentId: string; firstName: string; lastName: string; className: string | null; sectionName: string | null };
type Parent = {
  id: string; firstName: string; lastName: string; relation: string | null;
  phone: string | null; email: string | null; occupation: string | null; address: string | null;
  children: Child[];
};
type ClassRow = { id: string; name: string; sections: { id: string; name: string }[] };

const emptyForm = { firstName: "", lastName: "", relation: "guardian", phone: "", email: "", occupation: "", address: "" };

export default function ParentsPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Parent | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast, Toast } = useToast();

  const load = useCallback(async (q?: string, p?: number, sec?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sec) params.set("sectionId", sec);
    params.set("page", String(p ?? 1));
    const res = await fetch(`/api/parents?${params.toString()}`);
    const json = await res.json();
    if (json.success) {
      setParents(json.data.rows);
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

  const canManage = ["admin", "manager"].includes(role);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(p: Parent) {
    setEditing(p);
    setForm({
      firstName: p.firstName, lastName: p.lastName, relation: p.relation ?? "guardian",
      phone: p.phone ?? "", email: p.email ?? "", occupation: p.occupation ?? "", address: p.address ?? "",
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(editing ? `/api/parents/${editing.id}` : "/api/parents", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast(editing ? "Parent updated" : "Parent added");
    setModalOpen(false);
    load(query, page, sectionId);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this parent record?")) return;
    const res = await fetch(`/api/parents/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast("Parent removed");
    load(query, page, sectionId);
  }

  return (
    <div className="space-y-4">
      {Toast}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Parents</h1>
          <p className="text-sm text-[var(--muted)]">{total} records</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}><span className="inline-flex items-center gap-1"><Plus size={16} /> Add Parent</span></Button>
        )}
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
        ) : parents.length === 0 ? (
          <EmptyState title="No parents found" hint="Try a different search or add a new parent." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                <tr>
                  <th className="py-3 px-4">Name</th><th>Relation</th><th>Phone</th><th>Email</th><th>Child / Class</th>
                  {canManage && <th className="text-right pr-4">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {parents.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="py-3 px-4 font-medium">{p.firstName} {p.lastName}</td>
                    <td className="capitalize">{p.relation ?? "-"}</td>
                    <td>{p.phone ?? "-"}</td>
                    <td>{p.email ?? "-"}</td>
                    <td>
                      {p.children.length === 0 ? (
                        <span className="text-[var(--muted)]">-</span>
                      ) : (
                        <div className="space-y-0.5">
                          {p.children.map((c) => (
                            <div key={c.studentId} className="text-xs">
                              <span className="font-medium">{c.firstName} {c.lastName}</span>
                              {c.className && <span className="text-[var(--muted)]"> · {c.className}{c.sectionName ? ` - ${c.sectionName}` : ""}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    {canManage && (
                      <td className="text-right pr-4">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-[var(--muted)] hover:text-indigo-600"><Pencil size={15} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-[var(--muted)] hover:text-rose-600"><Trash2 size={15} /></button>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Parent" : "Add Parent"}>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First name</Label><Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
            <div><Label>Last name</Label><Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
          </div>
          <div>
            <Label>Relation</Label>
            <Select value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })}>
              <option value="father">Father</option>
              <option value="mother">Mother</option>
              <option value="guardian">Guardian</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div><Label>Occupation</Label><Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} /></div>
          <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <p className="text-xs text-[var(--muted)]">To link this parent to a student, add them from the student&rsquo;s profile page.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editing ? "Save changes" : "Add parent"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
