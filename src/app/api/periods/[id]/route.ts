import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "timetable", "delete");
    const { id } = await params;
    const [existing] = await db.select().from(s.periods).where(eq(s.periods.id, id)).limit(1);
    if (!existing) return fail("Period not found", 404);
    await db.delete(s.periods).where(eq(s.periods.id, id));
    await logAudit({ userId: session.userId, action: "delete", entity: "period", entityId: id });
    return ok({ deleted: true });
  });
}
