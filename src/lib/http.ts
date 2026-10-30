import { NextResponse } from "next/server";
import { getResearcherGroupId } from "./auth";

export function jsonError(error: string, status = 400): NextResponse {
  return noStoreJson({ error }, { status });
}

export function noStoreJson(body: unknown, init: ResponseInit = {}): NextResponse {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  return NextResponse.json(body, { ...init, headers });
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export async function requireResearcher(): Promise<string | NextResponse> {
  return await getResearcherGroupId() ?? jsonError("unauthorized", 401);
}

export function internalError(error: unknown): NextResponse {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
  console.error("API failure", code || (error instanceof Error ? error.name : "unknown"));
  return jsonError("internal_error", 500);
}
