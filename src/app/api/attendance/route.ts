import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

export async function GET(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "attendance", "view");
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get("sectionId");
    const date = searchParams.get("date");
    if (!sectionId || !date) return fail("sectionId and date are required", 422);

    const students = await db.select().from(s.students).where(eq(s.students.sectionId, sectionId));
    const existing = await db.select().from(s.studentAttendance).where(and(eq(s.studentAttendance.sectionId, sectionId), eq(s.studentAttendance.date, date)));
    const byStudent = new Map(existing.map((e) => [e.studentId, e]));

    const rows = students.map((st) => ({
      studentId: st.id,
      name: `${st.firstName} ${st.lastName}`,
      rollNumber: st.rollNumber,
      status: byStudent.get(st.id)?.status ?? "present",
      recordId: byStudent.get(st.id)?.id ?? null,
    }));
    return ok(rows);
  });
}

const markSchema = z.object({
  sectionId: z.string(),
  date: z.string(),
  entries: z.array(z.object({ studentId: z.string(), status: z.enum(["present", "absent", "late", "excused", "half_day"]) })),
});

export async function POST(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "attendance", "create");
    const body = await req.json();
    const parsed = markSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const { sectionId, date, entries } = parsed.data;
    for (const entry of entries) {
      const [existing] = await db
        .select()
        .from(s.studentAttendance)
        .where(and(eq(s.studentAttendance.studentId, entry.studentId), eq(s.studentAttendance.date, date)))
        .limit(1);
      if (existing) {
        await db.update(s.studentAttendance).set({ status: entry.status, markedBy: session.userId }).where(eq(s.studentAttendance.id, existing.id));
      } else {
        await db.insert(s.studentAttendance).values({ studentId: entry.studentId, sectionId, date, status: entry.status, markedBy: session.userId });
      }
    }
    await logAudit({ userId: session.userId, action: "mark_attendance", entity: "attendance", entityId: sectionId, details: { date, count: entries.length } });
    return ok({ saved: entries.length });
  });
}
