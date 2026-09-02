"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, Button, Modal, Input, Label, useToast, EmptyState, SectionSelect } from "@/components/ui";
import { Settings, Trash2, Plus } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const COLORS = ["bg-indigo-50 text-indigo-700 border-indigo-200", "bg-teal-50 text-teal-700 border-teal-200", "bg-amber-50 text-amber-700 border-amber-200", "bg-rose-50 text-rose-700 border-rose-200", "bg-violet-50 text-violet-700 border-violet-200", "bg-emerald-50 text-emerald-700 border-emerald-200"];

type Period = { id: string; label: string; startTime: string; endTime: string; isBreak: boolean; sortOrder: number };
type ClassRow = { id: string; name: string; sections: { id: string; name: string }[] };
type Subject = { id: string; name: string };
type Teacher = { id: string; firstName: string; lastName: string };
type Slot = { id: string; dayOfWeek: number; startTime: string; endTime: string; room: string | null; subjectId: string; teacherId: string; subjectName: string; teacherFirstName: string; teacherLastName: string };
type MySlot = { id: string; dayOfWeek: number; startTime: string; endTime: string; room: string | null; subjectName: string; sectionName: string; className: string };

function colorFor(name: string) {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return COLORS[h % COLORS.length];
}

export default function TimetablePage() {
  const [role, setRole] = useState("");
  useEffect(() => { fetch("/api/auth/me").then((r) => r.json()).then((j) => { if (j.success) setRole(j.data.role); }); }, []);
  if (!role) return <p className="text-sm text-[var(--muted)]">Loading...</p>;
  return role === "teacher" ? <MyTimetable /> : <AdminTimetable />;
}

