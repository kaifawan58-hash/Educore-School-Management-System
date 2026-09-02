import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";

const AUDIENCE_ROLES: Record<string, string[]> = {
  all: [],
  students: ["student"],
  parents: ["parent"],
  teachers: ["teacher"],
  staff: ["admin", "manager"],
};

export async function notifyAudience(schoolId: string, audience: string, title: string, body: string, category = "announcement") {
  const roles = AUDIENCE_ROLES[audience] ?? [];
  const targets = roles.length
    ? await db.select({ id: s.users.id }).from(s.users).where(inArray(s.users.role, roles))
    : await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.schoolId, schoolId));

  if (targets.length === 0) return;
  await db.insert(s.notifications).values(targets.map((t) => ({ userId: t.id, title, body, category })));
}

export async function notifyUser(userId: string, title: string, body: string, category = "general") {
  await db.insert(s.notifications).values({ userId, title, body, category });
}

// For things only an admin can act on (approving account change requests,
// system-level alerts) — narrower than the "staff" announcement audience,
// which also reaches managers.
export async function notifyAdmins(schoolId: string, title: string, body: string, category = "general") {
  const admins = await db.select({ id: s.users.id }).from(s.users).where(and(eq(s.users.role, "admin"), eq(s.users.schoolId, schoolId)));
  if (admins.length === 0) return;
  await db.insert(s.notifications).values(admins.map((a) => ({ userId: a.id, title, body, category })));
}
