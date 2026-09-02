"use client";
import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS: Record<string, string> = { present: "#10b981", absent: "#f43f5e", late: "#f59e0b", excused: "#64748b", half_day: "#0ea5a4" };

export default function AttendanceChart() {
  const [data, setData] = useState<{ status: string; count: number }[]>([]);
  useEffect(() => {
    fetch("/api/reports/attendance-summary").then((r) => r.json()).then((j) => { if (j.success) setData(j.data); });
  }, []);
  if (data.length === 0) return <p className="text-sm text-[var(--muted)] py-10 text-center">No attendance data yet.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="status" innerRadius={45} outerRadius={75} paddingAngle={2}>
          {data.map((d) => <Cell key={d.status} fill={COLORS[d.status] ?? "#94a3b8"} />)}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
