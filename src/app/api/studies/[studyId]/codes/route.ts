import { randomUUID } from "node:crypto";
import { createParticipantCode, encryptParticipantCode, hashParticipantCode } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { internalError, jsonError, noStoreJson, readJson, requireResearcher } from "@/lib/http";

type Context = { params: Promise<{ studyId: string }> };

export async function POST(request: Request, { params }: Context) {
  const groupId = await requireResearcher();
  if (typeof groupId !== "string") return groupId;
  const { studyId } = await params;
  const body = await readJson(request);
  const count = body?.count;
  if (!Number.isInteger(count) || (count as number) < 1 || (count as number) > 50) {
    return jsonError("invalid_count");
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const studyResult = await client.query(
      `SELECT id, title, description, locale, consent_title, consent_body,
        demographic_fields, chatbots, chatbot_quantity, status
       FROM studies WHERE id = $1 AND group_id = $2 FOR UPDATE`,
      [studyId, groupId],
    );
    const study = studyResult.rows[0];
    if (!study) {
      await client.query("ROLLBACK");
      return jsonError("study_not_found", 404);
    }
    if (study.status !== "open") {
      await client.query("ROLLBACK");
      return jsonError("collection_not_open", 409);
    }

    const snapshot = {
      id: study.id,
      title: study.title,
      description: study.description,
      locale: study.locale,
      consentTitle: study.consent_title,
      consentBody: study.consent_body,
      demographicFields: study.demographic_fields,
      chatbots: study.chatbots,
      chatbotQuantity: study.chatbot_quantity,
    };
    const codes: string[] = [];
    for (let index = 0; index < (count as number); index += 1) {
      let stored = false;
      for (let attempt = 0; attempt < 5 && !stored; attempt += 1) {
        const code = createParticipantCode();
        const result = await client.query(
          `INSERT INTO participant_sessions (id, study_id, code_hash, encrypted_code, locale, study_snapshot)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb)
           ON CONFLICT (code_hash) DO NOTHING
           RETURNING id`,
          [randomUUID(), studyId, hashParticipantCode(code), encryptParticipantCode(code), study.locale, JSON.stringify(snapshot)],
        );
        if (result.rowCount) {
          codes.push(code);
          stored = true;
        }
      }
      if (!stored) throw new Error("Unable to allocate unique participant code");
    }

    await client.query("COMMIT");
    return noStoreJson({ codes, participantPath: `/${study.locale}/participant` }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    return internalError(error);
  } finally {
    client.release();
  }
}
