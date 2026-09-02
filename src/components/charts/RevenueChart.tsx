"use client";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function RevenueChart() {
  const [data, setData] = useState<{ day: string; amount: number }[]>([]);
  useEffect(() => {
    fetch("/api/reports/revenue").then((r) => r.json()).then((j) => { if (j.success) setData(j.data); });
  }, []);
  if (data.length === 0) return <p className="text-sm text-[var(--muted)] py-10 text-center">No payment data yet.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="day" fontSize={12} stroke="var(--muted)" />
        <YAxis fontSize={12} stroke="var(--muted)" />
        <Tooltip />
        <Line type="monotone" dataKey="amount" stroke="#4338ca" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
