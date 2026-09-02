import { db } from "@/db";
import * as s from "@/db/schema";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { z } from "zod";

export async function GET(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "parents", "view");
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const sectionId = searchParams.get("sectionId")?.trim();
    const { page, pageSize, offset } = parsePagination(searchParams);

    const conditions = [];
    if (q) conditions.push(or(like(s.parents.firstName, `%${q}%`), like(s.parents.lastName, `%${q}%`), like(s.parents.phone, `%${q}%`)));

    if (sectionId) {
      const matches = await db
        .selectDistinct({ parentId: s.studentParents.parentId })
        .from(s.studentParents)
        .innerJoin(s.students, eq(s.studentParents.studentId, s.students.id))
        .where(eq(s.students.sectionId, sectionId));
      const ids = matches.map((m) => m.parentId);
      conditions.push(ids.length ? inArray(s.parents.id, ids) : sql`0 = 1`);
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const [[{ count: total }], rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(s.parents).where(where),
      db.select().from(s.parents).where(where).orderBy(desc(s.parents.id)).limit(pageSize).offset(offset),
    ]);

    const parentIds = rows.map((r) => r.id);
    const children = parentIds.length
      ? await db
          .select({
            parentId: s.studentParents.parentId,
            studentId: s.students.id,
            firstName: s.students.firstName,
            lastName: s.students.lastName,
            className: s.classes.name,
            sectionName: s.sections.name,
          })
          .from(s.studentParents)
          .innerJoin(s.students, eq(s.studentParents.studentId, s.students.id))
          .leftJoin(s.sections, eq(s.students.sectionId, s.sections.id))
          .leftJoin(s.classes, eq(s.sections.classId, s.classes.id))
          .where(inArray(s.studentParents.parentId, parentIds))
      : [];

    const childrenByParent = new Map<string, typeof children>();
    for (const c of children) {
      const list = childrenByParent.get(c.parentId) ?? [];
      list.push(c);
      childrenByParent.set(c.parentId, list);
    }

    const enriched = rows.map((r) => ({ ...r, children: childrenByParent.get(r.id) ?? [] }));
    return ok(paginatedResult(enriched, total, page, pageSize));
  });
}

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  relation: z.enum(["father", "mother", "guardian"]).default("guardian"),
  phone: z.string().optional(),
  email: z.string().optional(),
  occupation: z.string().optional(),
  address: z.string().optional(),
});

export async function POST(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "parents", "create");
    if (!session.schoolId) return fail("No school context", 400);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [row] = await db.insert(s.parents).values({ schoolId: session.schoolId, ...parsed.data }).returning();
    await logAudit({ userId: session.userId, action: "create", entity: "parent", entityId: row.id });
    return ok(row, 201);
  });
}
