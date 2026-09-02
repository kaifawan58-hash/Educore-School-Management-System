"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, Badge, Select, Button, Modal, Input, Label, useToast, EmptyState, Pager, SectionSelect } from "@/components/ui";
import { Download, Printer, Plus, Trash2 } from "lucide-react";

type Invoice = { id: string; invoiceNumber: string; totalAmount: number; status: string; dueDate: string | null; studentFirstName: string; studentLastName: string; admissionNumber: string };
type Receipt = { receiptNumber: string; amount: number; method: string; paidAt: string; invoiceNumber: string; studentFirstName?: string; studentLastName?: string; admissionNumber?: string; rollNumber?: string | null; reference: string | null };
type Concession = { id: string; type: string; discountType: string; value: number; description: string | null; studentId: string; studentFirstName: string; studentLastName: string; feeStructureName: string | null };
type StudentOpt = { id: string; firstName: string; lastName: string; admissionNumber: string };
type ClassRow = { id: string; name: string; sections: { id: string; name: string }[] };

const TYPE_LABELS: Record<string, string> = { sibling: "Sibling", merit: "Merit", staff_ward: "Staff Ward", sc_st: "SC/ST", custom: "Custom" };

export default function FeesPage() {
  const [tab, setTab] = useState<"invoices" | "concessions">("invoices");
  const [rows, setRows] = useState<Invoice[]>([]);
  const [status, setStatus] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { toast, Toast } = useToast();
  const [summary, setSummary] = useState({ collected: 0, pending: 0 });

  const load = useCallback(async (st?: string, p?: number, sec?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (st) params.set("status", st);
    if (sec) params.set("sectionId", sec);
    params.set("page", String(p ?? 1));
    const res = await fetch(`/api/fees?${params.toString()}`);
    const json = await res.json();
    if (json.success) {
      setRows(json.data.rows);
      setTotalPages(json.data.pagination.totalPages);
      setTotal(json.data.pagination.total);
      setPage(json.data.pagination.page);
    }
    setLoading(false);
  }, []);

  function handleExport() {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (sectionId) params.set("sectionId", sectionId);
    window.open(`/api/fees/export?${params.toString()}`, "_blank");
  }

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => { if (j.success) setRole(j.data.role); });
    fetch("/api/fees/summary").then((r) => r.json()).then((j) => { if (j.success) setSummary(j.data); });
    fetch("/api/classes").then((r) => r.json()).then((j) => { if (j.success) setClasses(j.data.classes); });
    load();
  }, [load]);

  const canCollect = ["admin", "manager"].includes(role);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!payTarget) return;
    const res = await fetch(`/api/fees/${payTarget.id}/pay`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), method, reference: reference || undefined }),
    });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast("Payment recorded");
    setPayTarget(null);
    setReceipt(json.data.receipt);
    load(status, page, sectionId);
    fetch("/api/fees/summary").then((r) => r.json()).then((j) => { if (j.success) setSummary(j.data); });
  }

  return (
    <div className="space-y-4">
      {Toast}
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-semibold">Finance</h1><p className="text-sm text-[var(--muted)]">Invoices, fee collection & concessions · {total} invoices</p></div>
        {tab === "invoices" && <Button variant="secondary" onClick={handleExport}><span className="inline-flex items-center gap-1"><Download size={16} /> Export CSV</span></Button>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4"><p className="text-xs text-[var(--muted)]">Collected (all time)</p><p className="text-2xl font-semibold">PKR {summary.collected.toLocaleString()}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--muted)]">Outstanding (all time)</p><p className="text-2xl font-semibold">PKR {summary.pending.toLocaleString()}</p></Card>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        {(["invoices", "concessions"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition ${tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}>{t}</button>
        ))}
      </div>

      {tab === "invoices" && (
        <>
          <Card className="p-3 flex flex-wrap items-end gap-3">
            <div>
              <Label>Status</Label>
              <Select value={status} onChange={(e) => { setStatus(e.target.value); load(e.target.value, 1, sectionId); }} className="w-44">
                <option value="">All statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </Select>
            </div>
            <SectionSelect
              label="Class"
              classes={classes}
              value={sectionId}
              onChange={(sec) => { setSectionId(sec); load(status, 1, sec); }}
              includeAll
              className="w-48"
            />
          </Card>

          <Card>
            {loading ? <p className="p-6 text-sm text-[var(--muted)]">Loading...</p> : rows.length === 0 ? <EmptyState title="No invoices found" /> : (
              <table className="w-full text-sm">
                <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]"><tr><th className="py-3 px-4">Invoice #</th><th>Student</th><th>Amount</th><th>Due</th><th>Status</th>{canCollect && <th className="text-right pr-4">Action</th>}</tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-3 px-4">{r.invoiceNumber}</td>
                      <td>{r.studentFirstName} {r.studentLastName} <span className="text-[var(--muted)]">({r.admissionNumber})</span></td>
                      <td>PKR {r.totalAmount.toLocaleString()}</td>
                      <td>{r.dueDate ?? "-"}</td>
                      <td><Badge tone={r.status === "paid" ? "success" : r.status === "partial" ? "warning" : "danger"}>{r.status}</Badge></td>
                      {canCollect && (
                        <td className="text-right pr-4">
                          {r.status !== "paid" && (
                            <button onClick={() => { setPayTarget(r); setAmount(String(r.totalAmount)); setMethod("cash"); setReference(""); }} className="text-xs text-indigo-600 hover:underline">Record payment</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Pager page={page} totalPages={totalPages} onPageChange={(p) => load(status, p, sectionId)} />
          </Card>
        </>
      )}

      {tab === "concessions" && <ConcessionsTab canManage={canCollect} toast={toast} />}

      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title={`Record payment - ${payTarget?.invoiceNumber ?? ""}`}>
        <form onSubmit={handlePay} className="space-y-3">
          <div><Label>Amount (PKR)</Label><Input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div>
            <Label>Payment Mode</Label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div><Label>Reference (optional)</Label><Input placeholder="Cheque no., transaction ref..." value={reference} onChange={(e) => setReference(e.target.value)} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPayTarget(null)}>Cancel</Button>
            <Button type="submit">Confirm & Record</Button>
          </div>
        </form>
      </Modal>

      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

function ReceiptModal({ receipt, onClose }: { receipt: Receipt | null; onClose: () => void }) {
  if (!receipt) return null;
  return (
    <Modal open={!!receipt} onClose={onClose} title="Payment Receipt">
      <div id="receipt-print" className="space-y-4 text-sm">
        <div className="text-center border-b border-[var(--border)] pb-3">
          <p className="font-semibold text-base">EduCore School</p>
          <p className="text-[var(--muted)] text-xs">Fee Payment Receipt</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-[var(--muted)] text-xs">Receipt No</p><p className="font-medium">{receipt.receiptNumber}</p></div>
          <div><p className="text-[var(--muted)] text-xs">Date</p><p className="font-medium">{new Date(receipt.paidAt).toLocaleDateString()}</p></div>
          <div><p className="text-[var(--muted)] text-xs">Student</p><p className="font-medium">{receipt.studentFirstName} {receipt.studentLastName}</p></div>
          <div><p className="text-[var(--muted)] text-xs">Admission #</p><p className="font-medium">{receipt.admissionNumber}</p></div>
        </div>
        <div className="border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="flex justify-between px-3 py-2 bg-slate-50 dark:bg-white/5 text-xs font-medium"><span>Description</span><span>Amount</span></div>
          <div className="flex justify-between px-3 py-2"><span>{receipt.invoiceNumber}</span><span>PKR {receipt.amount.toLocaleString()}</span></div>
          <div className="flex justify-between px-3 py-2 border-t border-[var(--border)] font-semibold"><span>Amount Paid</span><span className="text-emerald-600">PKR {receipt.amount.toLocaleString()}</span></div>
        </div>
        <div className="flex justify-between text-xs text-[var(--muted)]">
          <span>Mode: <span className="capitalize text-[var(--foreground)]">{receipt.method.replace("_", " ")}</span></span>
          {receipt.reference && <span>Ref: {receipt.reference}</span>}
        </div>
        <p className="text-center text-xs text-[var(--muted)] pt-2 border-t border-[var(--border)]">Computer-generated receipt · No signature required</p>
      </div>
      <Button onClick={() => window.print()} className="w-full mt-4"><span className="inline-flex items-center gap-1"><Printer size={15} /> Print Receipt</span></Button>
    </Modal>
  );
}

function ConcessionsTab({ canManage, toast }: { canManage: boolean; toast: (t: string, tone?: "success" | "error") => void }) {
  const [concessions, setConcessions] = useState<Concession[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [form, setForm] = useState({ studentId: "", type: "sibling", discountType: "percent", value: "", description: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/concessions");
    const json = await res.json();
    if (json.success) setConcessions(json.data);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function openModal() {
    setModalOpen(true);
    if (students.length === 0) {
      const res = await fetch("/api/students?pageSize=100");
      const json = await res.json();
      if (json.success) setStudents(json.data.rows);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/concessions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, value: Number(form.value) }),
    });
    const json = await res.json();
    if (!json.success) { toast(json.error, "error"); return; }
    toast("Concession added");
    setModalOpen(false);
    setForm({ studentId: "", type: "sibling", discountType: "percent", value: "", description: "" });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this concession?")) return;
    await fetch(`/api/concessions/${id}`, { method: "DELETE" });
    toast("Concession removed");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-[var(--muted)]">Apply % or flat discounts per student per fee head</p>
        {canManage && <Button onClick={openModal}><span className="inline-flex items-center gap-1"><Plus size={15} /> Add Concession</span></Button>}
      </div>
      <Card>
        {loading ? <p className="p-6 text-sm text-[var(--muted)]">Loading...</p> : concessions.length === 0 ? <EmptyState title="No concessions applied yet" /> : (
          <table className="w-full text-sm">
            <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]"><tr><th className="py-3 px-4">Student</th><th>Fee</th><th>Type</th><th>Discount</th><th>Description</th>{canManage && <th className="text-right pr-4">Actions</th>}</tr></thead>
            <tbody>
              {concessions.map((c) => (
                <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 px-4 font-medium">{c.studentFirstName} {c.studentLastName}</td>
                  <td>{c.feeStructureName ?? <span className="text-[var(--muted)]">All fees</span>}</td>
                  <td><Badge>{TYPE_LABELS[c.type]}</Badge></td>
                  <td>{c.discountType === "percent" ? `${c.value}%` : `PKR ${c.value.toLocaleString()}`}</td>
                  <td className="text-[var(--muted)] text-xs">{c.description ?? "-"}</td>
                  {canManage && <td className="text-right pr-4"><button onClick={() => handleDelete(c.id)} className="text-[var(--muted)] hover:text-rose-600"><Trash2 size={15} /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Concession">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <Label>Student</Label>
            <select required value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
              <option value="">Select student...</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.admissionNumber})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Concession Type</Label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <Label>Discount Type</Label>
              <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
                <option value="percent">Percent (%)</option>
                <option value="flat">Flat (PKR)</option>
              </select>
            </div>
          </div>
          <div><Label>Value</Label><Input type="number" required value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
          <div><Label>Description (optional)</Label><Input placeholder="e.g. Sibling concession approved for 2026-27" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">Add Concession</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
