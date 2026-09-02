import { db } from "@/db";
import * as s from "@/db/schema";
import { ok, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export async function GET() {
  return handleApi(async () => {
    await requireSession();
    const rows = await db.select().from(s.studentAttendance);
    const byStatus = new Map<string, number>();
    for (const r of rows) byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
    const data = [...byStatus.entries()].map(([status, count]) => ({ status, count }));
    return ok(data);
  });
}
