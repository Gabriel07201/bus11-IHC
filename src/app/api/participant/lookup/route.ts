import { getParticipantSession } from "@/lib/participants";
import { participantError } from "@/lib/participant-http";
import { jsonError, noStoreJson, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (typeof body?.code !== "string") return jsonError("invalid_code");

  try {
    const session = await getParticipantSession(body.code);
    return noStoreJson({ session });
  } catch (error) {
    return participantError(error);
  }
}
