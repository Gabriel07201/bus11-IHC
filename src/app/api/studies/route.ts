import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/db";
import { internalError, noStoreJson, readJson, requireResearcher } from "@/lib/http";
import { validateStudyInput } from "@/lib/study-validation";
import { studyFromDatabase } from "@/lib/studies";

export async function GET() {
  const groupId = await requireResearcher();
  if (typeof groupId !== "string") return groupId;

  try {
    const { rows } = await getPool().query(`
      SELECT s.id, s.title, s.description, s.locale, s.status, s.created_at::text, s.updated_at::text,
        COALESCE(c.participants, 0)::int AS participants,
        COALESCE(c.completed_evaluations, 0)::int AS completed_evaluations
      FROM studies s
      LEFT JOIN (
        SELECT ps.study_id,
          COUNT(DISTINCT ps.id) FILTER (WHERE ps.status IN ('in_progress', 'completed')) AS participants,
          COUNT(pa.id) FILTER (WHERE pa.answers IS NOT NULL) AS completed_evaluations
        FROM participant_sessions ps
        LEFT JOIN participant_assignments pa ON pa.session_id = ps.id
        GROUP BY ps.study_id
      ) c ON c.study_id = s.id
      WHERE s.group_id = $1
      ORDER BY s.updated_at DESC
    `, [groupId]);
    const legacy = await getPool().query("SELECT EXISTS (SELECT 1 FROM studies WHERE group_id IS NULL) AS has_unassigned_studies");

    return noStoreJson({ studies: rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      locale: row.locale,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      participantCount: row.participants,
      completedCount: row.completed_evaluations,
    })), legacyStudiesRequireNewDatabase: Boolean(legacy.rows[0]?.has_unassigned_studies) });
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: Request) {
  const groupId = await requireResearcher();
  if (typeof groupId !== "string") return groupId;

  const body = await readJson(request);
  const validation = validateStudyInput(body);
  if (!validation.ok) return noStoreJson({ error: "invalid_study", fields: validation.errors }, { status: 400 });

  try {
    const study = validation.value;
    const id = randomUUID();
    const { rows } = await getPool().query(
      `INSERT INTO studies
        (id, group_id, title, description, locale, consent_title, consent_body, demographic_fields, chatbots, chatbot_quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10)
       RETURNING id, title, description, locale, status, consent_title, consent_body,
         demographic_fields, chatbots, chatbot_quantity, created_at::text, updated_at::text`,
      [id, groupId, study.title, study.description, study.locale, study.consentTitle, study.consentBody,
        JSON.stringify(study.demographicFields), JSON.stringify(study.chatbots), study.chatbotQuantity],
    );
    return noStoreJson({ study: studyFromDatabase(rows[0]) }, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
