import type { Messages } from "./i18n";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly fields?: Record<string, string>,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const data = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
    const fields = typeof data.fields === "object" && data.fields !== null
      ? data.fields as Record<string, string>
      : undefined;
    throw new ApiError(typeof data.error === "string" ? data.error : "request_failed", response.status, fields);
  }
  return payload as T;
}

export function apiErrorMessage(error: unknown, messages: Messages, fallback: string = messages.genericError): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "invalid_code":
      case "not_found": return messages.invalidCode;
      case "collection_not_open": return messages.collectionNotOpen;
      case "consent_required": return messages.consentRequired;
      case "invalid_demographics": return messages.invalidDemographics;
      case "invalid_answers": return messages.selectAnswer;
      case "study_not_found": return messages.studyNotFound;
      case "unauthorized": return messages.loginError;
      case "setup_required": return messages.setupError;
      case "group_code_in_use": return messages.groupCodeInUse;
      case "invalid_group_code": return messages.invalidGroupCode;
      case "invalid_password": return messages.invalidGroupPassword;
      default: return fallback;
    }
  }
  return error instanceof TypeError ? messages.networkError : fallback;
}
