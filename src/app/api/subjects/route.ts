import { db } from "@/db";
import * as s from "@/db/schema";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
});

export async function POST(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "classes", "create");
    if (!session.schoolId) return fail("No school context", 400);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [row] = await db.insert(s.subjects).values({ schoolId: session.schoolId, ...parsed.data }).returning();
    await logAudit({ userId: session.userId, action: "create", entity: "subject", entityId: row.id });
    return ok(row, 201);
  });
}
