import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const timestamps = {
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
};

/* ---------------- Multi-tenant: Schools ---------------- */
export const schools = sqliteTable("schools", {
  id: id(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  primaryColor: text("primary_color").default("#2563eb"),
  secondaryColor: text("secondary_color").default("#0f172a"),
  currency: text("currency").default("USD"),
  timezone: text("timezone").default("UTC"),
  gradingSystem: text("grading_system").default("percentage"), // percentage | gpa
  status: text("status").notNull().default("active"), // active | inactive
  ...timestamps,
});

/* ---------------- Users / Roles / Permissions ---------------- */
export const ROLES = ["admin", "manager", "teacher", "student", "parent"] as const;

export const users = sqliteTable("users", {
  id: id(),
  schoolId: text("school_id").references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // one of ROLES
  avatarUrl: text("avatar_url"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastLoginAt: text("last_login_at"),
  ...timestamps,
});

export const permissions = sqliteTable("permissions", {
  id: id(),
  role: text("role").notNull(),
  module: text("module").notNull(), // e.g. "students", "fees"
  canView: integer("can_view", { mode: "boolean" }).notNull().default(false),
  canCreate: integer("can_create", { mode: "boolean" }).notNull().default(false),
  canEdit: integer("can_edit", { mode: "boolean" }).notNull().default(false),
  canDelete: integer("can_delete", { mode: "boolean" }).notNull().default(false),
  canExport: integer("can_export", { mode: "boolean" }).notNull().default(false),
  canApprove: integer("can_approve", { mode: "boolean" }).notNull().default(false),
});

/* ---------------- Academic structure ---------------- */
export const academicYears = sqliteTable("academic_years", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "2025-2026"
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
});

export const classes = sqliteTable("classes", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  academicYearId: text("academic_year_id").notNull().references(() => academicYears.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "Grade 5"
  order: integer("order").notNull().default(0),
});

export const sections = sqliteTable("sections", {
  id: id(),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "A"
  roomNumber: text("room_number"),
  classTeacherId: text("class_teacher_id"),
  capacity: integer("capacity").default(40),
});

export const subjects = sqliteTable("subjects", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code"),
});

export const classSubjectTeachers = sqliteTable("class_subject_teachers", {
  id: id(),
  sectionId: text("section_id").notNull().references(() => sections.id, { onDelete: "cascade" }),
  subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  teacherId: text("teacher_id").notNull(),
});

// Curriculum-level assignment: "this subject is taught in this class" —
// independent of which teacher covers it or which section, unlike
// class_subject_teachers above (which is per-section, per-teacher, for
// timetabling). This powers the Subject & Class assignment matrix.
export const classSubjects = sqliteTable("class_subjects", {
  id: id(),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
});

/* ---------------- People ---------------- */
export const students = sqliteTable("students", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  admissionNumber: text("admission_number").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  photoUrl: text("photo_url"),
  dob: text("dob"),
  gender: text("gender"),
  bloodGroup: text("blood_group"),
  address: text("address"),
  phone: text("phone"),
  previousSchool: text("previous_school"),
  admissionDate: text("admission_date"),
  sectionId: text("section_id").references(() => sections.id, { onDelete: "set null" }),
  rollNumber: text("roll_number"),
  status: text("status").notNull().default("active"), // active | inactive | graduated | transferred
  medicalNotes: text("medical_notes"),
  ...timestamps,
});

export const parents = sqliteTable("parents", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  relation: text("relation").default("guardian"), // father | mother | guardian
  phone: text("phone"),
  email: text("email"),
  occupation: text("occupation"),
  address: text("address"),
  isEmergencyContact: integer("is_emergency_contact", { mode: "boolean" }).default(true),
});

