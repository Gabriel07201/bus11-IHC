import { createResearcherToken, RESEARCHER_COOKIE_NAME } from "@/lib/auth";
import { GroupCodeAlreadyInUseError, InvalidResearcherGroupInputError, createResearcherGroup } from "@/lib/groups";
import { getPool } from "@/lib/db";
import { internalError, jsonError, noStoreJson, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (typeof body?.code !== "string" || typeof body.password !== "string") {
    return jsonError("invalid_request");
  }

  try {
    const group = await createResearcherGroup(getPool(), body.code, body.password);
    const response = noStoreJson({ authenticated: true, group: { code: group.code } }, { status: 201 });
    response.cookies.set(RESEARCHER_COOKIE_NAME, createResearcherToken(group.id), {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 12 * 60 * 60,
      path: "/",
    });
    return response;
  } catch (error) {
    if (error instanceof GroupCodeAlreadyInUseError) return jsonError("group_code_in_use", 409);
    if (error instanceof InvalidResearcherGroupInputError) {
      return jsonError(error.message, 400);
    }
    return internalError(error);
  }
}
