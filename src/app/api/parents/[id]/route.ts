import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  relation: z.enum(["father", "mother", "guardian"]).optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  occupation: z.string().optional(),
  address: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "parents", "edit");
    const { id } = await params;

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [existing] = await db.select().from(s.parents).where(eq(s.parents.id, id)).limit(1);
    if (!existing) return fail("Parent not found", 404);

    const [row] = await db.update(s.parents).set(parsed.data).where(eq(s.parents.id, id)).returning();
    await logAudit({ userId: session.userId, action: "update", entity: "parent", entityId: id, details: parsed.data });
    return ok(row);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "parents", "delete");
    const { id } = await params;

    const [existing] = await db.select().from(s.parents).where(eq(s.parents.id, id)).limit(1);
    if (!existing) return fail("Parent not found", 404);

    await db.delete(s.parents).where(eq(s.parents.id, id));
    await logAudit({ userId: session.userId, action: "delete", entity: "parent", entityId: id });
    return ok({ deleted: true });
  });
}
