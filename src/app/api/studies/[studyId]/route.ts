import { getPool } from "@/lib/db";
import { internalError, jsonError, noStoreJson, readJson, requireResearcher } from "@/lib/http";
import { validateStudyInput } from "@/lib/study-validation";
import { studyFromDatabase } from "@/lib/studies";

type Context = { params: Promise<{ studyId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const groupId = await requireResearcher();
  if (typeof groupId !== "string") return groupId;
  const { studyId } = await params;

  try {
    const { rows } = await getPool().query(
      `SELECT id, title, description, locale, status, consent_title, consent_body,
        demographic_fields, chatbots, chatbot_quantity, created_at::text, updated_at::text
       FROM studies WHERE id = $1 AND group_id = $2`,
      [studyId, groupId],
    );
    if (!rows[0]) return jsonError("study_not_found", 404);
    return noStoreJson({ study: studyFromDatabase(rows[0]) });
  } catch (error) {
    return internalError(error);
  }
}

export async function PUT(request: Request, { params }: Context) {
  const groupId = await requireResearcher();
  if (typeof groupId !== "string") return groupId;
  const { studyId } = await params;
  const body = await readJson(request);
  const validation = validateStudyInput(body);
  if (!validation.ok) return noStoreJson({ error: "invalid_study", fields: validation.errors }, { status: 400 });

  try {
    const study = validation.value;
    const { rows } = await getPool().query(
      `UPDATE studies SET title = $2, description = $3, locale = $4, consent_title = $5, consent_body = $6,
        demographic_fields = $7::jsonb, chatbots = $8::jsonb, chatbot_quantity = $9, updated_at = now()
       WHERE id = $1 AND group_id = $10
       RETURNING id, title, description, locale, status, consent_title, consent_body,
         demographic_fields, chatbots, chatbot_quantity, created_at::text, updated_at::text`,
      [studyId, study.title, study.description, study.locale, study.consentTitle, study.consentBody,
        JSON.stringify(study.demographicFields), JSON.stringify(study.chatbots), study.chatbotQuantity, groupId],
    );
    if (!rows[0]) return jsonError("study_not_found", 404);
    return noStoreJson({ study: studyFromDatabase(rows[0]) });
  } catch (error) {
    return internalError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const groupId = await requireResearcher();
  if (typeof groupId !== "string") return groupId;
  const { studyId } = await params;
  const body = await readJson(request);
  if (body?.status !== "open" && body?.status !== "closed") return jsonError("invalid_status");

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query("SELECT status FROM studies WHERE id = $1 AND group_id = $2 FOR UPDATE", [studyId, groupId]);
    if (!current.rows[0]) {
      await client.query("ROLLBACK");
      return jsonError("study_not_found", 404);
    }

    const currentStatus = current.rows[0].status as string;
    const nextStatus = body.status as string;
    const allowed = (currentStatus === "draft" && nextStatus === "open")
      || (currentStatus === "open" && nextStatus === "closed")
      || (currentStatus === "closed" && nextStatus === "open");
    if (!allowed) {
      await client.query("ROLLBACK");
      return jsonError("invalid_status_transition", 409);
    }

    await client.query("UPDATE studies SET status = $3, updated_at = now() WHERE id = $1 AND group_id = $2", [studyId, groupId, nextStatus]);
    await client.query("COMMIT");
    return noStoreJson({ status: nextStatus });
  } catch (error) {
    await client.query("ROLLBACK");
    return internalError(error);
  } finally {
    client.release();
  }
}
