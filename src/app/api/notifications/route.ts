import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { ok, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export async function GET() {
  return handleApi(async () => {
    const session = await requireSession();
    const rows = await db
      .select()
      .from(s.notifications)
      .where(eq(s.notifications.userId, session.userId))
      .orderBy(desc(s.notifications.createdAt))
      .limit(30);
    return ok(rows);
  });
}
