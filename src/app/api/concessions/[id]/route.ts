import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  type: z.enum(["sibling", "merit", "staff_ward", "sc_st", "custom"]).optional(),
  discountType: z.enum(["percent", "flat"]).optional(),
  value: z.number().positive().optional(),
  description: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "fees", "edit");
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [existing] = await db.select().from(s.concessions).where(eq(s.concessions.id, id)).limit(1);
    if (!existing) return fail("Concession not found", 404);

    const [row] = await db.update(s.concessions).set({ ...parsed.data, updatedAt: new Date().toISOString() }).where(eq(s.concessions.id, id)).returning();
    await logAudit({ userId: session.userId, action: "update", entity: "concession", entityId: id });
    return ok(row);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "fees", "delete");
    const { id } = await params;
    await db.delete(s.concessions).where(eq(s.concessions.id, id));
    await logAudit({ userId: session.userId, action: "delete", entity: "concession", entityId: id });
    return ok({ deleted: true });
  });
}
