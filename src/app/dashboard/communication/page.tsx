"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, Badge, Button, Modal, Input, Label, useToast, EmptyState } from "@/components/ui";
import { Plus } from "lucide-react";

type Announcement = { id: string; title: string; body: string; audience: string; createdAt: string };

export default function CommunicationPage() {
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", audience: "all" });
  const { toast, Toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/announcements");
    const json = await res.json();
    if (json.success) setRows(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => { if (j.success) setRole(j.data.role); });
    load();
  }, [load]);

  const canCreate = ["admin", "manager", "teacher"].includes(role);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast("Announcement posted");
    setModalOpen(false);
    setForm({ title: "", body: "", audience: "all" });
    load();
  }

  return (
    <div className="space-y-4">
      {Toast}
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-semibold">Communication</h1><p className="text-sm text-[var(--muted)]">Announcements and notices</p></div>
        {canCreate && <Button onClick={() => setModalOpen(true)}><span className="inline-flex items-center gap-1"><Plus size={16} /> New Announcement</span></Button>}
      </div>

      {loading ? <p className="text-sm text-[var(--muted)]">Loading...</p> : rows.length === 0 ? <EmptyState title="No announcements yet" /> : (
        <div className="space-y-3">
          {rows.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{a.title}</h3>
                <Badge tone="default">{a.audience}</Badge>
              </div>
              <p className="text-sm text-[var(--muted)] mt-1">{a.body}</p>
              <p className="text-xs text-[var(--muted)] mt-2">{new Date(a.createdAt).toLocaleString()}</p>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Announcement">
        <form onSubmit={handleSave} className="space-y-3">
          <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div>
            <Label>Message</Label>
            <textarea required rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <Label>Audience</Label>
            <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
              <option value="all">Everyone</option>
              <option value="students">Students</option>
              <option value="parents">Parents</option>
              <option value="teachers">Teachers</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">Post announcement</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
