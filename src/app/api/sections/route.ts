import { db } from "@/db";
import * as s from "@/db/schema";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  classId: z.string().min(1),
  name: z.string().min(1),
  roomNumber: z.string().optional(),
  capacity: z.number().optional(),
});

export async function POST(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "classes", "create");

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [row] = await db.insert(s.sections).values(parsed.data).returning();
    await logAudit({ userId: session.userId, action: "create", entity: "section", entityId: row.id });
    return ok(row, 201);
  });
}
