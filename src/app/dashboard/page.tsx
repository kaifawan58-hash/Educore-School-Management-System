import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, sql, desc, gte } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { StatCard, Card, Badge } from "@/components/ui";
import RevenueChart from "@/components/charts/RevenueChart";
import AttendanceChart from "@/components/charts/AttendanceChart";
import Link from "next/link";

export default async function DashboardHome() {
  const session = await getSession();

  const [[{ count: totalStudents }]] = [await db.select({ count: sql<number>`count(*)` }).from(s.students)];
  const [[{ count: totalTeachers }]] = [await db.select({ count: sql<number>`count(*)` }).from(s.teachers)];

  const today = "2026-08-26"; // demo "today" inside seeded attendance window
  const [[{ count: presentToday }]] = [
    await db.select({ count: sql<number>`count(*)` }).from(s.studentAttendance).where(eq(s.studentAttendance.date, today)),
  ];

  const [[{ total: feeCollected }]] = [
    await db.select({ total: sql<number>`coalesce(sum(amount),0)` }).from(s.payments),
  ];
  const [[{ total: feePending }]] = [
    await db
      .select({ total: sql<number>`coalesce(sum(total_amount),0)` })
      .from(s.invoices)
      .where(eq(s.invoices.status, "unpaid")),
  ];

  const recentAdmissions = await db
    .select({ id: s.students.id, firstName: s.students.firstName, lastName: s.students.lastName, admissionNumber: s.students.admissionNumber, admissionDate: s.students.admissionDate })
    .from(s.students)
    .orderBy(desc(s.students.createdAt))
    .limit(5);

  const recentPayments = await db
    .select({ id: s.payments.id, amount: s.payments.amount, method: s.payments.method, paidAt: s.payments.paidAt, invoiceId: s.payments.invoiceId })
    .from(s.payments)
    .orderBy(desc(s.payments.paidAt))
    .limit(5);

  const announcements = await db.select().from(s.announcements).orderBy(desc(s.announcements.createdAt)).limit(3);

  // students with low attendance (simple insight: attendance rate < 80% over seeded window)
  const attendanceRows = await db.select().from(s.studentAttendance);
  const byStudent = new Map<string, { present: number; total: number }>();
  for (const row of attendanceRows) {
    const cur = byStudent.get(row.studentId) ?? { present: 0, total: 0 };
    cur.total += 1;
    if (row.status === "present") cur.present += 1;
    byStudent.set(row.studentId, cur);
  }
  const lowAttendanceCount = [...byStudent.values()].filter((v) => v.total > 0 && v.present / v.total < 0.8).length;

  const [[{ count: unpaidInvoices }]] = [
    await db.select({ count: sql<number>`count(*)` }).from(s.invoices).where(eq(s.invoices.status, "unpaid")),
  ];

  const upcomingExams = await db.select().from(s.exams).where(gte(s.exams.startDate, "2026-08-01")).limit(3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Welcome back, {session?.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-[var(--muted)]">Here&rsquo;s what&rsquo;s happening at Greenwood International School today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={totalStudents} hint="Active enrollment" accent="indigo" />
        <StatCard label="Total Teachers" value={totalTeachers} hint="On staff" accent="teal" />
        <StatCard label="Attendance Today" value={presentToday} hint={`${today}`} accent="amber" />
        <StatCard label="Fees Collected" value={`PKR ${Number(feeCollected).toLocaleString()}`} hint={`PKR ${Number(feePending).toLocaleString()} pending`} accent="rose" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <h3 className="font-medium mb-3">Fee Collection (Recent Payments)</h3>
          <RevenueChart />
        </Card>
        <Card className="p-4">
          <h3 className="font-medium mb-3">Attendance Overview</h3>
          <AttendanceChart />
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="font-medium mb-3">Smart Alerts</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span>Students with low attendance</span>
              <Badge tone={lowAttendanceCount > 0 ? "warning" : "success"}>{lowAttendanceCount}</Badge>
            </li>
            <li className="flex items-center justify-between">
              <span>Unpaid invoices</span>
              <Badge tone={unpaidInvoices > 0 ? "danger" : "success"}>{unpaidInvoices}</Badge>
            </li>
            <li className="flex items-center justify-between">
              <span>Upcoming exams</span>
              <Badge tone="default">{upcomingExams.length}</Badge>
            </li>
          </ul>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium mb-3">Recent Admissions</h3>
          <ul className="space-y-2 text-sm">
            {recentAdmissions.map((r) => (
              <li key={r.id} className="flex justify-between">
                <span>{r.firstName} {r.lastName}</span>
                <span className="text-[var(--muted)]">{r.admissionNumber}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium mb-3">Announcements</h3>
          <ul className="space-y-3 text-sm">
            {announcements.map((a) => (
              <li key={a.id}>
                <p className="font-medium">{a.title}</p>
                <p className="text-[var(--muted)] text-xs mt-0.5 line-clamp-2">{a.body}</p>
              </li>
            ))}
          </ul>
          <Link href="/dashboard/communication" className="text-xs text-indigo-600 hover:underline mt-3 inline-block">View all →</Link>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-medium mb-3">Recent Payments</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]">
            <tr><th className="py-2">Amount</th><th>Method</th><th>Paid At</th></tr>
          </thead>
          <tbody>
            {recentPayments.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                <td className="py-2">PKR {p.amount.toLocaleString()}</td>
                <td className="capitalize">{p.method.replace("_", " ")}</td>
                <td className="text-[var(--muted)]">{p.paidAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
