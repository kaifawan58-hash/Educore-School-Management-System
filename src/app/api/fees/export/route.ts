import { db } from "@/db";
import * as s from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { fail } from "@/lib/api";

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const str = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

export async function GET(req: Request) {
  let session;
  try {
    session = await requireSession();
    assertPermission(session.role, "fees", "export");
  } catch {
    return fail("Not authorized", 403);
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const sectionId = searchParams.get("sectionId") || undefined;
  const conditions = [];
  if (status) conditions.push(eq(s.invoices.status, status));
  if (sectionId) conditions.push(eq(s.students.sectionId, sectionId));

  const rows = await db
    .select({
      invoiceNumber: s.invoices.invoiceNumber,
      studentFirstName: s.students.firstName,
      studentLastName: s.students.lastName,
      admissionNumber: s.students.admissionNumber,
      totalAmount: s.invoices.totalAmount,
      dueDate: s.invoices.dueDate,
      status: s.invoices.status,
    })
    .from(s.invoices)
    .innerJoin(s.students, eq(s.invoices.studentId, s.students.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(s.invoices.createdAt))
    .limit(5000);

  await logAudit({ userId: session.userId, action: "export", entity: "invoices", details: { count: rows.length } });

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fees-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
