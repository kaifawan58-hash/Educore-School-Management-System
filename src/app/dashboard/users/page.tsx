"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, Button, Input, Modal, Label, Badge, EmptyState, useToast, Select } from "@/components/ui";
import { Plus, Search, KeyRound, Pencil, Trash2 } from "lucide-react";

type UserRow = { id: string; name: string; email: string; role: string; isActive: boolean; lastLoginAt: string | null };

const ROLES = ["admin", "manager", "teacher", "student", "parent"];

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [role, setRole] = useState("");
  const { toast, Toast } = useToast();

  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "teacher" });
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "teacher", isActive: true });
  const [newPassword, setNewPassword] = useState("");

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    const res = await fetch(`/api/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const json = await res.json();
    if (json.success) setUsers(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => { if (j.success) setRole(j.data.role); });
    load();
  }, [load]);

  const canManage = ["admin", "manager"].includes(role);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(createForm) });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast("User account created");
    setCreateOpen(false);
    setCreateForm({ name: "", email: "", password: "", role: "teacher" });
    load(query);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    const res = await fetch(`/api/users/${editTarget.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast("User updated");
    setEditTarget(null);
    load(query);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    const res = await fetch(`/api/users/${resetTarget.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword }) });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast("Password reset");
    setResetTarget(null);
    setNewPassword("");
  }

  async function handleDelete(u: UserRow) {
    if (!confirm(`Delete the account for ${u.name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast("User deleted");
    load(query);
  }

  return (
    <div className="space-y-4">
      {Toast}
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-semibold">User Accounts</h1><p className="text-sm text-[var(--muted)]">{users.length} accounts{canManage ? " · create logins, change email/role, reset passwords" : " (view only)"}</p></div>
        {canManage && <Button onClick={() => setCreateOpen(true)}><span className="inline-flex items-center gap-1"><Plus size={16} /> Create Account</span></Button>}
      </div>

      <Card className="p-3">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <Input placeholder="Search by name or email..." className="pl-9" value={query} onChange={(e) => { setQuery(e.target.value); load(e.target.value); }} />
        </div>
      </Card>

      <Card>
        {loading ? <p className="p-6 text-sm text-[var(--muted)]">Loading...</p> : users.length === 0 ? <EmptyState title="No users found" /> : (
          <table className="w-full text-sm">
            <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]"><tr><th className="py-3 px-4">Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th>{canManage && <th className="text-right pr-4">Actions</th>}</tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 px-4 font-medium">{u.name}</td>
                  <td>{u.email}</td>
                  <td className="capitalize">{u.role.replace("_", " ")}</td>
                  <td><Badge tone={u.isActive ? "success" : "default"}>{u.isActive ? "Active" : "Disabled"}</Badge></td>
                  <td className="text-[var(--muted)] text-xs">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}</td>
                  {canManage && (
                    <td className="text-right pr-4 whitespace-nowrap">
                      <button onClick={() => { setEditTarget(u); setEditForm({ name: u.name, email: u.email, role: u.role, isActive: u.isActive }); }} title="Edit" className="p-1.5 text-[var(--muted)] hover:text-indigo-600"><Pencil size={15} /></button>
                      <button onClick={() => setResetTarget(u)} title="Reset password" className="p-1.5 text-[var(--muted)] hover:text-indigo-600"><KeyRound size={15} /></button>
                      <button onClick={() => handleDelete(u)} title="Delete" className="p-1.5 text-[var(--muted)] hover:text-rose-600"><Trash2 size={15} /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create User Account">
        <form onSubmit={handleCreate} className="space-y-3">
          <div><Label>Full name</Label><Input required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} /></div>
          <div><Label>Temporary password</Label><Input type="text" required minLength={8} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="At least 8 characters" /></div>
          <div>
            <Label>Role</Label>
            <Select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit">Create account</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit ${editTarget?.name ?? ""}`}>
        <form onSubmit={handleEditSave} className="space-y-3">
          <div><Label>Full name</Label><Input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" required value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
          <div>
            <Label>Role</Label>
            <Select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />
            Account is active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`Reset password for ${resetTarget?.name ?? ""}`}>
        <form onSubmit={handleResetPassword} className="space-y-3">
          <div><Label>New password</Label><Input type="text" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" /></div>
          <p className="text-xs text-[var(--muted)]">Share this new password with the user securely &mdash; they should change it after logging in.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button type="submit">Reset password</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
