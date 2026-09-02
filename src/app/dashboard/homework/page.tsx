"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, Badge, Button, Modal, Input, Label, useToast, EmptyState } from "@/components/ui";
import { Plus } from "lucide-react";

type Assignment = { id: string; title: string; description: string | null; dueDate: string | null; sectionName: string; subjectName: string; submissionCount: number };

export default function HomeworkPage() {
  const [rows, setRows] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const { toast, Toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/homework");
    const json = await res.json();
    if (json.success) setRows(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => { if (j.success) setRole(j.data.role); });
    load();
  }, [load]);

  const isTeacher = role === "teacher";

  return (
    <div className="space-y-4">
      {Toast}
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-semibold">Homework</h1><p className="text-sm text-[var(--muted)]">Assignments across all classes</p></div>
      </div>
      <Card>
        {loading ? <p className="p-6 text-sm text-[var(--muted)]">Loading...</p> : rows.length === 0 ? <EmptyState title="No assignments yet" /> : (
          <table className="w-full text-sm">
            <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]"><tr><th className="py-3 px-4">Title</th><th>Class</th><th>Subject</th><th>Due</th><th>Submissions</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 px-4 font-medium">{a.title}</td>
                  <td>{a.sectionName}</td>
                  <td>{a.subjectName}</td>
                  <td>{a.dueDate ?? "-"}</td>
                  <td><Badge>{a.submissionCount}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
