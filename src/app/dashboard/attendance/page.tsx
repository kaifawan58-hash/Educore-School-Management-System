"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, Button, Badge, useToast, EmptyState, SectionSelect } from "@/components/ui";

type Section = { id: string; name: string };
type ClassRow = { id: string; name: string; sections: Section[] };
type Row = { studentId: string; name: string; rollNumber: string | null; status: string; recordId: string | null };

const STATUSES = ["present", "absent", "late", "excused", "half_day"] as const;

export default function AttendancePage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState("2026-08-26");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast, Toast } = useToast();

  useEffect(() => {
    fetch("/api/classes").then((r) => r.json()).then((j) => {
      if (j.success) {
        setClasses(j.data.classes);
        const firstSection = j.data.classes.flatMap((c: ClassRow) => c.sections)[0];
        if (firstSection) setSectionId(firstSection.id);
      }
    });
  }, []);

  const load = useCallback(async () => {
    if (!sectionId || !date) return;
    setLoading(true);
    const res = await fetch(`/api/attendance?sectionId=${sectionId}&date=${date}`);
    const json = await res.json();
    if (json.success) setRows(json.data);
    setLoading(false);
  }, [sectionId, date]);

  useEffect(() => { load(); }, [load]);

  function setStatus(studentId: string, status: string) {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, date, entries: rows.map((r) => ({ studentId: r.studentId, status: r.status })) }),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) { toast(json.error, "error"); return; }
    toast("Attendance saved");
  }

  const present = rows.filter((r) => r.status === "present").length;

  return (
    <div className="space-y-4">
      {Toast}
      <div><h1 className="text-xl font-semibold">Attendance</h1><p className="text-sm text-[var(--muted)]">Mark and review daily attendance</p></div>

      <Card className="p-4 flex flex-wrap items-end gap-4">
        <SectionSelect classes={classes} value={sectionId} onChange={setSectionId} className="w-56" />
        <div>
          <label className="text-sm font-medium mb-1 block">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <Badge tone="success">{present}/{rows.length} present</Badge>
        <div className="flex-1" />
        <Button onClick={handleSave} disabled={saving || rows.length === 0}>{saving ? "Saving..." : "Save attendance"}</Button>
      </Card>

      <Card>
        {loading ? <p className="p-6 text-sm text-[var(--muted)]">Loading...</p> : rows.length === 0 ? <EmptyState title="No students in this section" /> : (
          <table className="w-full text-sm">
            <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]"><tr><th className="py-3 px-4">Roll #</th><th>Name</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.studentId} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 px-4">{r.rollNumber}</td>
                  <td className="font-medium">{r.name}</td>
                  <td className="py-2">
                    <div className="flex gap-1 flex-wrap">
                      {STATUSES.map((st) => (
                        <button
                          key={st}
                          onClick={() => setStatus(r.studentId, st)}
                          className={`text-xs px-2 py-1 rounded-full border capitalize transition ${r.status === st ? "bg-indigo-600 border-indigo-600 text-white" : "border-[var(--border)] text-[var(--muted)] hover:border-indigo-400"}`}
                        >
                          {st.replace("_", " ")}
                        </button>
                      ))}
                    </div>
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
