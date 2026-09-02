import { db, client } from "./index";
import * as s from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  // Safety guard: this script destructively wipes every table before
  // reseeding. That's fine for a fresh dev/demo database, but catastrophic
  // if ever pointed at a database with real student/fee/staff records.
  // Require an explicit opt-in once the school has real data in it.
  const existingSchools = await client.execute("SELECT COUNT(*) AS c FROM schools");
  const existingStudents = await client.execute("SELECT COUNT(*) AS c FROM students");
  const schoolCount = Number(existingSchools.rows[0]?.c ?? 0);
  const studentCount = Number(existingStudents.rows[0]?.c ?? 0);
  const looksLikeRealData = studentCount > 0 && process.env.EDUCORE_ALLOW_RESEED !== "yes-wipe-everything";
  if (looksLikeRealData) {
    console.error(
      "\nRefusing to run: this database already has data in it (schools: " +
        schoolCount +
        ", students: " +
        studentCount +
        ").\n" +
        "db:seed DELETES ALL ROWS before reseeding demo data — running it against a\n" +
        "database with real records would destroy them irreversibly.\n\n" +
        "If this is genuinely a throwaway/dev database and you want to reset it anyway, run:\n" +
        "  EDUCORE_ALLOW_RESEED=yes-wipe-everything npm run db:seed\n"
    );
    process.exit(1);
  }

  console.log("Seeding EduCore demo data...");

  // Add profile_change_requests to the wipe list too.
  const tables = [
    "profile_change_requests", "concessions", "periods",
    "audit_logs", "notifications", "announcements", "assignment_submissions", "assignments",
    "student_transport", "routes", "vehicles", "book_issues", "books", "payroll",
    "payments", "invoice_items", "invoices", "fee_structures", "exam_results",
    "exam_schedules", "exams", "tests", "timetable_slots", "staff_attendance", "student_attendance",
    "teachers", "student_parents", "parents", "students", "class_subject_teachers", "class_subjects",
    "subjects", "sections", "classes", "academic_years", "permissions", "users", "schools",
  ];
  for (const t of tables) await client.execute(`DELETE FROM ${t};`);

  const [school] = await db.insert(s.schools).values({
    name: "Greenwood International School",
    address: "123 Education Lane, Lahore, Pakistan",
    phone: "+92-42-1234567",
    email: "info@greenwood.edu",
    website: "https://greenwood.edu",
    primaryColor: "#2563eb",
    currency: "PKR",
    timezone: "Asia/Karachi",
    gradingSystem: "percentage",
  }).returning();

  const [year] = await db.insert(s.academicYears).values({
    schoolId: school.id,
    name: "2025-2026",
    startDate: "2025-08-01",
    endDate: "2026-06-30",
    isCurrent: true,
  }).returning();

  // School bell schedule (periods) — matches the fixed 08:00-08:45 style slots
  // used for the demo timetable below.
  const periodDefs = [
    { label: "Period 1", startTime: "08:00", endTime: "08:45" },
    { label: "Period 2", startTime: "08:45", endTime: "09:30" },
    { label: "Period 3", startTime: "09:30", endTime: "10:15" },
    { label: "Short Break", startTime: "10:15", endTime: "10:30", isBreak: true },
    { label: "Period 4", startTime: "10:30", endTime: "11:15" },
    { label: "Period 5", startTime: "11:15", endTime: "12:00" },
    { label: "Lunch Break", startTime: "12:00", endTime: "12:40", isBreak: true },
    { label: "Period 6", startTime: "12:40", endTime: "13:25" },
  ];
  for (let i = 0; i < periodDefs.length; i++) {
    await db.insert(s.periods).values({ schoolId: school.id, sortOrder: i, ...periodDefs[i] });
  }

  // Users: one per role for demo login (4 roles: admin, teacher, student, parent)
  const demoUsers = [
    { name: "Sara Admin", email: "admin@educore.dev", role: "admin" },
    { name: "Imran Manager", email: "manager@educore.dev", role: "manager" },
    { name: "Bilal Teacher", email: "teacher@educore.dev", role: "teacher" },
    { name: "Ali Student", email: "student@educore.dev", role: "student" },
    { name: "Naveed Parent", email: "parent@educore.dev", role: "parent" },
  ];
  const pw = await hash("Password123!");
  const insertedUsers: Record<string, string> = {};
  for (const u of demoUsers) {
    const [row] = await db.insert(s.users).values({
      schoolId: school.id,
      name: u.name,
      email: u.email,
      passwordHash: pw,
      role: u.role,
    }).returning();
    insertedUsers[u.role] = row.id;
  }

  // Classes & sections
  const classNames = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"];
  const classIds: string[] = [];
  for (let i = 0; i < classNames.length; i++) {
    const [c] = await db.insert(s.classes).values({
      schoolId: school.id, academicYearId: year.id, name: classNames[i], order: i,
    }).returning();
    classIds.push(c.id);
  }
  const sectionIds: string[] = [];
  for (const classId of classIds) {
    for (const name of ["A", "B"]) {
      const [sec] = await db.insert(s.sections).values({ classId, name, roomNumber: `R-${Math.floor(Math.random() * 20) + 1}` }).returning();
      sectionIds.push(sec.id);
    }
  }

  // Subjects
  const subjectNames = ["Mathematics", "English", "Science", "Social Studies", "Computer Science", "Art"];
  const subjectIds: string[] = [];
  for (const name of subjectNames) {
    const [sub] = await db.insert(s.subjects).values({ schoolId: school.id, name, code: name.slice(0, 3).toUpperCase() }).returning();
    subjectIds.push(sub.id);
  }

  // Teachers (5)
  const teacherFirstNames = ["Bilal", "Sana", "Kamran", "Zara", "Farhan"];
  const teacherIds: string[] = [];
  for (let i = 0; i < teacherFirstNames.length; i++) {
    const [t] = await db.insert(s.teachers).values({
      schoolId: school.id,
      userId: i === 0 ? insertedUsers["teacher"] : null,
      employeeId: `EMP-${1000 + i}`,
      firstName: teacherFirstNames[i],
      lastName: "Khan",
      qualification: "M.Ed",
      phone: `+92-300-000${1000 + i}`,
      joiningDate: "2023-01-15",
      designation: i === 0 ? "Senior Teacher" : "Teacher",
      department: "Academics",
    }).returning();
    teacherIds.push(t.id);
    // pay a couple of payroll periods
    const basic = 80000 + i * 5000;
    const allowances = 10000;
    const deductions = 3000;
    await db.insert(s.payroll).values({
      teacherId: t.id, period: "2026-07", basicSalary: basic, allowances, deductions,
      netSalary: basic + allowances - deductions, status: "paid", paidAt: "2026-07-30",
    });
    await db.insert(s.payroll).values({
      teacherId: t.id, period: "2026-08", basicSalary: basic, allowances, deductions,
      netSalary: basic + allowances - deductions, status: "pending",
    });
  }

  // assign class teacher + subject teachers
  for (let i = 0; i < sectionIds.length; i++) {
    await db.update(s.sections).set({ classTeacherId: teacherIds[i % teacherIds.length] }).where(eq(s.sections.id, sectionIds[i]));
    for (const subjId of subjectIds.slice(0, 3)) {
      await db.insert(s.classSubjectTeachers).values({
        sectionId: sectionIds[i], subjectId: subjId, teacherId: teacherIds[i % teacherIds.length],
      });
      await db.insert(s.timetableSlots).values({
        sectionId: sectionIds[i], subjectId: subjId, teacherId: teacherIds[i % teacherIds.length],
        dayOfWeek: (i + subjectIds.indexOf(subjId)) % 5,
        startTime: "08:00", endTime: "08:45", room: `R-${(i % 10) + 1}`,
      });
    }
  }

  // Fee structures
  const feeStructIds: Record<string, string> = {};
  for (const classId of classIds) {
    const [fs1] = await db.insert(s.feeStructures).values({
      schoolId: school.id, name: "Tuition Fee", classId, category: "tuition", amount: 8000, frequency: "monthly",
    }).returning();
    feeStructIds[classId] = fs1.id;
  }

  // Students, parents, attendance, invoices, exam results
  const firstNames = ["Ahmed", "Zainab", "Hassan", "Mariam", "Omar", "Sadia", "Bilal", "Noor", "Hamza", "Sana",
    "Usman", "Iqra", "Danish", "Alina", "Talha", "Mehak", "Raza", "Hira", "Saad", "Rabia"];
  let admissionCounter = 1001;
  const studentIds: string[] = [];

  for (const sectionId of sectionIds) {
    for (let i = 0; i < 8; i++) {
      const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
      const [student] = await db.insert(s.students).values({
        schoolId: school.id,
        userId: studentIds.length === 0 ? insertedUsers["student"] : null,
        admissionNumber: `ADM-${admissionCounter++}`,
        firstName: fn,
        lastName: "Malik",
        dob: "2016-05-12",
        gender: i % 2 === 0 ? "male" : "female",
        bloodGroup: ["A+", "B+", "O+", "AB+"][i % 4],
        address: "Lahore, Pakistan",
        admissionDate: "2025-08-01",
        sectionId,
        rollNumber: `${i + 1}`,
        status: "active",
      }).returning();
      studentIds.push(student.id);

      // parent
      const [parent] = await db.insert(s.parents).values({
        schoolId: school.id,
        userId: studentIds.length === 1 ? insertedUsers["parent"] : null,
        firstName: "Naveed",
        lastName: "Malik",
        relation: "father",
        phone: "+92-321-1112222",
        email: `parent.${student.admissionNumber}@example.com`,
        occupation: "Engineer",
      }).returning();
      await db.insert(s.studentParents).values({ studentId: student.id, parentId: parent.id });

      // 10 days attendance history
      for (let d = 1; d <= 10; d++) {
        const roll = Math.random();
        const status = roll > 0.9 ? "absent" : roll > 0.8 ? "late" : "present";
        await db.insert(s.studentAttendance).values({
          studentId: student.id, sectionId, date: `2026-08-${String(d).padStart(2, "0")}`,
          status, markedBy: teacherIds[0],
        });
      }

      // invoice for this month
      const amount = 8000;
      const [inv] = await db.insert(s.invoices).values({
        schoolId: school.id, studentId: student.id, invoiceNumber: `INV-${student.admissionNumber}-0826`,
        totalAmount: amount, dueDate: "2026-08-10",
        status: Math.random() > 0.35 ? "paid" : "unpaid",
      }).returning();
      await db.insert(s.invoiceItems).values({ invoiceId: inv.id, description: "Tuition Fee - August", amount });
      if (inv.status === "paid") {
        await db.insert(s.payments).values({ invoiceId: inv.id, amount, method: "bank_transfer", paidAt: "2026-08-05", receivedBy: insertedUsers["admin"] });
      }
    }
  }

  // Exams + results
  const [midterm] = await db.insert(s.exams).values({
    schoolId: school.id, academicYearId: year.id, name: "Mid Term Examination",
    startDate: "2026-08-15", endDate: "2026-08-20", isPublished: true,
  }).returning();

  for (const sectionId of sectionIds.slice(0, 4)) {
    for (const subjId of subjectIds.slice(0, 3)) {
      const [sched] = await db.insert(s.examSchedules).values({
        examId: midterm.id, sectionId, subjectId: subjId, date: "2026-08-16", maxMarks: 100, passMarks: 40,
      }).returning();
      const sectionStudents = studentIds.slice(0, 8); // sample subset for demo
      for (const studId of sectionStudents) {
        const marks = Math.floor(Math.random() * 60) + 40;
        await db.insert(s.examResults).values({
          examScheduleId: sched.id, studentId: studId, marksObtained: marks,
          grade: marks >= 90 ? "A+" : marks >= 80 ? "A" : marks >= 70 ? "B" : marks >= 60 ? "C" : "D",
        });
      }
    }
  }

  // Library
  const bookTitles = ["The Alchemist", "1984", "A Brief History of Time", "Charlotte's Web", "The Hobbit"];
  const bookIds: string[] = [];
  for (const title of bookTitles) {
    const [b] = await db.insert(s.books).values({
      schoolId: school.id, title, author: "Various", category: "General", totalCopies: 5, availableCopies: 3, shelf: "S-1",
    }).returning();
    bookIds.push(b.id);
  }
  for (let i = 0; i < 3; i++) {
    await db.insert(s.bookIssues).values({
      bookId: bookIds[i], studentId: studentIds[i], issueDate: "2026-08-10", dueDate: "2026-08-24", status: "issued",
    });
  }

  // Transport
  const [vehicle] = await db.insert(s.vehicles).values({
    schoolId: school.id, plateNumber: "LEA-2026", model: "Toyota Coaster", capacity: 30,
    driverName: "Malik Driver", driverPhone: "+92-333-4445555",
  }).returning();
  const [route] = await db.insert(s.routes).values({
    vehicleId: vehicle.id, name: "Route A - Gulberg", stops: JSON.stringify(["Gulberg Main", "Model Town", "Garden Town"]), fee: 3000,
  }).returning();
  await db.insert(s.studentTransport).values({ studentId: studentIds[0], routeId: route.id, stopName: "Gulberg Main" });

  // Assignments
  const [assignment] = await db.insert(s.assignments).values({
    sectionId: sectionIds[0], subjectId: subjectIds[0], teacherId: teacherIds[0],
    title: "Chapter 3 Worksheet", description: "Complete exercises 1-10", dueDate: "2026-09-02",
  }).returning();
  await db.insert(s.assignmentSubmissions).values({
    assignmentId: assignment.id, studentId: studentIds[0], status: "submitted", submittedAt: "2026-08-25",
  });

  // Announcements
  await db.insert(s.announcements).values({
    schoolId: school.id, title: "Mid Term Exams Schedule Released",
    body: "The mid-term examination schedule has been published. Please check the Exams section for details.",
    audience: "all", createdBy: insertedUsers["admin"],
  });
  await db.insert(s.announcements).values({
    schoolId: school.id, title: "Fee Reminder", body: "August tuition fees are due by the 10th.",
    audience: "parents", createdBy: insertedUsers["admin"],
  });

  console.log("Seed complete.");
  console.log("Demo login (password for all: Password123!):");
  for (const u of demoUsers) console.log(`  ${u.role.padEnd(14)} -> ${u.email}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
