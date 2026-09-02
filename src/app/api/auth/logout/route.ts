import { cookies } from "next/headers";
import { SESSION_COOKIE, getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ok, handleApi } from "@/lib/api";

export async function POST() {
  return handleApi(async () => {
    const session = await getSession();
    if (session) await logAudit({ userId: session.userId, action: "logout", entity: "user", entityId: session.userId });
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    return ok({ loggedOut: true });
  });
}
