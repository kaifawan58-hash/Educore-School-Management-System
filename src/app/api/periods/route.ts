import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

export async function GET() {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "timetable", "view");
    if (!session.schoolId) return fail("No school context", 400);
    const rows = await db.select().from(s.periods).where(eq(s.periods.schoolId, session.schoolId)).orderBy(asc(s.periods.sortOrder));
    return ok(rows);
  });
}

const schema = z.object({ label: z.string().min(1), startTime: z.string().min(1), endTime: z.string().min(1), isBreak: z.boolean().default(false) });

export async function POST(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "timetable", "edit");
    if (!session.schoolId) return fail("No school context", 400);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const existing = await db.select().from(s.periods).where(eq(s.periods.schoolId, session.schoolId));
    const nextOrder = existing.length > 0 ? Math.max(...existing.map((p) => p.sortOrder)) + 1 : 0;

    const [row] = await db.insert(s.periods).values({ schoolId: session.schoolId, sortOrder: nextOrder, ...parsed.data }).returning();
    await logAudit({ userId: session.userId, action: "create", entity: "period", entityId: row.id });
    return ok(row, 201);
  });
}
