import { setParticipantConsent } from "@/lib/participants";
import { participantError } from "@/lib/participant-http";
import { jsonError, noStoreJson, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (typeof body?.code !== "string" || typeof body.accepted !== "boolean") {
    return jsonError("invalid_consent");
  }

  try {
    const session = await setParticipantConsent(body.code, body.accepted);
    return noStoreJson({ session });
  } catch (error) {
    return participantError(error);
  }
}
