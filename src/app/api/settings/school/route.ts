import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

export async function GET() {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "settings", "view");
    if (!session.schoolId) return fail("No school context", 400);
    const [school] = await db.select().from(s.schools).where(eq(s.schools.id, session.schoolId)).limit(1);
    return ok(school);
  });
}

const schema = z.object({
  name: z.string().min(1).optional(), address: z.string().optional(), phone: z.string().optional(),
  email: z.string().optional(), website: z.string().optional(), primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(), currency: z.string().optional(), timezone: z.string().optional(),
  gradingSystem: z.enum(["percentage", "gpa"]).optional(),
});

export async function PATCH(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "settings", "edit");
    if (!session.schoolId) return fail("No school context", 400);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [row] = await db.update(s.schools).set({ ...parsed.data, updatedAt: new Date().toISOString() }).where(eq(s.schools.id, session.schoolId)).returning();
    await logAudit({ userId: session.userId, action: "update", entity: "school_settings", entityId: session.schoolId });
    return ok(row);
  });
}
