"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, Button, Badge, useToast, EmptyState } from "@/components/ui";
import { Check, Link2 } from "lucide-react";

type ClassRow = { id: string; name: string; order: number };
type Subject = { id: string; name: string; code: string | null };
type Assignment = { classId: string; subjectId: string };

export default function SubjectClassPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"subjects" | "assign" | "summary">("subjects");
  const { toast, Toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/subject-class");
    const json = await res.json();
    if (json.success) {
      setClasses(json.data.classes.sort((a: ClassRow, b: ClassRow) => a.order - b.order));
      setSubjects(json.data.subjects);
      setAssignments(json.data.assignments);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const isAssigned = (classId: string, subjectId: string) => assignments.some((a) => a.classId === classId && a.subjectId === subjectId);

  // --- Single assignment state ---
  const [singleClassId, setSingleClassId] = useState("");
  const [singleSelected, setSingleSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!singleClassId) { setSingleSelected(new Set()); return; }
    setSingleSelected(new Set(assignments.filter((a) => a.classId === singleClassId).map((a) => a.subjectId)));
  }, [singleClassId, assignments]);

  function toggleSingle(subjectId: string) {
    setSingleSelected((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) next.delete(subjectId); else next.add(subjectId);
      return next;
    });
  }

  async function handleSingleAssign() {
    if (!singleClassId) { toast("Choose a class first", "error"); return; }
    const res = await fetch("/api/subject-class", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: singleClassId, subjectIds: [...singleSelected] }),
    });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast("Subjects assigned");
    load();
  }

  // --- Bulk assignment state ---
  const [bulkClasses, setBulkClasses] = useState<Set<string>>(new Set());
  const [bulkSubjects, setBulkSubjects] = useState<Set<string>>(new Set());

  function toggleBulkClass(id: string) {
    setBulkClasses((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleBulkSubject(id: string) {
    setBulkSubjects((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function handleBulkAssign() {
    if (bulkClasses.size === 0 || bulkSubjects.size === 0) { toast("Pick at least one class and one subject", "error"); return; }
    const res = await fetch("/api/subject-class", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classIds: [...bulkClasses], subjectIds: [...bulkSubjects] }),
    });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast(`${json.data.added} assignment(s) added`);
    setBulkClasses(new Set());
    setBulkSubjects(new Set());
    load();
  }

  return (
    <div className="space-y-4">
      {Toast}
      <div>
        <h1 className="text-xl font-semibold">Subject & Class</h1>
        <p className="text-sm text-[var(--muted)]">Manage subjects and assign them to classes</p>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        {(["subjects", "assign", "summary"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition ${tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}
          >
            {t === "assign" ? "Assign Subjects" : t}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-[var(--muted)]">Loading...</p> : (
        <>
          {tab === "subjects" && (
            <Card className="p-4">
              <h3 className="font-medium mb-3">All Subjects</h3>
              {subjects.length === 0 ? <EmptyState title="No subjects yet" /> : (
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s) => <Badge key={s.id}>{s.name} {s.code ? `(${s.code})` : ""}</Badge>)}
                </div>
              )}
            </Card>
          )}

          {tab === "assign" && (
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="font-medium mb-1 flex items-center gap-2"><Link2 size={16} /> Single Assignment</h3>
                <p className="text-sm text-[var(--muted)] mb-3">Select one class and assign subjects to it.</p>
                <label className="text-sm font-medium mb-1 block">Select Class</label>
                <select value={singleClassId} onChange={(e) => setSingleClassId(e.target.value)} className="w-full sm:w-64 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm mb-4">
                  <option value="">Choose a class...</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                {singleClassId && (
                  <>
                    <label className="text-sm font-medium mb-2 block">Select Subjects to Assign</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                      {subjects.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 text-sm border border-[var(--border)] rounded-lg px-3 py-2 cursor-pointer hover:border-indigo-400">
                          <input type="checkbox" checked={singleSelected.has(s.id)} onChange={() => toggleSingle(s.id)} />
                          {s.name} <span className="text-[var(--muted)] text-xs">{s.code}</span>
                        </label>
                      ))}
                    </div>
                    <Button onClick={handleSingleAssign}><span className="inline-flex items-center gap-1"><Check size={15} /> Assign Subjects</span></Button>
                  </>
                )}
              </Card>

              <Card className="p-4">
                <h3 className="font-medium mb-1">Bulk Assignment</h3>
                <p className="text-sm text-[var(--muted)] mb-3">Select multiple classes and subjects, then assign them all at once.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-[var(--muted)] mb-2">Select Classes ({bulkClasses.size} selected)</p>
                    <div className="border border-[var(--border)] rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                      {classes.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer">
                          <input type="checkbox" checked={bulkClasses.has(c.id)} onChange={() => toggleBulkClass(c.id)} />
                          {c.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--muted)] mb-2">Select Subjects ({bulkSubjects.size} selected)</p>
                    <div className="border border-[var(--border)] rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                      {subjects.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer">
                          <input type="checkbox" checked={bulkSubjects.has(s.id)} onChange={() => toggleBulkSubject(s.id)} />
                          {s.name} <span className="text-[var(--muted)] text-xs">{s.code}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <Button onClick={handleBulkAssign} className="mt-4"><span className="inline-flex items-center gap-1"><Check size={15} /> Assign subjects to selected classes</span></Button>
              </Card>

              <Card className="p-4">
                <h3 className="font-medium mb-3">Per-Class Assignment Overview</h3>
                <div className="space-y-2">
                  {classes.map((c) => {
                    const count = assignments.filter((a) => a.classId === c.id).length;
                    return (
                      <div key={c.id} className="flex items-center justify-between border border-[var(--border)] rounded-lg px-3 py-2 text-sm">
                        <span className="font-medium">{c.name}</span>
                        <Badge tone={count > 0 ? "success" : "default"}>{count} subjects</Badge>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {tab === "summary" && (
            <Card className="p-4 overflow-x-auto">
              <h3 className="font-medium mb-1">Assignment Matrix</h3>
              <p className="text-xs text-[var(--muted)] mb-3">Rows = classes · Columns = subjects · ✓ = assigned</p>
              <table className="text-sm min-w-full">
                <thead>
                  <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                    <th className="py-2 pr-4">Class</th>
                    {subjects.map((s) => <th key={s.id} className="px-3 py-2 text-center whitespace-nowrap">{s.name}<br /><span className="font-normal text-xs">{s.code}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2 pr-4 font-medium whitespace-nowrap">{c.name}</td>
                      {subjects.map((s) => (
                        <td key={s.id} className="px-3 py-2 text-center">
                          {isAssigned(c.id, s.id) ? <Check size={15} className="inline text-emerald-600" /> : <span className="text-[var(--muted)]">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
