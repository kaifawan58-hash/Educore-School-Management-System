import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export async function POST() {
  return handleApi(async () => {
    const session = await requireSession();
    await db.update(s.notifications).set({ isRead: true }).where(eq(s.notifications.userId, session.userId));
    return ok({ done: true });
  });
}
