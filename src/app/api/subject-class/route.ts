import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

export async function GET() {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "classes", "view");

    const classes = await db.select().from(s.classes);
    const subjects = await db.select().from(s.subjects);
    const assignments = await db.select().from(s.classSubjects);

    return ok({ classes, subjects, assignments });
  });
}

const singleSchema = z.object({ classId: z.string(), subjectIds: z.array(z.string()) });
const bulkSchema = z.object({ classIds: z.array(z.string()).min(1), subjectIds: z.array(z.string()).min(1) });

export async function POST(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "classes", "edit");

    const body = await req.json();

    // Bulk mode: add these subjects to these classes (additive, doesn't remove existing).
    if (Array.isArray(body.classIds)) {
      const parsed = bulkSchema.safeParse(body);
      if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

      const existing = await db.select().from(s.classSubjects).where(inArray(s.classSubjects.classId, parsed.data.classIds));
      const existingSet = new Set(existing.map((e) => `${e.classId}:${e.subjectId}`));

      const rows = [];
      for (const classId of parsed.data.classIds) {
        for (const subjectId of parsed.data.subjectIds) {
          if (!existingSet.has(`${classId}:${subjectId}`)) rows.push({ classId, subjectId });
        }
      }
      if (rows.length > 0) await db.insert(s.classSubjects).values(rows);

      await logAudit({ userId: session.userId, action: "bulk_assign_subjects", entity: "class_subjects", details: { classCount: parsed.data.classIds.length, subjectCount: parsed.data.subjectIds.length, added: rows.length } });
      return ok({ added: rows.length });
    }

    // Single mode: replace this class's full subject list with exactly this set.
    const parsed = singleSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    await db.delete(s.classSubjects).where(eq(s.classSubjects.classId, parsed.data.classId));
    if (parsed.data.subjectIds.length > 0) {
      await db.insert(s.classSubjects).values(parsed.data.subjectIds.map((subjectId) => ({ classId: parsed.data.classId, subjectId })));
    }

    await logAudit({ userId: session.userId, action: "assign_subjects", entity: "class_subjects", entityId: parsed.data.classId, details: { subjectCount: parsed.data.subjectIds.length } });
    return ok({ classId: parsed.data.classId, subjectCount: parsed.data.subjectIds.length });
  });
}
