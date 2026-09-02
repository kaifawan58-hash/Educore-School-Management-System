import { db } from "@/db";
import * as s from "@/db/schema";
import { desc } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { notifyAudience } from "@/lib/notify";
import { z } from "zod";

export async function GET() {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "communication", "view");
    const rows = await db.select().from(s.announcements).orderBy(desc(s.announcements.createdAt)).limit(100);
    return ok(rows);
  });
}

const schema = z.object({ title: z.string().min(1), body: z.string().min(1), audience: z.enum(["all", "students", "parents", "teachers", "staff"]) });

export async function POST(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "communication", "create");
    if (!session.schoolId) return fail("No school context", 400);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [row] = await db.insert(s.announcements).values({ schoolId: session.schoolId, createdBy: session.userId, ...parsed.data }).returning();
    await logAudit({ userId: session.userId, action: "create", entity: "announcement", entityId: row.id });
    await notifyAudience(session.schoolId, parsed.data.audience, parsed.data.title, parsed.data.body, "announcement");
    return ok(row, 201);
  });
}
