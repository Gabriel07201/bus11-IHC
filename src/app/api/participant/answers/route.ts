import { saveParticipantAnswers } from "@/lib/participants";
import { participantError } from "@/lib/participant-http";
import { jsonError, noStoreJson, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (typeof body?.code !== "string" || typeof body.assignmentId !== "string") {
    return jsonError("invalid_answers");
  }

  try {
    const session = await saveParticipantAnswers(body.code, body.assignmentId, body.answers);
    return noStoreJson({ session });
  } catch (error) {
    return participantError(error);
  }
}
