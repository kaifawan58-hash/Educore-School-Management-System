import { getSession } from "@/lib/auth";
import { ok, fail, handleApi } from "@/lib/api";

export async function GET() {
  return handleApi(async () => {
    const session = await getSession();
    if (!session) return fail("Not authenticated", 401);
    return ok(session);
  });
}
