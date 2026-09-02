import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";

export async function GET() {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "transport", "view");
    const vehicles = await db.select().from(s.vehicles);
    const routes = await db.select().from(s.routes);
    const assignments = await db
      .select({ id: s.studentTransport.id, routeId: s.studentTransport.routeId, stopName: s.studentTransport.stopName, studentFirstName: s.students.firstName, studentLastName: s.students.lastName })
      .from(s.studentTransport)
      .innerJoin(s.students, eq(s.studentTransport.studentId, s.students.id));
    return ok({ vehicles, routes, assignments });
  });
}
