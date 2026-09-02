import { db } from "@/db";
import * as s from "@/db/schema";
import { sql, ne } from "drizzle-orm";
import { ok, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";

export async function GET() {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "fees", "view");

    const [[collected], [pending]] = await Promise.all([
      db.select({ total: sql<number>`coalesce(sum(amount),0)` }).from(s.payments),
      db.select({ total: sql<number>`coalesce(sum(total_amount),0)` }).from(s.invoices).where(ne(s.invoices.status, "paid")),
    ]);

    return ok({ collected: collected.total, pending: pending.total });
  });
}
