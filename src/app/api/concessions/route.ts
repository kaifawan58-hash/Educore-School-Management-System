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
    assertPermission(session.role, "fees", "view");

    const rows = await db
      .select({
        id: s.concessions.id, type: s.concessions.type, discountType: s.concessions.discountType,
        value: s.concessions.value, description: s.concessions.description, createdAt: s.concessions.createdAt,
        studentId: s.concessions.studentId, studentFirstName: s.students.firstName, studentLastName: s.students.lastName,
        feeStructureId: s.concessions.feeStructureId, feeStructureName: s.feeStructures.name, feeAmount: s.feeStructures.amount,
      })
      .from(s.concessions)
      .innerJoin(s.students, eq(s.concessions.studentId, s.students.id))
      .leftJoin(s.feeStructures, eq(s.concessions.feeStructureId, s.feeStructures.id))
      .orderBy(desc(s.concessions.createdAt));

    return ok(rows);
  });
}

const createSchema = z.object({
  studentId: z.string().min(1),
  feeStructureId: z.string().optional().nullable(),
  type: z.enum(["sibling", "merit", "staff_ward", "sc_st", "custom"]),
  discountType: z.enum(["percent", "flat"]),
  value: z.number().positive(),
  description: z.string().optional(),
});

export async function POST(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "fees", "create");
    if (!session.schoolId) return fail("No school context", 400);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [row] = await db.insert(s.concessions).values({ schoolId: session.schoolId, createdBy: session.userId, ...parsed.data }).returning();
    await logAudit({ userId: session.userId, action: "create", entity: "concession", entityId: row.id });
    return ok(row, 201);
  });
}
