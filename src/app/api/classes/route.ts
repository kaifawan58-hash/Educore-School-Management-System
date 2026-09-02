import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

export async function GET() {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "classes", "view");

    const classRows = await db.select().from(s.classes);
    const sectionRows = await db.select().from(s.sections);
    const subjectRows = await db.select().from(s.subjects);

    const classes = classRows.map((c) => ({
      ...c,
      sections: sectionRows.filter((sec) => sec.classId === c.id),
    }));

    return ok({ classes, subjects: subjectRows });
  });
}

const createSchema = z.object({
  name: z.string().min(1),
  order: z.number().optional(),
});

export async function POST(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "classes", "create");
    if (!session.schoolId) return fail("No school context", 400);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [year] = await db.select().from(s.academicYears).where(eq(s.academicYears.isCurrent, true)).limit(1);
    if (!year) return fail("No current academic year configured", 400);

    const [row] = await db.insert(s.classes).values({ schoolId: session.schoolId, academicYearId: year.id, name: parsed.data.name, order: parsed.data.order ?? 0 }).returning();
    await logAudit({ userId: session.userId, action: "create", entity: "class", entityId: row.id });
    return ok(row, 201);
  });
}
