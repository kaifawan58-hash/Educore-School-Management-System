import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, signSession, SESSION_COOKIE } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ok, fail, handleApi } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { cookies } from "next/headers";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// 5 attempts per 10 minutes per IP+email pair. Deliberately keyed on the pair
// (not just IP) so a shared-NAT school network can't lock everyone out by one
// person mistyping a password, but a targeted brute force is still throttled.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  return handleApi(async () => {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail("Invalid email or password format", 422);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateKey = `login:${ip}:${parsed.data.email.toLowerCase()}`;
    const { allowed, retryAfterMs, remaining } = checkRateLimit(rateKey, MAX_ATTEMPTS, WINDOW_MS);
    if (!allowed) {
      const seconds = Math.ceil(retryAfterMs / 1000);
      const minutes = Math.ceil(retryAfterMs / 60000);
      return fail(`Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, 429, { retryAfterSeconds: seconds });
    }

    const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
    if (!user || !user.isActive) return fail("Invalid credentials", 401, { attemptsRemaining: remaining });

    const valid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!valid) {
      await logAudit({ userId: user.id, action: "login_failed", entity: "user", entityId: user.id, ipAddress: ip });
      return fail("Invalid credentials", 401, { attemptsRemaining: remaining });
    }

    const token = signSession({
      userId: user.id,
      schoolId: user.schoolId,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    await db.update(users).set({ lastLoginAt: new Date().toISOString() }).where(eq(users.id, user.id));
    await logAudit({ userId: user.id, action: "login", entity: "user", entityId: user.id });

    return ok({ id: user.id, name: user.name, role: user.role, email: user.email });
  });
}
