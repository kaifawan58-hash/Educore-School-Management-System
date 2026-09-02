import { db } from "@/db";
import { users, ROLES } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession, hashPassword } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
  newPassword: z.string().min(8).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "users", "edit");
    const { id } = await params;

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) return fail("User not found", 404);

    // Privilege-escalation guard: a Manager can manage every other role, but
    // not an existing Admin's account, and can't promote anyone (including
    // themselves) to Admin. Only an Admin can touch Admin accounts.
    if (session.role !== "admin") {
      if (existing.role === "admin") return fail("Only an Admin can modify another Admin's account", 403);
      if (parsed.data.role === "admin") return fail("Only an Admin can grant the Admin role", 403);
    }

    if (parsed.data.email && parsed.data.email !== existing.email) {
      const [dupe] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
      if (dupe) return fail("That email is already in use", 409);
    }

    const updates: Partial<typeof users.$inferInsert> = {};
    if (parsed.data.name) updates.name = parsed.data.name;
    if (parsed.data.email) updates.email = parsed.data.email;
    if (parsed.data.role) updates.role = parsed.data.role;
    if (typeof parsed.data.isActive === "boolean") updates.isActive = parsed.data.isActive;
    if (parsed.data.newPassword) updates.passwordHash = await hashPassword(parsed.data.newPassword);
    updates.updatedAt = new Date().toISOString();

    const [row] = await db.update(users).set(updates).where(eq(users.id, id)).returning({
      id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive,
    });

    await logAudit({
      userId: session.userId, action: "update", entity: "user", entityId: id,
      details: { changedFields: Object.keys(updates).filter((k) => k !== "updatedAt" && k !== "passwordHash") },
    });

    return ok(row);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "users", "delete");
    const { id } = await params;

    if (id === session.userId) return fail("You cannot delete your own account", 400);

    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) return fail("User not found", 404);

    if (session.role !== "admin" && existing.role === "admin") {
      return fail("Only an Admin can delete another Admin's account", 403);
    }

    await db.delete(users).where(eq(users.id, id));
    await logAudit({ userId: session.userId, action: "delete", entity: "user", entityId: id });
    return ok({ deleted: true });
  });
}
