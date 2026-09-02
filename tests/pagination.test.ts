import { describe, it, expect } from "vitest";
import { parsePagination, paginatedResult, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/pagination";

describe("parsePagination", () => {
  it("defaults to page 1 and DEFAULT_PAGE_SIZE when nothing is provided", () => {
    const { page, pageSize, offset } = parsePagination(new URLSearchParams());
    expect(page).toBe(1);
    expect(pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(offset).toBe(0);
  });

  it("computes the correct offset for a later page", () => {
    const { offset } = parsePagination(new URLSearchParams("page=3&pageSize=10"));
    expect(offset).toBe(20);
  });

  it("clamps page to a minimum of 1", () => {
    const { page } = parsePagination(new URLSearchParams("page=-5"));
    expect(page).toBe(1);
  });

  it("clamps pageSize to MAX_PAGE_SIZE", () => {
    const { pageSize } = parsePagination(new URLSearchParams("pageSize=99999"));
    expect(pageSize).toBe(MAX_PAGE_SIZE);
  });

  it("ignores garbage input and falls back to defaults", () => {
    const { page, pageSize } = parsePagination(new URLSearchParams("page=abc&pageSize=xyz"));
    expect(page).toBe(1);
    expect(pageSize).toBe(DEFAULT_PAGE_SIZE);
  });
});

describe("paginatedResult", () => {
  it("computes totalPages correctly, rounding up", () => {
    const result = paginatedResult([1, 2, 3], 25, 1, 10);
    expect(result.pagination.totalPages).toBe(3);
  });

  it("always reports at least 1 total page even with zero rows", () => {
    const result = paginatedResult([], 0, 1, 10);
    expect(result.pagination.totalPages).toBe(1);
  });
});
