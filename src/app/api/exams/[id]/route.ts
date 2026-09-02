import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "exams", "view");
    const { id } = await params;

    const [exam] = await db.select().from(s.exams).where(eq(s.exams.id, id)).limit(1);
    if (!exam) return fail("Exam not found", 404);

    const schedules = await db
      .select({
        id: s.examSchedules.id, sectionId: s.examSchedules.sectionId, subjectId: s.examSchedules.subjectId,
        date: s.examSchedules.date, maxMarks: s.examSchedules.maxMarks, passMarks: s.examSchedules.passMarks,
        isPublished: s.examSchedules.isPublished, subjectName: s.subjects.name, sectionName: s.sections.name, className: s.classes.name,
      })
      .from(s.examSchedules)
      .innerJoin(s.subjects, eq(s.examSchedules.subjectId, s.subjects.id))
      .innerJoin(s.sections, eq(s.examSchedules.sectionId, s.sections.id))
      .innerJoin(s.classes, eq(s.sections.classId, s.classes.id))
      .where(eq(s.examSchedules.examId, id));

    return ok({ exam, schedules });
  });
}
