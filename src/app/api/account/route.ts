import { db } from "@/db";
import { users, profileChangeRequests } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession, hashPassword, verifyPassword, signSession, SESSION_COOKIE } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notify";
import { cookies } from "next/headers";
import { z } from "zod";

// Account settings are personal — every logged-in user (any role) can view
// their own account and submit changes. Admins apply changes immediately
// (nobody above them to approve). Everyone else's changes go into
// profile_change_requests as "pending" and only take effect once an admin
// approves them — see /api/account-requests/[id]/approve.

export async function GET() {
  return handleApi(async () => {
    const session = await requireSession();
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    if (!user) return fail("User not found", 404);

    const [pending] = await db
      .select({ id: profileChangeRequests.id, requestedName: profileChangeRequests.requestedName, requestedEmail: profileChangeRequests.requestedEmail, createdAt: profileChangeRequests.createdAt })
      .from(profileChangeRequests)
      .where(and(eq(profileChangeRequests.userId, session.userId), eq(profileChangeRequests.status, "pending")))
      .limit(1);

    return ok({ ...user, pendingRequest: pending ?? null });
  });
}

const schema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, "New password must be at least 8 characters").optional(),
  })
  .refine((data) => !data.newPassword || !!data.currentPassword, {
    message: "Current password is required to set a new password",
    path: ["currentPassword"],
  });

export async function PATCH(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (!user) return fail("User not found", 404);

    // Verify current password whenever a new password is requested, whether
    // applying immediately (admin) or queuing a request (everyone else).
    if (parsed.data.newPassword) {
      const valid = await verifyPassword(parsed.data.currentPassword!, user.passwordHash);
      if (!valid) return fail("Current password is incorrect", 401);
    }

    if (parsed.data.email && parsed.data.email !== user.email) {
      const [existing] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
      if (existing) return fail("That email is already in use", 409);
    }

    // --- Admins: apply immediately, same as before ---
    if (session.role === "admin") {
      const updates: Partial<typeof users.$inferInsert> = {};
      if (parsed.data.name) updates.name = parsed.data.name;
      if (parsed.data.email) updates.email = parsed.data.email;
      if (parsed.data.newPassword) updates.passwordHash = await hashPassword(parsed.data.newPassword);
      if (Object.keys(updates).length === 0) return fail("Nothing to update", 400);
      updates.updatedAt = new Date().toISOString();

      const [row] = await db.update(users).set(updates).where(eq(users.id, session.userId)).returning({
        id: users.id, name: users.name, email: users.email, role: users.role,
      });

      await logAudit({ userId: session.userId, action: "update_account", entity: "user", entityId: session.userId, details: { changedFields: Object.keys(updates).filter((k) => k !== "updatedAt") } });

      const newToken = signSession({ userId: row.id, schoolId: session.schoolId, role: row.role, name: row.name, email: row.email });
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE, newToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 });

      return ok({ ...row, pendingRequest: null, applied: true });
    }

    // --- Everyone else: queue a request for admin approval ---
    if (!parsed.data.name && !parsed.data.email && !parsed.data.newPassword) return fail("Nothing to update", 400);

    // Replace any existing pending request rather than stacking multiples.
    await db
      .update(profileChangeRequests)
      .set({ status: "rejected", reviewNote: "Superseded by a newer request", reviewedAt: new Date().toISOString() })
      .where(and(eq(profileChangeRequests.userId, session.userId), eq(profileChangeRequests.status, "pending")));

    const [request] = await db
      .insert(profileChangeRequests)
      .values({
        userId: session.userId,
        requestedName: parsed.data.name ?? null,
        requestedEmail: parsed.data.email ?? null,
        requestedPasswordHash: parsed.data.newPassword ? await hashPassword(parsed.data.newPassword) : null,
      })
      .returning();

    await logAudit({ userId: session.userId, action: "request_account_change", entity: "user", entityId: session.userId, details: { requestId: request.id } });
    if (session.schoolId) {
      await notifyAdmins(session.schoolId, "Account change request", `${user.name} requested an account change awaiting your approval.`, "account_request");
    }

    return ok({ id: user.id, name: user.name, email: user.email, role: user.role, pendingRequest: { id: request.id, requestedName: request.requestedName, requestedEmail: request.requestedEmail, createdAt: request.createdAt }, applied: false });
  });
}
