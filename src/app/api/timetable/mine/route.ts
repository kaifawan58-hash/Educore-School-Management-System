import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";

export async function GET() {
  return handleApi(async () => {
    const session = await requireSession();
    const [teacher] = await db.select().from(s.teachers).where(eq(s.teachers.userId, session.userId)).limit(1);
    if (!teacher) return fail("No teacher profile linked to this account", 400);

    const slots = await db
      .select({
        id: s.timetableSlots.id, dayOfWeek: s.timetableSlots.dayOfWeek, startTime: s.timetableSlots.startTime,
        endTime: s.timetableSlots.endTime, room: s.timetableSlots.room, subjectName: s.subjects.name,
        sectionName: s.sections.name, className: s.classes.name,
      })
      .from(s.timetableSlots)
      .innerJoin(s.subjects, eq(s.timetableSlots.subjectId, s.subjects.id))
      .innerJoin(s.sections, eq(s.timetableSlots.sectionId, s.sections.id))
      .innerJoin(s.classes, eq(s.sections.classId, s.classes.id))
      .where(eq(s.timetableSlots.teacherId, teacher.id));

    return ok(slots);
  });
}
