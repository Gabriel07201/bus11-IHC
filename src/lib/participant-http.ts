import type { NextResponse } from "next/server";
import { internalError, noStoreJson } from "./http";
import { ParticipantFlowError } from "./participants";

export function participantError(error: unknown): NextResponse {
  if (error instanceof ParticipantFlowError) {
    return noStoreJson({
      error: error.code,
      ...(error.fields ? { fields: error.fields } : {}),
    }, { status: error.status });
  }
  return internalError(error);
}
