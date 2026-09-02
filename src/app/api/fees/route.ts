import { db } from "@/db";
import * as s from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { ok, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { parsePagination, paginatedResult } from "@/lib/pagination";

export async function GET(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "fees", "view");
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const sectionId = searchParams.get("sectionId") || undefined;
    const conditions = [];
    if (status) conditions.push(eq(s.invoices.status, status));
    if (sectionId) conditions.push(eq(s.students.sectionId, sectionId));
    const where = conditions.length ? and(...conditions) : undefined;
    const { page, pageSize, offset } = parsePagination(searchParams);

    const [[{ count: total }], rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(s.invoices).innerJoin(s.students, eq(s.invoices.studentId, s.students.id)).where(where),
      db
        .select({
          id: s.invoices.id,
          invoiceNumber: s.invoices.invoiceNumber,
          totalAmount: s.invoices.totalAmount,
          status: s.invoices.status,
          dueDate: s.invoices.dueDate,
          studentFirstName: s.students.firstName,
          studentLastName: s.students.lastName,
          admissionNumber: s.students.admissionNumber,
        })
        .from(s.invoices)
        .innerJoin(s.students, eq(s.invoices.studentId, s.students.id))
        .where(where)
        .orderBy(desc(s.invoices.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    return ok(paginatedResult(rows, total, page, pageSize));
  });
}
