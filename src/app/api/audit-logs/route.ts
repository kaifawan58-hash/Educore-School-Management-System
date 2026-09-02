import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ok, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";

export async function GET() {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "audit_logs", "view");
    const rows = await db
      .select({
        id: s.auditLogs.id, action: s.auditLogs.action, entity: s.auditLogs.entity, entityId: s.auditLogs.entityId,
        createdAt: s.auditLogs.createdAt, userName: s.users.name, userEmail: s.users.email,
      })
      .from(s.auditLogs)
      .leftJoin(s.users, eq(s.auditLogs.userId, s.users.id))
      .orderBy(desc(s.auditLogs.createdAt))
      .limit(200);
    return ok(rows);
  });
}
