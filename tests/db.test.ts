import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { eq, sql as sqlTag } from "drizzle-orm";
import fs from "fs";
import path from "path";
import * as s from "@/db/schema";

// Integration test against a real (in-memory) SQLite database, built from the
// same migration files the app uses — exercises the actual query patterns
// (search filters, pagination, joins) rather than mocking the DB layer.

let db: LibSQLDatabase<typeof s>;
let client: Client;

beforeAll(async () => {
  client = createClient({ url: ":memory:" });
  await client.execute("PRAGMA foreign_keys = ON;");

  const migrationsDir = path.join(__dirname, "..", "drizzle");
  const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of migrationFiles) {
    const migrationSql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    // drizzle-kit separates statements with a "--> statement-breakpoint" marker
    for (const statement of migrationSql.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) await client.execute(trimmed);
    }
  }
  db = drizzle(client, { schema: s });
});

describe("students table", () => {
  it("creates a school, a section, and a student, and can query them back with a join", async () => {
    const [school] = await db.insert(s.schools).values({ name: "Test School" }).returning();
    const [year] = await db.insert(s.academicYears).values({
      schoolId: school.id, name: "2025-2026", startDate: "2025-08-01", endDate: "2026-06-30",
    }).returning();
    const [klass] = await db.insert(s.classes).values({ schoolId: school.id, academicYearId: year.id, name: "Grade 1" }).returning();
    const [section] = await db.insert(s.sections).values({ classId: klass.id, name: "A" }).returning();

    const [student] = await db.insert(s.students).values({
      schoolId: school.id, admissionNumber: "ADM-0001", firstName: "Ada", lastName: "Lovelace",
      sectionId: section.id, status: "active",
    }).returning();

    expect(student.firstName).toBe("Ada");

    const rows = await db
      .select({ name: s.students.firstName, className: s.classes.name })
      .from(s.students)
      .leftJoin(s.sections, eq(s.students.sectionId, s.sections.id))
      .leftJoin(s.classes, eq(s.sections.classId, s.classes.id))
      .where(eq(s.students.id, student.id));

    expect(rows[0]).toEqual({ name: "Ada", className: "Grade 1" });
  });

  it("enforces admission number is required (NOT NULL)", async () => {
    const [school] = await db.insert(s.schools).values({ name: "Another School" }).returning();
    await expect(
      // @ts-expect-error intentionally omitting a required field to verify the DB rejects it
      db.insert(s.students).values({ schoolId: school.id, firstName: "No", lastName: "AdmissionNumber", status: "active" })
    ).rejects.toThrow();
  });

  it("cascades deletion of a school to its students (foreign key ON DELETE CASCADE)", async () => {
    const [school] = await db.insert(s.schools).values({ name: "Cascade School" }).returning();
    await db.insert(s.students).values({ schoolId: school.id, admissionNumber: "ADM-CASCADE", firstName: "Casc", lastName: "Ade", status: "active" });

    await db.delete(s.schools).where(eq(s.schools.id, school.id));

    const remaining = await db.select().from(s.students).where(eq(s.students.schoolId, school.id));
    expect(remaining).toHaveLength(0);
  });

  it("supports pagination-style limit/offset queries", async () => {
    const [school] = await db.insert(s.schools).values({ name: "Pagination School" }).returning();
    for (let i = 0; i < 15; i++) {
      await db.insert(s.students).values({
        schoolId: school.id, admissionNumber: `ADM-PAG-${i}`, firstName: `Student${i}`, lastName: "Test", status: "active",
      });
    }
    const [{ count }] = await db.select({ count: sqlTag<number>`count(*)` }).from(s.students).where(eq(s.students.schoolId, school.id));
    expect(count).toBe(15);

    const page2 = await db.select().from(s.students).where(eq(s.students.schoolId, school.id)).limit(10).offset(10);
    expect(page2).toHaveLength(5);
  });
});
