import { db } from "@/db";
import { profileChangeRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { z } from "zod";

const schema = z.object({ note: z.string().optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "users", "edit");
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);

    const [request] = await db.select().from(profileChangeRequests).where(eq(profileChangeRequests.id, id)).limit(1);
    if (!request) return fail("Request not found", 404);
    if (request.status !== "pending") return fail("This request has already been reviewed", 400);

    await db.update(profileChangeRequests).set({
      status: "rejected", reviewedBy: session.userId, reviewedAt: new Date().toISOString(),
      reviewNote: parsed.success ? parsed.data.note ?? null : null,
    }).where(eq(profileChangeRequests.id, id));

    await logAudit({ userId: session.userId, action: "reject_account_request", entity: "user", entityId: request.userId, details: { requestId: id } });
    await notifyUser(request.userId, "Account change rejected", "Your requested account changes were not approved. Contact your admin for details.", "account_request");

    return ok({ rejected: true });
  });
}
