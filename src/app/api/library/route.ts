import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ok, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";

export async function GET() {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "library", "view");
    const books = await db.select().from(s.books).orderBy(desc(s.books.title));
    const issues = await db
      .select({
        id: s.bookIssues.id, bookId: s.bookIssues.bookId, issueDate: s.bookIssues.issueDate,
        dueDate: s.bookIssues.dueDate, status: s.bookIssues.status,
        studentFirstName: s.students.firstName, studentLastName: s.students.lastName,
      })
      .from(s.bookIssues)
      .leftJoin(s.students, eq(s.bookIssues.studentId, s.students.id))
      .orderBy(desc(s.bookIssues.issueDate));
    return ok({ books, issues });
  });
}
