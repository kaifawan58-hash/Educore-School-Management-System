import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  order: z.number().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "classes", "edit");
    const { id } = await params;

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [existing] = await db.select().from(s.classes).where(eq(s.classes.id, id)).limit(1);
    if (!existing) return fail("Class not found", 404);

    const [row] = await db.update(s.classes).set(parsed.data).where(eq(s.classes.id, id)).returning();
    await logAudit({ userId: session.userId, action: "update", entity: "class", entityId: id, details: parsed.data });
    return ok(row);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "classes", "delete");
    const { id } = await params;

    const [existing] = await db.select().from(s.classes).where(eq(s.classes.id, id)).limit(1);
    if (!existing) return fail("Class not found", 404);

    await db.delete(s.classes).where(eq(s.classes.id, id));
    await logAudit({ userId: session.userId, action: "delete", entity: "class", entityId: id });
    return ok({ deleted: true });
  });
}
