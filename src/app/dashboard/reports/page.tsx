"use client";
import { Card } from "@/components/ui";
import RevenueChart from "@/components/charts/RevenueChart";
import AttendanceChart from "@/components/charts/AttendanceChart";

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-semibold">Reports</h1><p className="text-sm text-[var(--muted)]">School-wide analytics, generated from live data</p></div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-medium mb-3">Fee Collection Trend</h3>
          <RevenueChart />
        </Card>
        <Card className="p-4">
          <h3 className="font-medium mb-3">Attendance Distribution</h3>
          <AttendanceChart />
        </Card>
      </div>
      <Card className="p-4">
        <h3 className="font-medium mb-2">Export</h3>
        <p className="text-sm text-[var(--muted)]">
          Students and Fees already have working CSV export (see the Export CSV button on those
          pages). Attendance and exam exports follow the same pattern &mdash; each module&rsquo;s
          list API returns clean structured JSON that a small wrapper endpoint streams as CSV
          instead of JSON. See the README&rsquo;s &ldquo;Extending EduCore&rdquo; section for the
          exact pattern to copy.
        </p>
      </Card>
    </div>
  );
}
