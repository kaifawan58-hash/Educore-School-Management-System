"use client";
import { useEffect, useState } from "react";
import { Card, Input, Label, Button, Badge, useToast } from "@/components/ui";

type PendingRequest = { id: string; requestedName: string | null; requestedEmail: string | null; createdAt: string };
type Account = { id: string; name: string; email: string; role: string; pendingRequest: PendingRequest | null };

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const { toast, Toast } = useToast();

  function load() {
    fetch("/api/account").then((r) => r.json()).then((j) => {
      if (j.success) { setAccount(j.data); setName(j.data.name); setEmail(j.data.email); }
    });
  }

  useEffect(() => { load(); }, []);

  const isAdmin = account?.role === "admin";

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    const json = await res.json();
    setSavingProfile(false);
    if (!json.success) { toast(json.error, "error"); return; }
    toast(json.data.applied ? "Profile updated" : "Change request submitted — waiting for admin approval");
    load();
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast("New passwords don't match", "error"); return; }
    setSavingPassword(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const json = await res.json();
    setSavingPassword(false);
    if (!json.success) { toast(json.error, "error"); return; }
    toast(json.data.applied ? "Password changed" : "Password change request submitted — waiting for admin approval");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    load();
  }

  if (!account) return <p className="text-sm text-[var(--muted)]">Loading...</p>;

  return (
    <div className="space-y-4 max-w-2xl">
      {Toast}
      <div>
        <h1 className="text-xl font-semibold">My Account</h1>
        <p className="text-sm text-[var(--muted)]">
          {isAdmin
            ? "Update your name, email, and password"
            : "Changes here are submitted to your admin for approval before they take effect"}
        </p>
      </div>

      {account.pendingRequest && (
        <Card className="p-4 border-amber-300 bg-amber-50 dark:bg-amber-500/10">
          <div className="flex items-center gap-2 mb-1">
            <Badge tone="warning">Pending approval</Badge>
            <span className="text-xs text-[var(--muted)]">Submitted {new Date(account.pendingRequest.createdAt).toLocaleString()}</span>
          </div>
          <p className="text-sm">
            You have a change request awaiting your admin&rsquo;s approval
            {account.pendingRequest.requestedName && <> — new name: <span className="font-medium">{account.pendingRequest.requestedName}</span></>}
            {account.pendingRequest.requestedEmail && <> — new email: <span className="font-medium">{account.pendingRequest.requestedEmail}</span></>}.
            Submitting another change will replace this one.
          </p>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="font-medium mb-3">Profile</h3>
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="text-xs text-[var(--muted)] capitalize">Role: {account.role} (only an admin can change this)</div>
          <div className="pt-1"><Button type="submit" disabled={savingProfile}>{savingProfile ? "Saving..." : isAdmin ? "Save profile" : "Request change"}</Button></div>
        </form>
      </Card>

      <Card className="p-5">
        <h3 className="font-medium mb-3">Change password</h3>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div><Label>Current password</Label><Input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></div>
          <div><Label>New password</Label><Input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
          <div><Label>Confirm new password</Label><Input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
          <p className="text-xs text-[var(--muted)]">At least 8 characters. Your current password is required to prove it&rsquo;s really you, even though the change itself needs admin approval.</p>
          <div className="pt-1"><Button type="submit" disabled={savingPassword}>{savingPassword ? "Saving..." : isAdmin ? "Change password" : "Request change"}</Button></div>
        </form>
      </Card>
    </div>
  );
}
