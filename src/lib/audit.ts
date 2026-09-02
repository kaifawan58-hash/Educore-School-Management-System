import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function logAudit(params: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  await db.insert(auditLogs).values({
    userId: params.userId ?? null,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId ?? null,
    details: params.details ? JSON.stringify(params.details) : null,
    ipAddress: params.ipAddress ?? null,
  });
}
