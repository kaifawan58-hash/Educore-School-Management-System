import { db } from "@/db";
import * as s from "@/db/schema";
import { desc, like, or, eq, and } from "drizzle-orm";
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
    assertPermission(session.role, "students", "export");
  } catch {
    return fail("Not authorized", 403);
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const sectionId = searchParams.get("sectionId") || undefined;
  const conditions = [];
  if (q) {
    conditions.push(or(like(s.students.firstName, `%${q}%`), like(s.students.lastName, `%${q}%`), like(s.students.admissionNumber, `%${q}%`)));
  }
  if (sectionId) conditions.push(eq(s.students.sectionId, sectionId));

  const rows = await db
    .select({
      admissionNumber: s.students.admissionNumber,
      firstName: s.students.firstName,
      lastName: s.students.lastName,
      gender: s.students.gender,
      dob: s.students.dob,
      bloodGroup: s.students.bloodGroup,
      phone: s.students.phone,
      address: s.students.address,
      className: s.classes.name,
      sectionName: s.sections.name,
      rollNumber: s.students.rollNumber,
      status: s.students.status,
      admissionDate: s.students.admissionDate,
    })
    .from(s.students)
    .leftJoin(s.sections, eq(s.students.sectionId, s.sections.id))
    .leftJoin(s.classes, eq(s.sections.classId, s.classes.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(s.students.createdAt))
    .limit(5000);

  await logAudit({ userId: session.userId, action: "export", entity: "students", details: { count: rows.length } });

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="students-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