export const studentParents = sqliteTable("student_parents", {
  id: id(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  parentId: text("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
});

export const teachers = sqliteTable("teachers", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  employeeId: text("employee_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  photoUrl: text("photo_url"),
  qualification: text("qualification"),
  phone: text("phone"),
  address: text("address"),
  joiningDate: text("joining_date"),
  designation: text("designation").default("Teacher"),
  department: text("department"),
  status: text("status").notNull().default("active"),
  ...timestamps,
});

/* ---------------- Attendance ---------------- */
export const studentAttendance = sqliteTable("student_attendance", {
  id: id(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  sectionId: text("section_id").notNull().references(() => sections.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  status: text("status").notNull(), // present | absent | late | excused | half_day
  remarks: text("remarks"),
  markedBy: text("marked_by"),
  ...timestamps,
});

export const staffAttendance = sqliteTable("staff_attendance", {
  id: id(),
  teacherId: text("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  status: text("status").notNull(),
  remarks: text("remarks"),
  ...timestamps,
});

/* ---------------- Timetable ---------------- */
/* ---------------- Timetable ---------------- */
// School-wide period template (Period 1, Short Break, Lunch, etc.) — shared
// across all classes/sections and days, so admins configure the school's
// bell schedule once instead of per-class-per-day.
export const periods = sqliteTable("periods", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // "Period 1", "Lunch Break"
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isBreak: integer("is_break", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const timetableSlots = sqliteTable("timetable_slots", {
  id: id(),
  sectionId: text("section_id").notNull().references(() => sections.id, { onDelete: "cascade" }),
  subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  teacherId: text("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6
  startTime: text("start_time").notNull(), // "08:00"
  endTime: text("end_time").notNull(),
  room: text("room"),
});

/* ---------------- Exams & Results ---------------- */
// Quick single-subject, single-class unit tests — lighter weight than a full
// multi-subject Exam below. Teachers create these directly for their class.
export const tests = sqliteTable("tests", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  teacherId: text("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  date: text("date").notNull(),
  totalMarks: real("total_marks").notNull().default(100),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  description: text("description"),
  ...timestamps,
});

export const exams = sqliteTable("exams", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  academicYearId: text("academic_year_id").notNull().references(() => academicYears.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "Mid Term"
  startDate: text("start_date"),
  endDate: text("end_date"),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
});

export const examSchedules = sqliteTable("exam_schedules", {
  id: id(),
  examId: text("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  sectionId: text("section_id").notNull().references(() => sections.id, { onDelete: "cascade" }),
  subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  date: text("date"),
  maxMarks: real("max_marks").notNull().default(100),
  passMarks: real("pass_marks").notNull().default(40),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
});

export const examResults = sqliteTable("exam_results", {
  id: id(),
  examScheduleId: text("exam_schedule_id").notNull().references(() => examSchedules.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  marksObtained: real("marks_obtained"),
  grade: text("grade"),
  teacherComment: text("teacher_comment"),
});

/* ---------------- Fees & Finance ---------------- */
export const feeStructures = sqliteTable("fee_structures", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "Tuition Fee - Grade 5"
  classId: text("class_id").references(() => classes.id, { onDelete: "cascade" }),
  category: text("category").notNull().default("tuition"), // tuition|admission|transport|library|exam|other
  amount: real("amount").notNull(),
  frequency: text("frequency").notNull().default("monthly"), // monthly|term|annual|one_time
});

export const invoices = sqliteTable("invoices", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  totalAmount: real("total_amount").notNull(),
  discount: real("discount").notNull().default(0),
  fine: real("fine").notNull().default(0),
  dueDate: text("due_date"),
  status: text("status").notNull().default("unpaid"), // unpaid|partial|paid|overdue
  ...timestamps,
});

export const invoiceItems = sqliteTable("invoice_items", {
  id: id(),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
});

export const payments = sqliteTable("payments", {
  id: id(),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  method: text("method").notNull().default("cash"), // cash|bank_transfer|card|online
  reference: text("reference"),
  paidAt: text("paid_at").notNull().default(sql`(current_timestamp)`),
  receivedBy: text("received_by"),
  receiptNumber: text("receipt_number"),
});

// Per-student fee discounts (sibling, merit, staff ward, SC/ST, or a custom
// reason) — applied as a percent or flat amount, optionally scoped to one
// fee structure or left blank to apply to all of that student's fees.
export const concessions = sqliteTable("concessions", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  feeStructureId: text("fee_structure_id").references(() => feeStructures.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("custom"), // sibling|merit|staff_ward|sc_st|custom
  discountType: text("discount_type").notNull().default("percent"), // percent|flat
  value: real("value").notNull(),
  description: text("description"),
  createdBy: text("created_by"),
  ...timestamps,
});

/* ---------------- Payroll ---------------- */
export const payroll = sqliteTable("payroll", {
  id: id(),
  teacherId: text("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  period: text("period").notNull(), // "2026-08"
  basicSalary: real("basic_salary").notNull(),
  allowances: real("allowances").notNull().default(0),
  deductions: real("deductions").notNull().default(0),
  bonus: real("bonus").notNull().default(0),
  netSalary: real("net_salary").notNull(),
  status: text("status").notNull().default("pending"), // pending|paid
  paidAt: text("paid_at"),
});

/* ---------------- Library ---------------- */
export const books = sqliteTable("books", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  author: text("author"),
  isbn: text("isbn"),
  category: text("category"),
  totalCopies: integer("total_copies").notNull().default(1),
  availableCopies: integer("available_copies").notNull().default(1),
  shelf: text("shelf"),
});

export const bookIssues = sqliteTable("book_issues", {
  id: id(),
  bookId: text("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  studentId: text("student_id").references(() => students.id, { onDelete: "cascade" }),
  teacherId: text("teacher_id").references(() => teachers.id, { onDelete: "cascade" }),
  issueDate: text("issue_date").notNull(),
  dueDate: text("due_date").notNull(),
  returnDate: text("return_date"),
  fine: real("fine").notNull().default(0),
  status: text("status").notNull().default("issued"), // issued|returned|lost
});

/* ---------------- Transport ---------------- */
export const vehicles = sqliteTable("vehicles", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  plateNumber: text("plate_number").notNull(),
  model: text("model"),
  capacity: integer("capacity"),
  driverName: text("driver_name"),
  driverPhone: text("driver_phone"),
});

export const routes = sqliteTable("routes", {
  id: id(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  stops: text("stops"), // JSON array string
  fee: real("fee").notNull().default(0),
});

export const studentTransport = sqliteTable("student_transport", {
  id: id(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  routeId: text("route_id").notNull().references(() => routes.id, { onDelete: "cascade" }),
  stopName: text("stop_name"),
});

/* ---------------- Homework / Assignments ---------------- */
export const assignments = sqliteTable("assignments", {
  id: id(),
  sectionId: text("section_id").notNull().references(() => sections.id, { onDelete: "cascade" }),
  subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  teacherId: text("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: text("due_date"),
  ...timestamps,
});

export const assignmentSubmissions = sqliteTable("assignment_submissions", {
  id: id(),
  assignmentId: text("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  submittedAt: text("submitted_at"),
  fileUrl: text("file_url"),
  marks: real("marks"),
  feedback: text("feedback"),
  status: text("status").notNull().default("pending"), // pending|submitted|graded|late
});

/* ---------------- Communication ---------------- */
export const announcements = sqliteTable("announcements", {
  id: id(),
  schoolId: text("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  audience: text("audience").notNull().default("all"), // all|students|parents|teachers|staff
  createdBy: text("created_by"),
  ...timestamps,
});

export const notifications = sqliteTable("notifications", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body"),
  category: text("category").notNull().default("general"),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
});

/* ---------------- Audit Logs ---------------- */
export const auditLogs = sqliteTable("audit_logs", {
  id: id(),
  userId: text("user_id"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  details: text("details"), // JSON string
  ipAddress: text("ip_address"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

/* ---------------- Account change requests ---------------- */
// Non-admin users can't change their own name/email/password directly —
// they submit a request here, and an admin must approve it before it takes
// effect. Admins themselves bypass this and edit directly (see /api/account).
export const profileChangeRequests = sqliteTable("profile_change_requests", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestedName: text("requested_name"),
  requestedEmail: text("requested_email"),
  requestedPasswordHash: text("requested_password_hash"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
  reviewNote: text("review_note"),
  ...timestamps,
});
