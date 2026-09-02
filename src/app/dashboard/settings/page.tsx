"use client";
import { useEffect, useState } from "react";
import { Card, Input, Label, Button, useToast } from "@/components/ui";

type School = {
  name: string; address: string | null; phone: string | null; email: string | null; website: string | null;
  primaryColor: string | null; secondaryColor: string | null; currency: string | null; timezone: string | null;
  gradingSystem: string | null;
};

export default function SettingsPage() {
  const [school, setSchool] = useState<School | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast, Toast } = useToast();

  useEffect(() => {
    fetch("/api/settings/school")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setSchool(j.data);
        else setError(j.error || "Couldn't load settings");
      })
      .catch(() => setError("Couldn't reach the server. Check your connection and try again."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!school) return;
    setSaving(true);
    const res = await fetch("/api/settings/school", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(school) });
    const json = await res.json();
    setSaving(false);
    if (!json.success) { toast(json.error, "error"); return; }
    setSchool(json.data);
    toast("Settings saved");
  }

  if (loading) return <p className="text-sm text-[var(--muted)]">Loading...</p>;

  if (error) {
    return (
      <Card className="p-6 max-w-md">
        <p className="font-medium text-rose-600 mb-1">Couldn&rsquo;t load settings</p>
        <p className="text-sm text-[var(--muted)]">{error}</p>
        {error.toLowerCase().includes("cannot") && (
          <p className="text-sm text-[var(--muted)] mt-2">Only an Admin account can view or change school settings.</p>
        )}
      </Card>
    );
  }

  if (!school) return null;

  return (
    <div className="space-y-4 max-w-2xl">
      {Toast}
      <div><h1 className="text-xl font-semibold">Settings</h1><p className="text-sm text-[var(--muted)]">School profile and branding</p></div>
      <Card className="p-5">
        <form onSubmit={handleSave} className="space-y-3">
          <div><Label>School name</Label><Input value={school.name} onChange={(e) => setSchool({ ...school, name: e.target.value })} /></div>
          <div><Label>Address</Label><Input value={school.address ?? ""} onChange={(e) => setSchool({ ...school, address: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={school.phone ?? ""} onChange={(e) => setSchool({ ...school, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={school.email ?? ""} onChange={(e) => setSchool({ ...school, email: e.target.value })} /></div>
          </div>
          <div><Label>Website</Label><Input value={school.website ?? ""} onChange={(e) => setSchool({ ...school, website: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Currency</Label><Input value={school.currency ?? ""} onChange={(e) => setSchool({ ...school, currency: e.target.value })} /></div>
            <div><Label>Timezone</Label><Input value={school.timezone ?? ""} onChange={(e) => setSchool({ ...school, timezone: e.target.value })} /></div>
          </div>
          <div>
            <Label>Grading system</Label>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              value={school.gradingSystem ?? "percentage"}
              onChange={(e) => setSchool({ ...school, gradingSystem: e.target.value })}
            >
              <option value="percentage">Percentage</option>
              <option value="gpa">GPA</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Primary color</Label>
              <input type="color" value={school.primaryColor ?? "#4338ca"} onChange={(e) => setSchool({ ...school, primaryColor: e.target.value })} className="h-10 w-16 rounded border border-[var(--border)]" />
            </div>
            <div>
              <Label>Secondary color</Label>
              <input type="color" value={school.secondaryColor ?? "#0f172a"} onChange={(e) => setSchool({ ...school, secondaryColor: e.target.value })} className="h-10 w-16 rounded border border-[var(--border)]" />
            </div>
          </div>
          <div className="pt-2"><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save settings"}</Button></div>
        </form>
      </Card>
    </div>
  );
}
