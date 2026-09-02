"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, Badge, Button, Modal, Input, Label, EmptyState, useToast } from "@/components/ui";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Section = { id: string; name: string; roomNumber: string | null; capacity: number | null };
type ClassRow = { id: string; name: string; order: number; sections: Section[] };
type Subject = { id: string; name: string; code: string | null };

const emptyClassForm = { name: "", order: "0" };
const emptySectionForm = { name: "", roomNumber: "", capacity: "40" };
const emptySubjectForm = { name: "", code: "" };

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const { toast, Toast } = useToast();

  // Class modal
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);
  const [classForm, setClassForm] = useState(emptyClassForm);

  // Section modal
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [sectionClassId, setSectionClassId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionForm, setSectionForm] = useState(emptySectionForm);

  // Subject modal
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState(emptySubjectForm);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/classes");
    const json = await res.json();
    if (json.success) { setClasses(json.data.classes); setSubjects(json.data.subjects); }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => { if (j.success) setRole(j.data.role); });
    load();
  }, [load]);

  const canManage = ["admin", "manager"].includes(role);

  // --- Class handlers ---
  function openCreateClass() {
    setEditingClass(null);
    setClassForm(emptyClassForm);
    setClassModalOpen(true);
  }
  function openEditClass(c: ClassRow) {
    setEditingClass(c);
    setClassForm({ name: c.name, order: String(c.order) });
    setClassModalOpen(true);
  }
  async function handleSaveClass(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(editingClass ? `/api/classes/${editingClass.id}` : "/api/classes", {
      method: editingClass ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: classForm.name, order: Number(classForm.order) || 0 }),
    });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast(editingClass ? "Class updated" : "Class added");
    setClassModalOpen(false);
    load();
  }
  async function handleDeleteClass(id: string) {
    if (!confirm("Delete this class and all its sections?")) return;
    const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast("Class deleted");
    load();
  }

  // --- Section handlers ---
  function openCreateSection(classId: string) {
    setSectionClassId(classId);
    setEditingSection(null);
    setSectionForm(emptySectionForm);
    setSectionModalOpen(true);
  }
  function openEditSection(classId: string, sec: Section) {
    setSectionClassId(classId);
    setEditingSection(sec);
    setSectionForm({ name: sec.name, roomNumber: sec.roomNumber ?? "", capacity: String(sec.capacity ?? 40) });
    setSectionModalOpen(true);
  }
  async function handleSaveSection(e: React.FormEvent) {
    e.preventDefault();
    if (!sectionClassId) return;
    const res = await fetch(editingSection ? `/api/sections/${editingSection.id}` : "/api/sections", {
      method: editingSection ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: sectionClassId, name: sectionForm.name,
        roomNumber: sectionForm.roomNumber || undefined, capacity: Number(sectionForm.capacity) || undefined,
      }),
    });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast(editingSection ? "Section updated" : "Section added");
    setSectionModalOpen(false);
    load();
  }
  async function handleDeleteSection(id: string) {
    if (!confirm("Delete this section?")) return;
    const res = await fetch(`/api/sections/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast("Section deleted");
    load();
  }

  // --- Subject handlers ---
  function openCreateSubject() {
    setEditingSubject(null);
    setSubjectForm(emptySubjectForm);
    setSubjectModalOpen(true);
  }
  function openEditSubject(s: Subject) {
    setEditingSubject(s);
    setSubjectForm({ name: s.name, code: s.code ?? "" });
    setSubjectModalOpen(true);
  }
  async function handleSaveSubject(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(editingSubject ? `/api/subjects/${editingSubject.id}` : "/api/subjects", {
      method: editingSubject ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: subjectForm.name, code: subjectForm.code || undefined }),
    });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast(editingSubject ? "Subject updated" : "Subject added");
    setSubjectModalOpen(false);
    load();
  }
  async function handleDeleteSubject(id: string) {
    if (!confirm("Delete this subject?")) return;
    const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast("Subject deleted");
    load();
  }

  if (loading) return <p className="text-sm text-[var(--muted)]">Loading...</p>;

  return (
    <div className="space-y-6">
      {Toast}
      <div><h1 className="text-xl font-semibold">Academics</h1><p className="text-sm text-[var(--muted)]">Classes, sections and subjects for the current academic year</p></div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Classes & Sections</h3>
          {canManage && <Button onClick={openCreateClass}><span className="inline-flex items-center gap-1"><Plus size={15} /> Add Class</span></Button>}
        </div>
        {classes.length === 0 ? <EmptyState title="No classes configured" /> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {classes.sort((a, b) => a.order - b.order).map((c) => (
              <div key={c.id} className="border border-[var(--border)] rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{c.name}</p>
                  {canManage && (
                    <div className="flex gap-1">
                      <button onClick={() => openEditClass(c)} className="p-1 text-[var(--muted)] hover:text-indigo-600"><Pencil size={13} /></button>
                      <button onClick={() => handleDeleteClass(c.id)} className="p-1 text-[var(--muted)] hover:text-rose-600"><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {c.sections.map((sec) => (
                    <span key={sec.id} className="inline-flex items-center gap-1">
                      <Badge tone="default">Section {sec.name} · Room {sec.roomNumber ?? "-"}</Badge>
                      {canManage && (
                        <span className="inline-flex gap-0.5">
                          <button onClick={() => openEditSection(c.id, sec)} className="p-0.5 text-[var(--muted)] hover:text-indigo-600"><Pencil size={11} /></button>
                          <button onClick={() => handleDeleteSection(sec.id)} className="p-0.5 text-[var(--muted)] hover:text-rose-600"><Trash2 size={11} /></button>
                        </span>
                      )}
                    </span>
                  ))}
                  {canManage && (
                    <button onClick={() => openCreateSection(c.id)} className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-0.5">
                      <Plus size={12} /> Add section
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Subjects</h3>
          {canManage && <Button onClick={openCreateSubject}><span className="inline-flex items-center gap-1"><Plus size={15} /> Add Subject</span></Button>}
        </div>
        {subjects.length === 0 ? <EmptyState title="No subjects configured" /> : (
          <div className="flex flex-wrap gap-2">
            {subjects.map((sub) => (
              <span key={sub.id} className="inline-flex items-center gap-1">
                <Badge>{sub.name} {sub.code ? `(${sub.code})` : ""}</Badge>
                {canManage && (
                  <span className="inline-flex gap-0.5">
                    <button onClick={() => openEditSubject(sub)} className="p-0.5 text-[var(--muted)] hover:text-indigo-600"><Pencil size={12} /></button>
                    <button onClick={() => handleDeleteSubject(sub.id)} className="p-0.5 text-[var(--muted)] hover:text-rose-600"><Trash2 size={12} /></button>
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Modal open={classModalOpen} onClose={() => setClassModalOpen(false)} title={editingClass ? "Edit Class" : "Add Class"}>
        <form onSubmit={handleSaveClass} className="space-y-3">
          <div><Label>Class name</Label><Input required placeholder="e.g. Grade 6" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} /></div>
          <div><Label>Display order</Label><Input type="number" value={classForm.order} onChange={(e) => setClassForm({ ...classForm, order: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setClassModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingClass ? "Save changes" : "Add class"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={sectionModalOpen} onClose={() => setSectionModalOpen(false)} title={editingSection ? "Edit Section" : "Add Section"}>
        <form onSubmit={handleSaveSection} className="space-y-3">
          <div><Label>Section name</Label><Input required placeholder="e.g. A" value={sectionForm.name} onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Room number</Label><Input value={sectionForm.roomNumber} onChange={(e) => setSectionForm({ ...sectionForm, roomNumber: e.target.value })} /></div>
            <div><Label>Capacity</Label><Input type="number" value={sectionForm.capacity} onChange={(e) => setSectionForm({ ...sectionForm, capacity: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setSectionModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingSection ? "Save changes" : "Add section"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={subjectModalOpen} onClose={() => setSubjectModalOpen(false)} title={editingSubject ? "Edit Subject" : "Add Subject"}>
        <form onSubmit={handleSaveSubject} className="space-y-3">
          <div><Label>Subject name</Label><Input required placeholder="e.g. Mathematics" value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} /></div>
          <div><Label>Code (optional)</Label><Input placeholder="e.g. MATH" value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setSubjectModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingSubject ? "Save changes" : "Add subject"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
