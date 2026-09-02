import { db } from "@/db";
import { profileChangeRequests, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "users", "edit");
    const { id } = await params;

    const [request] = await db.select().from(profileChangeRequests).where(eq(profileChangeRequests.id, id)).limit(1);
    if (!request) return fail("Request not found", 404);
    if (request.status !== "pending") return fail("This request has already been reviewed", 400);

    if (request.requestedEmail) {
      const [dupe] = await db.select().from(users).where(eq(users.email, request.requestedEmail)).limit(1);
      if (dupe && dupe.id !== request.userId) return fail("That email is now in use by another account — ask the user to resubmit", 409);
    }

    const updates: Partial<typeof users.$inferInsert> = {};
    if (request.requestedName) updates.name = request.requestedName;
    if (request.requestedEmail) updates.email = request.requestedEmail;
    if (request.requestedPasswordHash) updates.passwordHash = request.requestedPasswordHash;
    updates.updatedAt = new Date().toISOString();

    await db.update(users).set(updates).where(eq(users.id, request.userId));
    await db.update(profileChangeRequests).set({ status: "approved", reviewedBy: session.userId, reviewedAt: new Date().toISOString() }).where(eq(profileChangeRequests.id, id));

    await logAudit({ userId: session.userId, action: "approve_account_request", entity: "user", entityId: request.userId, details: { requestId: id } });
    await notifyUser(request.userId, "Account change approved", "Your requested account changes have been approved and applied.", "account_request");

    return ok({ approved: true });
  });
}
