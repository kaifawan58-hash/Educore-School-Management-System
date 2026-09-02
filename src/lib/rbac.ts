// Central role-based permission matrix.
// Enforced on the server in every API route via requirePermission().
// Never trust the frontend for authorization decisions.
//
// EduCore uses 4 roles: admin, teacher, student, parent. Admin covers every
// staff function (school office, accounts, HR, library, transport desk) —
// if a school needs separate staff logins with narrower access later, add a
// role here and a row to the matrix; nothing else needs to change.

export type Role = "admin" | "manager" | "teacher" | "student" | "parent";

export type Action = "view" | "create" | "edit" | "delete" | "export" | "approve";

export type Module =
  | "dashboard"
  | "students"
  | "parents"
  | "teachers"
  | "classes"
  | "attendance"
  | "timetable"
  | "exams"
  | "fees"
  | "payroll"
  | "library"
  | "transport"
  | "homework"
  | "communication"
  | "reports"
  | "documents"
  | "audit_logs"
  | "settings"
  | "users";

// Wildcard "*" means all modules.
const MATRIX: Record<Role, Partial<Record<Module | "*", Action[]>>> = {
  admin: { "*": ["view", "create", "edit", "delete", "export", "approve"] },
  // Manager: day-to-day school operations (admissions, staff, academics,
  // finance, logistics) without the two things reserved for admin —
  // managing user accounts/logins and system-wide settings.
  // Manager: gets everything Admin gets, except Settings — that's the one
  // thing reserved for Admin alone. Manager can fully manage user accounts
  // too (create/edit/delete logins, approve account-change requests).
  manager: {
    dashboard: ["view"],
    students: ["view", "create", "edit", "delete", "export"],
    parents: ["view", "create", "edit", "delete", "export"],
    teachers: ["view", "create", "edit", "delete", "export"],
    classes: ["view", "create", "edit", "delete"],
    attendance: ["view", "create", "edit", "delete", "export"],
    timetable: ["view", "create", "edit", "delete"],
    exams: ["view", "create", "edit", "delete", "export", "approve"],
    fees: ["view", "create", "edit", "delete", "export", "approve"],
    payroll: ["view", "create", "edit", "delete", "approve"],
    library: ["view", "create", "edit", "delete"],
    transport: ["view", "create", "edit", "delete"],
    homework: ["view", "create", "edit", "delete"],
    communication: ["view", "create", "edit", "delete"],
    reports: ["view", "export"],
    audit_logs: ["view"],
    users: ["view", "create", "edit", "delete", "approve"],
    // settings: intentionally omitted — the one thing reserved for Admin alone
  },
  teacher: {
    dashboard: ["view"],
    students: ["view"],
    classes: ["view"],
    attendance: ["view", "create", "edit"],
    timetable: ["view"],
    exams: ["view", "create", "edit"],
    homework: ["view", "create", "edit", "delete"],
    communication: ["view", "create"],
    library: ["view"],
  },
  student: {
    dashboard: ["view"],
    attendance: ["view"],
    timetable: ["view"],
    exams: ["view"],
    homework: ["view"],
    fees: ["view"],
    library: ["view"],
    communication: ["view"],
  },
  parent: {
    dashboard: ["view"],
    attendance: ["view"],
    timetable: ["view"],
    exams: ["view"],
    homework: ["view"],
    fees: ["view", "approve"], // pay fees
    communication: ["view", "create"],
  },
};

export function can(role: string, module: Module, action: Action): boolean {
  const rules = MATRIX[role as Role];
  if (!rules) return false;
  const wildcard = rules["*"];
  if (wildcard?.includes(action)) return true;
  const moduleRules = rules[module];
  return !!moduleRules?.includes(action);
}

export class ForbiddenError extends Error {
  constructor(msg = "Forbidden") {
    super(msg);
    this.name = "ForbiddenError";
  }
}

export function assertPermission(role: string, module: Module, action: Action) {
  if (!can(role, module, action)) {
    throw new ForbiddenError(`Role '${role}' cannot '${action}' on '${module}'`);
  }
}
