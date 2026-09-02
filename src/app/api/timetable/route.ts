import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

export async function GET(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "timetable", "view");
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get("sectionId");
    if (!sectionId) return fail("sectionId is required", 422);

    const slots = await db
      .select({
        id: s.timetableSlots.id, dayOfWeek: s.timetableSlots.dayOfWeek, startTime: s.timetableSlots.startTime,
        endTime: s.timetableSlots.endTime, room: s.timetableSlots.room, subjectId: s.timetableSlots.subjectId,
        teacherId: s.timetableSlots.teacherId, subjectName: s.subjects.name, teacherFirstName: s.teachers.firstName, teacherLastName: s.teachers.lastName,
      })
      .from(s.timetableSlots)
      .innerJoin(s.subjects, eq(s.timetableSlots.subjectId, s.subjects.id))
      .innerJoin(s.teachers, eq(s.timetableSlots.teacherId, s.teachers.id))
      .where(eq(s.timetableSlots.sectionId, sectionId));

    return ok(slots);
  });
}

const schema = z.object({
  sectionId: z.string(), dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(), endTime: z.string(),
  subjectId: z.string().nullable(), teacherId: z.string().nullable(), room: z.string().optional(),
});

export async function POST(req: Request) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "timetable", "edit");
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);
    const { sectionId, dayOfWeek, startTime, endTime, subjectId, teacherId, room } = parsed.data;

    const [existing] = await db
      .select()
      .from(s.timetableSlots)
      .where(and(eq(s.timetableSlots.sectionId, sectionId), eq(s.timetableSlots.dayOfWeek, dayOfWeek), eq(s.timetableSlots.startTime, startTime)))
      .limit(1);

    // Clearing a slot (no subject/teacher chosen) — delete it if present.
    if (!subjectId || !teacherId) {
      if (existing) await db.delete(s.timetableSlots).where(eq(s.timetableSlots.id, existing.id));
      return ok({ cleared: true });
    }

    // Conflict detection: this teacher already teaching somewhere else at this exact day+time?
    const teacherConflict = await db
      .select()
      .from(s.timetableSlots)
      .where(and(eq(s.timetableSlots.teacherId, teacherId), eq(s.timetableSlots.dayOfWeek, dayOfWeek), eq(s.timetableSlots.startTime, startTime)));
    const conflict = teacherConflict.find((c) => c.sectionId !== sectionId);
    if (conflict) return fail("This teacher is already scheduled in another class at this time", 409);

    if (existing) {
      await db.update(s.timetableSlots).set({ subjectId, teacherId, room: room ?? null }).where(eq(s.timetableSlots.id, existing.id));
    } else {
      await db.insert(s.timetableSlots).values({ sectionId, dayOfWeek, startTime, endTime, subjectId, teacherId, room: room ?? null });
    }

    await logAudit({ userId: session.userId, action: "set_timetable_slot", entity: "timetable_slot", details: { sectionId, dayOfWeek, startTime } });
    return ok({ saved: true });
  });
}
