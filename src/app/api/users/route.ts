import { db } from "@/db";
import { users, ROLES } from "@/db/schema";
import { desc, like, or } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession, hashPassword } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "users", "view");
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    const rows = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt })
      .from(users)
      .where(q ? or(like(users.name, `%${q}%`), like(users.email, `%${q}%`)) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(300);
    return ok(rows);
  });
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(ROLES),
});

export async function POST(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "users", "create");
    if (!session.schoolId) return fail("No school context", 400);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    // Privilege-escalation guard: only an existing Admin can create another
    // Admin account. A Manager has near-admin power, but shouldn't be able
    // to mint themselves (or anyone else) a full Admin login.
    if (parsed.data.role === "admin" && session.role !== "admin") {
      return fail("Only an Admin can create another Admin account", 403);
    }

    const [existing] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
    if (existing) return fail("A user with that email already exists", 409);

    const passwordHash = await hashPassword(parsed.data.password);
    const [row] = await db
      .insert(users)
      .values({ schoolId: session.schoolId, name: parsed.data.name, email: parsed.data.email, role: parsed.data.role, passwordHash })
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

    await logAudit({ userId: session.userId, action: "create", entity: "user", entityId: row.id, details: { role: row.role } });
    return ok(row, 201);
  });
}
