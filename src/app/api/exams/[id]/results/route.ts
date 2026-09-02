import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

function gradeFor(pct: number) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "exams", "view");
    await params; // examId not needed once we have scheduleId directly
    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get("scheduleId");
    if (!scheduleId) return fail("scheduleId is required", 422);

    const [schedule] = await db.select().from(s.examSchedules).where(eq(s.examSchedules.id, scheduleId)).limit(1);
    if (!schedule) return fail("Schedule not found", 404);

    const students = await db.select().from(s.students).where(eq(s.students.sectionId, schedule.sectionId));
    const results = await db.select().from(s.examResults).where(eq(s.examResults.examScheduleId, scheduleId));
    const byStudent = new Map(results.map((r) => [r.studentId, r]));

    const rows = students.map((st) => {
      const existing = byStudent.get(st.id);
      return {
        studentId: st.id,
        name: `${st.firstName} ${st.lastName}`,
        rollNumber: st.rollNumber,
        marksObtained: existing?.marksObtained ?? null,
        teacherComment: existing?.teacherComment ?? "",
      };
    });

    return ok({ schedule, rows });
  });
}

const saveSchema = z.object({
  scheduleId: z.string(),
  entries: z.array(z.object({ studentId: z.string(), marksObtained: z.number().nullable(), teacherComment: z.string().optional() })),
});

export async function POST(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "exams", "edit");

    const body = await req.json();
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [schedule] = await db.select().from(s.examSchedules).where(eq(s.examSchedules.id, parsed.data.scheduleId)).limit(1);
    if (!schedule) return fail("Schedule not found", 404);

    let saved = 0;
    for (const entry of parsed.data.entries) {
      const grade = entry.marksObtained !== null ? gradeFor((entry.marksObtained / schedule.maxMarks) * 100) : null;
      const [existing] = await db
        .select()
        .from(s.examResults)
        .where(and(eq(s.examResults.examScheduleId, parsed.data.scheduleId), eq(s.examResults.studentId, entry.studentId)))
        .limit(1);

      if (existing) {
        await db.update(s.examResults).set({ marksObtained: entry.marksObtained, grade, teacherComment: entry.teacherComment ?? null }).where(eq(s.examResults.id, existing.id));
      } else {
        await db.insert(s.examResults).values({ examScheduleId: parsed.data.scheduleId, studentId: entry.studentId, marksObtained: entry.marksObtained, grade, teacherComment: entry.teacherComment ?? null });
      }
      saved++;
    }

    await logAudit({ userId: session.userId, action: "save_results", entity: "exam_schedule", entityId: parsed.data.scheduleId, details: { count: saved } });
    return ok({ saved });
  });
}
