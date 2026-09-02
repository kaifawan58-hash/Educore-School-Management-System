import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  sectionId: z.string().optional(),
  rollNumber: z.string().optional(),
  status: z.string().optional(),
  medicalNotes: z.string().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "students", "view");
    const { id } = await params;

    const [student] = await db.select().from(s.students).where(eq(s.students.id, id)).limit(1);
    if (!student) return fail("Student not found", 404);

    const parentLinks = await db
      .select({ id: s.parents.id, firstName: s.parents.firstName, lastName: s.parents.lastName, relation: s.parents.relation, phone: s.parents.phone, email: s.parents.email })
      .from(s.studentParents)
      .innerJoin(s.parents, eq(s.studentParents.parentId, s.parents.id))
      .where(eq(s.studentParents.studentId, id));

    const attendance = await db.select().from(s.studentAttendance).where(eq(s.studentAttendance.studentId, id)).orderBy(s.studentAttendance.date);
    const invoicesList = await db.select().from(s.invoices).where(eq(s.invoices.studentId, id));

    return ok({ student, parents: parentLinks, attendance, invoices: invoicesList });
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "students", "edit");
    const { id } = await params;

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [existing] = await db.select().from(s.students).where(eq(s.students.id, id)).limit(1);
    if (!existing) return fail("Student not found", 404);

    const [row] = await db.update(s.students).set({ ...parsed.data, updatedAt: new Date().toISOString() }).where(eq(s.students.id, id)).returning();
    await logAudit({ userId: session.userId, action: "update", entity: "student", entityId: id, details: parsed.data });
    return ok(row);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "students", "delete");
    const { id } = await params;

    const [existing] = await db.select().from(s.students).where(eq(s.students.id, id)).limit(1);
    if (!existing) return fail("Student not found", 404);

    await db.delete(s.students).where(eq(s.students.id, id));
    await logAudit({ userId: session.userId, action: "delete", entity: "student", entityId: id });
    return ok({ deleted: true });
  });
}
