import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";

export async function GET() {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "exams", "view");
    const exams = await db.select().from(s.exams);
    const schedules = await db.select().from(s.examSchedules);
    const results = await db.select().from(s.examResults);

    const data = exams.map((ex) => {
      const exSchedules = schedules.filter((sc) => sc.examId === ex.id);
      const scheduleIds = new Set(exSchedules.map((sc) => sc.id));
      const exResults = results.filter((r) => scheduleIds.has(r.examScheduleId));
      const avg = exResults.length ? Math.round(exResults.reduce((s2, r) => s2 + (r.marksObtained ?? 0), 0) / exResults.length) : 0;
      return { ...ex, scheduleCount: exSchedules.length, resultCount: exResults.length, averageMarks: avg };
    });
    return ok(data);
  });
}
