import { db } from "@/db";
import * as s from "@/db/schema";
import { desc, like, or, and, sql } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { z } from "zod";

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  employeeId: z.string().min(1),
  qualification: z.string().optional(),
  phone: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  joiningDate: z.string().optional(),
});

export async function GET(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "teachers", "view");
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    const where = q ? and(or(like(s.teachers.firstName, `%${q}%`), like(s.teachers.lastName, `%${q}%`), like(s.teachers.employeeId, `%${q}%`))) : undefined;
    const { page, pageSize, offset } = parsePagination(searchParams);

    const [[{ count: total }], rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(s.teachers).where(where),
      db.select().from(s.teachers).where(where).orderBy(desc(s.teachers.createdAt)).limit(pageSize).offset(offset),
    ]);
    return ok(paginatedResult(rows, total, page, pageSize));
  });
}

export async function POST(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "teachers", "create");
    if (!session.schoolId) return fail("No school context", 400);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [row] = await db.insert(s.teachers).values({ schoolId: session.schoolId, status: "active", ...parsed.data }).returning();
    await logAudit({ userId: session.userId, action: "create", entity: "teacher", entityId: row.id });
    return ok(row, 201);
  });
}
