import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

export async function GET() {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "exams", "view");

    const rows = await db
      .select({
        id: s.tests.id, title: s.tests.title, date: s.tests.date,
        totalMarks: s.tests.totalMarks, durationMinutes: s.tests.durationMinutes, description: s.tests.description,
        className: s.classes.name, subjectName: s.subjects.name, subjectId: s.tests.subjectId, classId: s.tests.classId,
        teacherFirstName: s.teachers.firstName, teacherLastName: s.teachers.lastName,
      })
      .from(s.tests)
      .innerJoin(s.classes, eq(s.tests.classId, s.classes.id))
      .innerJoin(s.subjects, eq(s.tests.subjectId, s.subjects.id))
      .innerJoin(s.teachers, eq(s.tests.teacherId, s.teachers.id))
      .orderBy(desc(s.tests.date));

    return ok(rows);
  });
}

const createSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  title: z.string().min(1),
  date: z.string().min(1),
  totalMarks: z.number().positive().default(100),
  durationMinutes: z.number().positive().default(60),
  description: z.string().optional(),
});

export async function POST(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "exams", "create");
    if (!session.schoolId) return fail("No school context", 400);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [teacher] = await db.select().from(s.teachers).where(eq(s.teachers.userId, session.userId)).limit(1);
    if (!teacher && session.role === "teacher") return fail("Only a teacher profile can create tests", 400);

    // Admin/Manager creating a test without a linked teacher record falls back
    // to the first teacher assigned to that subject/class, if any; otherwise reject.
    let teacherId = teacher?.id;
    if (!teacherId) {
      const [anyTeacher] = await db.select().from(s.teachers).limit(1);
      if (!anyTeacher) return fail("No teacher profile exists to attribute this test to", 400);
      teacherId = anyTeacher.id;
    }

    const [row] = await db.insert(s.tests).values({ schoolId: session.schoolId, teacherId, ...parsed.data }).returning();
    await logAudit({ userId: session.userId, action: "create", entity: "test", entityId: row.id });
    return ok(row, 201);
  });
}