function MyTimetable() {
  const [slots, setSlots] = useState<MySlot[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/timetable/mine").then((r) => r.json()).then((j) => { if (j.success) setSlots(j.data); setLoading(false); }); }, []);

  const byTime = [...new Set(slots.map((s) => s.startTime))].sort();
  const subjectNames = [...new Set(slots.map((s) => s.subjectName))];

  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-semibold">Weekly Timetable</h1><p className="text-sm text-[var(--muted)]">Your class schedule for the week</p></div>
      {subjectNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {subjectNames.map((name) => (
            <span key={name} className={`text-xs px-3 py-1 rounded-full border font-medium ${colorFor(name)}`}>{name}</span>
          ))}
        </div>
      )}
      <Card>
        {loading ? <p className="p-6 text-sm text-[var(--muted)]">Loading...</p> : slots.length === 0 ? <EmptyState title="No classes scheduled for you yet" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                  <th className="py-3 px-4">Time</th>
                  {DAYS.map((d) => <th key={d} className="px-3 py-3 text-center">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {byTime.map((time) => (
                  <tr key={time} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 px-4 text-xs text-[var(--muted)] whitespace-nowrap">{time}</td>
                    {DAYS.map((_, dayIdx) => {
                      const slot = slots.find((s) => s.dayOfWeek === dayIdx && s.startTime === time);
                      return (
                        <td key={dayIdx} className="px-2 py-2 text-center">
                          {slot ? (
                            <div className={`rounded-lg border px-2 py-1.5 text-xs ${colorFor(slot.subjectName)}`}>
                              <div className="font-medium">{slot.subjectName}</div>
                              <div className="opacity-75">{slot.className}-{slot.sectionName}</div>
                            </div>
                          ) : <span className="text-[var(--muted)]">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function AdminTimetable() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [editCell, setEditCell] = useState<{ day: number; period: Period } | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editTeacher, setEditTeacher] = useState("");
  const [periodsModalOpen, setPeriodsModalOpen] = useState(false);
  const { toast, Toast } = useToast();

  useEffect(() => {
    fetch("/api/classes").then((r) => r.json()).then((j) => {
      if (j.success) {
        setClasses(j.data.classes);
        setSubjects(j.data.subjects);
        const first = j.data.classes.flatMap((c: ClassRow) => c.sections)[0];
        if (first) setSectionId(first.id);
      }
    });
    fetch("/api/teachers").then((r) => r.json()).then((j) => { if (j.success) setTeachers(j.data.rows ?? j.data); });
  }, []);

  const loadPeriods = useCallback(async () => {
    const res = await fetch("/api/periods");
    const json = await res.json();
    if (json.success) setPeriods(json.data);
  }, []);

  const loadSlots = useCallback(async () => {
    if (!sectionId) return;
    setLoading(true);
    const res = await fetch(`/api/timetable?sectionId=${sectionId}`);
    const json = await res.json();
    if (json.success) setSlots(json.data);
    setLoading(false);
  }, [sectionId]);

  useEffect(() => { loadSlots(); }, [loadSlots]);
  useEffect(() => { loadPeriods(); }, [loadPeriods]);

  function openCell(day: number, period: Period) {
    const existing = slots.find((s) => s.dayOfWeek === day && s.startTime === period.startTime);
    setEditSubject(existing?.subjectId ?? "");
    setEditTeacher(existing?.teacherId ?? "");
    setEditCell({ day, period });
  }

  async function handleSave() {
    if (!editCell) return;
    const res = await fetch("/api/timetable", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, dayOfWeek: editCell.day, startTime: editCell.period.startTime, endTime: editCell.period.endTime, subjectId: editSubject || null, teacherId: editTeacher || null }),
    });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast("Saved");
    setEditCell(null);
    loadSlots();
  }

  async function handleClear() {
    if (!editCell) return;
    await fetch("/api/timetable", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, dayOfWeek: editCell.day, startTime: editCell.period.startTime, endTime: editCell.period.endTime, subjectId: null, teacherId: null }),
    });
    toast("Cleared");
    setEditCell(null);
    loadSlots();
  }

  return (
    <div className="space-y-4">
      {Toast}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-semibold">Weekly Timetable</h1><p className="text-sm text-[var(--muted)]">View and manage class schedules</p></div>
        <div className="flex gap-2 items-end">
          <SectionSelect classes={classes} value={sectionId} onChange={setSectionId} className="w-44" />
          <Button variant="secondary" onClick={() => setPeriodsModalOpen(true)}><span className="inline-flex items-center gap-1"><Settings size={15} /> Manage Periods</span></Button>
        </div>
      </div>

      {[...new Set(slots.map((s) => s.subjectName))].length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[...new Set(slots.map((s) => s.subjectName))].map((name) => (
            <span key={name} className={`text-xs px-3 py-1 rounded-full border font-medium ${colorFor(name)}`}>{name}</span>
          ))}
        </div>
      )}

      <Card className="overflow-x-auto">
        {loading || periods.length === 0 ? <p className="p-6 text-sm text-[var(--muted)]">{periods.length === 0 ? "Add periods via \"Manage Periods\" to get started." : "Loading..."}</p> : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                <th className="py-3 px-4">Time</th>
                {DAYS.map((d) => <th key={d} className="px-3 py-3 text-center">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 px-4 whitespace-nowrap">
                    <div className="font-medium text-xs">{p.label}</div>
                    <div className="text-[var(--muted)] text-xs">{p.startTime}–{p.endTime}</div>
                  </td>
                  {p.isBreak ? (
                    <td colSpan={DAYS.length} className="text-center text-xs text-[var(--muted)] italic bg-slate-50 dark:bg-white/5">{p.label}</td>
                  ) : (
                    DAYS.map((_, dayIdx) => {
                      const slot = slots.find((s) => s.dayOfWeek === dayIdx && s.startTime === p.startTime);
                      return (
                        <td key={dayIdx} className="px-1.5 py-1.5 text-center">
                          <button onClick={() => openCell(dayIdx, p)} className={`w-full rounded-lg border px-2 py-1.5 text-xs transition hover:opacity-80 ${slot ? colorFor(slot.subjectName) : "border-dashed border-[var(--border)] text-[var(--muted)]"}`}>
                            {slot ? (<><div className="font-medium">{slot.subjectName}</div><div className="opacity-75">{slot.teacherFirstName} {slot.teacherLastName}</div></>) : "—"}
                          </button>
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={!!editCell} onClose={() => setEditCell(null)} title={`Edit Entry — ${editCell ? DAYS[editCell.day] : ""} · ${editCell?.period.label ?? ""}`}>
        <div className="space-y-3">
          <div>
            <Label>Subject</Label>
            <select value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
              <option value="">— none —</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Teacher (optional)</Label>
            <select value={editTeacher} onChange={(e) => setEditTeacher(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
              <option value="">— none —</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
            </select>
          </div>
          <div className="flex justify-between gap-2 pt-2">
            <Button variant="danger" onClick={handleClear}><span className="inline-flex items-center gap-1"><Trash2 size={14} /> Clear</span></Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditCell(null)}>Cancel</Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </div>
      </Modal>

      <PeriodsModal open={periodsModalOpen} onClose={() => { setPeriodsModalOpen(false); loadPeriods(); }} periods={periods} onChange={loadPeriods} toast={toast} />
    </div>
  );
}

function PeriodsModal({ open, onClose, periods, onChange, toast }: { open: boolean; onClose: () => void; periods: Period[]; onChange: () => void; toast: (t: string, tone?: "success" | "error") => void }) {
  const [label, setLabel] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isBreak, setIsBreak] = useState(false);

  async function handleAdd() {
    if (!label || !startTime || !endTime) { toast("Fill in label, start and end time", "error"); return; }
    const res = await fetch("/api/periods", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, startTime, endTime, isBreak }) });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    setLabel(""); setStartTime(""); setEndTime(""); setIsBreak(false);
    onChange();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/periods/${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <Modal open={open} onClose={onClose} title="Manage Periods">
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {periods.map((p) => (
          <div key={p.id} className="flex items-center justify-between border border-[var(--border)] rounded-lg px-3 py-2 text-sm">
            <div><span className="font-medium">{p.label}</span> <span className="text-[var(--muted)] text-xs">{p.startTime}–{p.endTime}{p.isBreak && " · break"}</span></div>
            <button onClick={() => handleDelete(p.id)} className="text-[var(--muted)] hover:text-rose-600"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--border)] mt-4 pt-4 space-y-3">
        <p className="text-sm font-medium">Add New Row</p>
        <div><Label>Label</Label><Input placeholder="e.g. Period 8, Lunch, Assembly" value={label} onChange={(e) => setLabel(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Start Time</Label><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
          <div><Label>End Time</Label><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isBreak} onChange={(e) => setIsBreak(e.target.checked)} /> This is a break / lunch (not editable in timetable)</label>
        <Button onClick={handleAdd} className="w-full"><span className="inline-flex items-center gap-1"><Plus size={15} /> Add Period</span></Button>
      </div>
    </Modal>
  );
}
