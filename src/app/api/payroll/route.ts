import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

export async function GET(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "payroll", "view");
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get("sectionId") || undefined;

    let teacherFilter: string[] | undefined;
    if (sectionId) {
      const section = await db.select().from(s.sections).where(eq(s.sections.id, sectionId)).limit(1);
      teacherFilter = section[0]?.classTeacherId ? [section[0].classTeacherId] : ["__none__"];
    }

    const rows = await db
      .select({
        id: s.payroll.id, period: s.payroll.period, basicSalary: s.payroll.basicSalary,
        allowances: s.payroll.allowances, deductions: s.payroll.deductions, netSalary: s.payroll.netSalary,
        status: s.payroll.status, teacherFirstName: s.teachers.firstName, teacherLastName: s.teachers.lastName,
      })
      .from(s.payroll)
      .innerJoin(s.teachers, eq(s.payroll.teacherId, s.teachers.id))
      .where(teacherFilter ? inArray(s.teachers.id, teacherFilter) : undefined)
      .orderBy(desc(s.payroll.period))
      .limit(300);
    return ok(rows);
  });
}

const paySchema = z.object({ id: z.string() });

export async function POST(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "payroll", "approve");
    const body = await req.json();
    const parsed = paySchema.safeParse(body);
    if (!parsed.success) return fail("Invalid data", 422);

    await db.update(s.payroll).set({ status: "paid", paidAt: new Date().toISOString() }).where(eq(s.payroll.id, parsed.data.id));
    await logAudit({ userId: session.userId, action: "mark_paid", entity: "payroll", entityId: parsed.data.id });
    return ok({ paid: true });
  });
}
