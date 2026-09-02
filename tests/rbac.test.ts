import { describe, it, expect } from "vitest";
import { can, assertPermission, ForbiddenError } from "@/lib/rbac";

describe("rbac.can", () => {
  it("grants admin every action via wildcard", () => {
    expect(can("admin", "payroll", "delete")).toBe(true);
    expect(can("admin", "audit_logs", "view")).toBe(true);
    expect(can("admin", "users", "edit")).toBe(true);
  });

  it("gives manager everything except settings — including full user management", () => {
    expect(can("manager", "students", "delete")).toBe(true);
    expect(can("manager", "fees", "approve")).toBe(true);
    expect(can("manager", "payroll", "delete")).toBe(true);
    expect(can("manager", "homework", "delete")).toBe(true);
    expect(can("manager", "communication", "delete")).toBe(true);
    expect(can("manager", "users", "view")).toBe(true);
    expect(can("manager", "users", "create")).toBe(true);
    expect(can("manager", "users", "edit")).toBe(true);
    expect(can("manager", "users", "delete")).toBe(true);
    expect(can("manager", "settings", "view")).toBe(false);
    expect(can("manager", "settings", "edit")).toBe(false);
  });

  it("denies teachers access to payroll and students:create", () => {
    expect(can("teacher", "payroll", "view")).toBe(false);
    expect(can("teacher", "students", "create")).toBe(false);
  });

  it("allows teachers to mark attendance and manage homework", () => {
    expect(can("teacher", "attendance", "create")).toBe(true);
    expect(can("teacher", "homework", "delete")).toBe(true);
  });

  it("allows parents to view (pay) fees but not edit them", () => {
    expect(can("parent", "fees", "approve")).toBe(true);
    expect(can("parent", "fees", "edit")).toBe(false);
  });

  it("allows students to view their own homework/exams but not create anything", () => {
    expect(can("student", "homework", "view")).toBe(true);
    expect(can("student", "homework", "create")).toBe(false);
    expect(can("student", "exams", "create")).toBe(false);
  });

  it("denies unknown roles everything", () => {
    expect(can("intruder", "dashboard", "view")).toBe(false);
  });
});

describe("rbac.assertPermission", () => {
  it("throws ForbiddenError with a descriptive message when denied", () => {
    expect(() => assertPermission("teacher", "payroll", "view")).toThrow(ForbiddenError);
    try {
      assertPermission("teacher", "payroll", "view");
    } catch (err) {
      expect((err as Error).message).toContain("teacher");
      expect((err as Error).message).toContain("payroll");
    }
  });

  it("does not throw when permitted", () => {
    expect(() => assertPermission("admin", "students", "delete")).not.toThrow();
  });
});
