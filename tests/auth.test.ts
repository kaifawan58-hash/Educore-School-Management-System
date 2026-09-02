import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, signSession, verifySession } from "@/lib/auth";

describe("password hashing", () => {
  it("hashes a password and verifies the correct password against it", async () => {
    const hash = await hashPassword("Password123!");
    expect(hash).not.toBe("Password123!");
    expect(await verifyPassword("Password123!", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("Password123!");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces a different hash each time (salted)", async () => {
    const a = await hashPassword("same-input");
    const b = await hashPassword("same-input");
    expect(a).not.toBe(b);
  });
});

describe("session tokens", () => {
  const payload = { userId: "u1", schoolId: "s1", role: "teacher", name: "Test Teacher", email: "t@example.com" };

  it("round-trips a signed session", () => {
    const token = signSession(payload);
    const decoded = verifySession(token);
    expect(decoded).toMatchObject(payload);
  });

  it("rejects a tampered/invalid token", () => {
    const token = signSession(payload);
    const tampered = token.slice(0, -2) + "xx";
    expect(verifySession(tampered)).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(verifySession("not-a-real-token")).toBeNull();
  });
});
