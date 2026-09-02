import { db } from "@/db";
import { profileChangeRequests, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ok, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";

export async function GET(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "users", "view");
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending";

    const rows = await db
      .select({
        id: profileChangeRequests.id, requestedName: profileChangeRequests.requestedName,
        requestedEmail: profileChangeRequests.requestedEmail,
        hasPasswordChange: profileChangeRequests.requestedPasswordHash,
        status: profileChangeRequests.status, createdAt: profileChangeRequests.createdAt,
        reviewedAt: profileChangeRequests.reviewedAt, reviewNote: profileChangeRequests.reviewNote,
        userName: users.name, userEmail: users.email, userRole: users.role,
      })
      .from(profileChangeRequests)
      .innerJoin(users, eq(profileChangeRequests.userId, users.id))
      .where(status === "all" ? undefined : eq(profileChangeRequests.status, status))
      .orderBy(desc(profileChangeRequests.createdAt))
      .limit(200);

    return ok(rows.map((r) => ({ ...r, hasPasswordChange: !!r.hasPasswordChange })));
  });
}
