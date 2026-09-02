"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, Badge, Button, Input, Label, useToast, EmptyState } from "@/components/ui";
import { Plus } from "lucide-react";

type ClassRow = { id: string; name: string; sections: { id: string; name: string }[] };
type Subject = { id: string; name: string; code: string | null };
type TestRow = { id: string; title: string; date: string; totalMarks: number; durationMinutes: number; className: string; subjectName: string; teacherFirstName: string; teacherLastName: string };
type ExamRow = { id: string; name: string; startDate: string | null; endDate: string | null; isPublished: boolean; scheduleCount: number; resultCount: number; averageMarks: number };
type Schedule = { id: string; sectionId: string; subjectId: string; subjectName: string; sectionName: string; className: string; date: string | null; maxMarks: number; passMarks: number; isPublished: boolean };
type ResultRow = { studentId: string; name: string; rollNumber: string | null; marksObtained: number | null; teacherComment: string };

function gradeFor(marks: number | null, max: number) {
  if (marks === null) return "—";
  const pct = (marks / max) * 100;
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
}
function passFail(marks: number | null, pass: number) {
  if (marks === null) return "—";
  return marks >= pass ? "Pass" : "Fail";
}

export default function ExamsPage() {
  const [tab, setTab] = useState<"tests" | "exams" | "results">("tests");
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const { toast, Toast } = useToast();

  useEffect(() => {
    fetch("/api/classes").then((r) => r.json()).then((j) => {
      if (j.success) { setClasses(j.data.classes); setSubjects(j.data.subjects); }
    });
  }, []);

  return (
    <div className="space-y-4">
      {Toast}
      <div>
        <h1 className="text-xl font-semibold">Tests & Exams</h1>
        <p className="text-sm text-[var(--muted)]">Schedule unit tests and multi-subject exams for classes.</p>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        {(["tests", "exams", "results"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition ${tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "tests" && <TestsTab classes={classes} subjects={subjects} toast={toast} />}
      {tab === "exams" && <ExamsTab />}
      {tab === "results" && <ResultsTab classes={classes} toast={toast} />}
    </div>
  );
}

function TestsTab({ classes, subjects, toast }: { classes: ClassRow[]; subjects: Subject[]; toast: (t: string, tone?: "success" | "error") => void }) {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ classId: "", subjectId: "", title: "", date: "", totalMarks: 100, durationMinutes: 60, description: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/tests");
    const json = await res.json();
    if (json.success) setTests(json.data);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/tests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast("Test created");
    setForm({ classId: "", subjectId: "", title: "", date: "", totalMarks: 100, durationMinutes: 60, description: "" });
    load();
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-medium mb-1 flex items-center gap-2"><Plus size={16} /> Create Test</h3>
        <p className="text-sm text-[var(--muted)] mb-4">Single-subject unit test for one class.</p>
        <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Class</Label>
            <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value, subjectId: "" })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
              <option value="">Select class...</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Subject</Label>
            <select required disabled={!form.classId} value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm disabled:opacity-50">
              <option value="">{form.classId ? "Select subject..." : "Select class first"}</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><Label>Title</Label><Input required placeholder="e.g. Unit Test 1 — Algebra" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Date</Label><Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div><Label>Total Marks</Label><Input type="number" required value={form.totalMarks} onChange={(e) => setForm({ ...form, totalMarks: Number(e.target.value) })} /></div>
          <div><Label>Duration (min)</Label><Input type="number" required value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} /></div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <textarea rows={2} placeholder="Optional notes..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2"><Button type="submit"><span className="inline-flex items-center gap-1"><Plus size={15} /> Create Test</span></Button></div>
        </form>
      </Card>

      <Card>
        {loading ? <p className="p-6 text-sm text-[var(--muted)]">Loading...</p> : tests.length === 0 ? <EmptyState title="No tests created yet" /> : (
          <table className="w-full text-sm">
            <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]"><tr><th className="py-3 px-4">Title</th><th>Class</th><th>Subject</th><th>Date</th><th>Marks</th><th>Teacher</th></tr></thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 px-4 font-medium">{t.title}</td>
                  <td>{t.className}</td>
                  <td>{t.subjectName}</td>
                  <td className="text-[var(--muted)]">{t.date}</td>
                  <td>{t.totalMarks}</td>
                  <td>{t.teacherFirstName} {t.teacherLastName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function ExamsTab() {
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/exams").then((r) => r.json()).then((j) => { if (j.success) setExams(j.data); setLoading(false); }); }, []);

  return (
    <Card>
      {loading ? <p className="p-6 text-sm text-[var(--muted)]">Loading...</p> : exams.length === 0 ? <EmptyState title="No exams scheduled" /> : (
        <table className="w-full text-sm">
          <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]"><tr><th className="py-3 px-4">Exam</th><th>Dates</th><th>Subjects</th><th>Results Recorded</th><th>Average</th></tr></thead>
          <tbody>
            {exams.map((ex) => (
              <tr key={ex.id} className="border-b border-[var(--border)] last:border-0">
                <td className="py-3 px-4 font-medium">{ex.name}</td>
                <td className="text-[var(--muted)]">{ex.startDate} → {ex.endDate}</td>
                <td>{ex.scheduleCount}</td>
                <td>{ex.resultCount}</td>
                <td>{ex.averageMarks}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function ResultsTab({ classes, toast }: { classes: ClassRow[]; toast: (t: string, tone?: "success" | "error") => void }) {
  const [sectionId, setSectionId] = useState("");
  const [exams, setExams] = useState<{ id: string; name: string }[]>([]);
  const [examId, setExamId] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [activeScheduleId, setActiveScheduleId] = useState("");
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch("/api/exams").then((r) => r.json()).then((j) => { if (j.success) setExams(j.data); }); }, []);

  useEffect(() => {
    if (!examId) { setSchedules([]); return; }
    fetch(`/api/exams/${examId}`).then((r) => r.json()).then((j) => {
      if (j.success) {
        const relevant = sectionId ? j.data.schedules.filter((sc: Schedule) => sc.sectionId === sectionId) : j.data.schedules;
        setSchedules(relevant);
        if (relevant.length > 0) setActiveScheduleId(relevant[0].id);
      }
    });
  }, [examId, sectionId]);

  const loadResults = useCallback(async (scheduleId: string) => {
    if (!scheduleId) return;
    const res = await fetch(`/api/exams/${examId}/results?scheduleId=${scheduleId}`);
    const json = await res.json();
    if (json.success) setRows(json.data.rows);
  }, [examId]);

  useEffect(() => { if (activeScheduleId) loadResults(activeScheduleId); }, [activeScheduleId, loadResults]);

  function setMarks(studentId: string, marks: string) {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, marksObtained: marks === "" ? null : Number(marks) } : r)));
  }
  function setComment(studentId: string, comment: string) {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, teacherComment: comment } : r)));
  }

  const activeSchedule = schedules.find((s) => s.id === activeScheduleId);

  async function handleSaveAll() {
    setSaving(true);
    const res = await fetch(`/api/exams/${examId}/results`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleId: activeScheduleId, entries: rows.map((r) => ({ studentId: r.studentId, marksObtained: r.marksObtained, teacherComment: r.teacherComment })) }),
    });
    const json = await res.json();
    setSaving(false);
    if (!json.success) { toast(json.error, "error"); return; }
    toast(`Saved ${json.data.saved} results`);
  }

  async function handlePublish(publish: boolean) {
    const res = await fetch(`/api/exams/${examId}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scheduleId: activeScheduleId, publish }) });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast(publish ? "Results published" : "Results unpublished");
    setSchedules((prev) => prev.map((sc) => (sc.id === activeScheduleId ? { ...sc, isPublished: publish } : sc)));
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-wrap gap-3 items-end">
        <div>
          <Label>Class / Section</Label>
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="w-56 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
            <option value="">All sections</option>
            {classes.map((c) => c.sections.map((sec) => <option key={sec.id} value={sec.id}>{c.name} - {sec.name}</option>))}
          </select>
        </div>
        <div>
          <Label>Select Exam</Label>
          <select value={examId} onChange={(e) => setExamId(e.target.value)} className="w-64 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
            <option value="">Choose exam...</option>
            {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>
        </div>
      </Card>

      {examId && schedules.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="font-medium">{exams.find((e) => e.id === examId)?.name}</h3>
              <p className="text-xs text-[var(--muted)]">{schedules.length} subjects</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleSaveAll} disabled={saving}>{saving ? "Saving..." : "Save All"}</Button>
              <Button onClick={() => handlePublish(true)}>Publish</Button>
              <Button variant="danger" onClick={() => handlePublish(false)}>Unpublish</Button>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap mb-4">
            {schedules.map((sc) => (
              <button key={sc.id} onClick={() => setActiveScheduleId(sc.id)} className={`px-3 py-1.5 rounded-full text-xs border transition ${activeScheduleId === sc.id ? "bg-indigo-600 border-indigo-600 text-white" : "border-[var(--border)] text-[var(--muted)] hover:border-indigo-400"}`}>
                {sc.subjectName} ({sc.date} · {sc.maxMarks}M) {sc.isPublished && "✓"}
              </button>
            ))}
          </div>

          <table className="w-full text-sm">
            <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]">
              <tr><th className="py-2 pr-4">#</th><th>Student</th><th>Roll</th><th>Marks / {activeSchedule?.maxMarks}</th><th>Remarks</th><th>Grade</th><th>Result</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.studentId} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 pr-4">{i + 1}</td>
                  <td className="font-medium">{r.name}</td>
                  <td>{r.rollNumber}</td>
                  <td>
                    <input type="number" min={0} max={activeSchedule?.maxMarks} value={r.marksObtained ?? ""} onChange={(e) => setMarks(r.studentId, e.target.value)} placeholder={`0-${activeSchedule?.maxMarks}`} className="w-24 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-sm" />
                  </td>
                  <td><input value={r.teacherComment} onChange={(e) => setComment(r.studentId, e.target.value)} placeholder="Optional" className="w-32 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-sm" /></td>
                  <td><Badge tone={r.marksObtained === null ? "default" : "success"}>{gradeFor(r.marksObtained, activeSchedule?.maxMarks ?? 100)}</Badge></td>
                  <td><Badge tone={r.marksObtained === null ? "default" : (r.marksObtained >= (activeSchedule?.passMarks ?? 0) ? "success" : "danger")}>{passFail(r.marksObtained, activeSchedule?.passMarks ?? 0)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {examId && schedules.length === 0 && <EmptyState title="No subjects scheduled for this exam yet" />}
    </div>
  );
}
