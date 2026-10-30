import { createResearcherToken, RESEARCHER_COOKIE_NAME } from "@/lib/auth";
import { authenticateResearcherGroup } from "@/lib/groups";
import { getPool } from "@/lib/db";
import { internalError, jsonError, noStoreJson, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (typeof body?.code !== "string" || typeof body.password !== "string") {
    return jsonError("invalid_request");
  }

  if (body.code.length > 64 || body.password.length > 128) {
    return jsonError("unauthorized", 401);
  }

  try {
    const groupId = await authenticateResearcherGroup(getPool(), body.code, body.password);
    if (!groupId) return jsonError("unauthorized", 401);
    const response = noStoreJson({ authenticated: true });
    response.cookies.set(RESEARCHER_COOKIE_NAME, createResearcherToken(groupId), {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 12 * 60 * 60,
      path: "/",
    });
    return response;
  } catch (error) {
    return internalError(error);
  }
}
