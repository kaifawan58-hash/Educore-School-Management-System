import { db } from "@/db";
import * as s from "@/db/schema";
import { ok, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export async function GET() {
  return handleApi(async () => {
    await requireSession();
    const rows = await db.select().from(s.payments);
    const byDay = new Map<string, number>();
    for (const r of rows) {
      const day = (r.paidAt || "").slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + r.amount);
    }
    const data = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, amount]) => ({ day, amount }));
    return ok(data);
  });
}
