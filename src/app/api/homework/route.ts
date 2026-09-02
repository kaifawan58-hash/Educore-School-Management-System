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
    assertPermission(session.role, "homework", "view");
    const rows = await db
      .select({
        id: s.assignments.id, title: s.assignments.title, description: s.assignments.description, dueDate: s.assignments.dueDate,
        sectionName: s.sections.name, subjectName: s.subjects.name,
      })
      .from(s.assignments)
      .innerJoin(s.sections, eq(s.assignments.sectionId, s.sections.id))
      .innerJoin(s.subjects, eq(s.assignments.subjectId, s.subjects.id))
      .orderBy(desc(s.assignments.createdAt));

    const submissions = await db.select().from(s.assignmentSubmissions);
    const data = rows.map((r) => ({ ...r, submissionCount: submissions.filter((sub) => sub.assignmentId === r.id).length }));
    return ok(data);
  });
}

const createSchema = z.object({ sectionId: z.string(), subjectId: z.string(), title: z.string().min(1), description: z.string().optional(), dueDate: z.string().optional() });

export async function POST(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "homework", "create");
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [teacher] = await db.select().from(s.teachers).where(eq(s.teachers.userId, session.userId)).limit(1);
    if (!teacher) return fail("Only a teacher profile can create assignments", 400);
    const [row] = await db.insert(s.assignments).values({ ...parsed.data, teacherId: teacher.id }).returning();
    await logAudit({ userId: session.userId, action: "create", entity: "assignment", entityId: row.id });
    return ok(row, 201);
  });
}
