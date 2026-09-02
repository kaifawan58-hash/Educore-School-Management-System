import { NextResponse } from "next/server";
import { ForbiddenError } from "./rbac";

export function ok(data: unknown, init?: number) {
  return NextResponse.json({ success: true, data }, { status: init ?? 200 });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: message, ...extra }, { status });
}

export async function handleApi(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ForbiddenError) return fail(err.message, 403);
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return fail("Authentication required", 401);
    console.error(err);
    return fail("Internal server error", 500);
  }
}
