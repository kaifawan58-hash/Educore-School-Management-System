import { db } from "@/db";
import * as s from "@/db/schema";
import { desc, like, or, eq, and, sql } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { z } from "zod";

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  admissionNumber: z.string().min(1),
  dob: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  sectionId: z.string().optional(),
  rollNumber: z.string().optional(),
  admissionDate: z.string().optional(),
});

export async function GET(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "students", "view");

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const sectionId = searchParams.get("sectionId") || undefined;

    const conditions = [];
    if (q) {
      conditions.push(
        or(
          like(s.students.firstName, `%${q}%`),
          like(s.students.lastName, `%${q}%`),
          like(s.students.admissionNumber, `%${q}%`)
        )
      );
    }
    if (sectionId) conditions.push(eq(s.students.sectionId, sectionId));
    const where = conditions.length ? and(...conditions) : undefined;

    const { page, pageSize, offset } = parsePagination(searchParams);

    const [[{ count: total }], rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(s.students).where(where),
      db
        .select({
          id: s.students.id,
          firstName: s.students.firstName,
          lastName: s.students.lastName,
          admissionNumber: s.students.admissionNumber,
          gender: s.students.gender,
          status: s.students.status,
          rollNumber: s.students.rollNumber,
          sectionId: s.students.sectionId,
          sectionName: s.sections.name,
          className: s.classes.name,
          photoUrl: s.students.photoUrl,
        })
        .from(s.students)
        .leftJoin(s.sections, eq(s.students.sectionId, s.sections.id))
        .leftJoin(s.classes, eq(s.sections.classId, s.classes.id))
        .where(where)
        .orderBy(desc(s.students.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    return ok(paginatedResult(rows, total, page, pageSize));
  });
}

export async function POST(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "students", "create");
    if (!session.schoolId) return fail("No school context", 400);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [row] = await db.insert(s.students).values({ schoolId: session.schoolId, status: "active", ...parsed.data }).returning();
    await logAudit({ userId: session.userId, action: "create", entity: "student", entityId: row.id, details: parsed.data });
    return ok(row, 201);
  });
}
