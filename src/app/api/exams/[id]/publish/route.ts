import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { notifyAudience } from "@/lib/notify";
import { z } from "zod";

const schema = z.object({ scheduleId: z.string(), publish: z.boolean() });

export async function POST(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "exams", "approve");

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [schedule] = await db.select().from(s.examSchedules).where(eq(s.examSchedules.id, parsed.data.scheduleId)).limit(1);
    if (!schedule) return fail("Schedule not found", 404);

    await db.update(s.examSchedules).set({ isPublished: parsed.data.publish }).where(eq(s.examSchedules.id, parsed.data.scheduleId));
    await logAudit({ userId: session.userId, action: parsed.data.publish ? "publish_results" : "unpublish_results", entity: "exam_schedule", entityId: parsed.data.scheduleId });

    if (parsed.data.publish && session.schoolId) {
      const [subject] = await db.select().from(s.subjects).where(eq(s.subjects.id, schedule.subjectId)).limit(1);
      await notifyAudience(session.schoolId, "students", "Exam results published", `Results for ${subject?.name ?? "an exam"} are now available.`, "exam_results");
      await notifyAudience(session.schoolId, "parents", "Exam results published", `Results for ${subject?.name ?? "an exam"} are now available.`, "exam_results");
    }

    return ok({ published: parsed.data.publish });
  });
}
