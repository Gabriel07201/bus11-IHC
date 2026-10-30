import { getPool } from "@/lib/db";
import { internalError, jsonError, noStoreJson, requireResearcher } from "@/lib/http";
import { summarizeResults, type CompletedEvaluation } from "@/lib/results";
import { mergeStudyDemographicFields } from "@/lib/studies";

type Context = { params: Promise<{ studyId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const groupId = await requireResearcher();
  if (typeof groupId !== "string") return groupId;
  const { studyId } = await params;

  try {
    const pool = getPool();
    const studyResult = await pool.query(
      "SELECT id, title, status, locale, demographic_fields FROM studies WHERE id = $1 AND group_id = $2",
      [studyId, groupId],
    );
    const study = studyResult.rows[0];
    if (!study) return jsonError("study_not_found", 404);

    const result = await pool.query(
      `SELECT ps.id AS session_id, ps.demographics, ps.study_snapshot,
        pa.chatbot_id, pa.chatbot_snapshot, pa.position, pa.answers, pa.completed_at::text
       FROM participant_sessions ps
       JOIN participant_assignments pa ON pa.session_id = ps.id
       JOIN studies s ON s.id = ps.study_id AND s.group_id = $2
       WHERE ps.study_id = $1 AND pa.answers IS NOT NULL AND pa.completed_at IS NOT NULL
       ORDER BY pa.completed_at, pa.position`,
      [studyId, groupId],
    );
    const evaluations: CompletedEvaluation[] = result.rows.map((row) => ({
      sessionId: row.session_id,
      demographics: row.demographics,
      demographicFields: Array.isArray(row.study_snapshot?.demographicFields)
        ? row.study_snapshot.demographicFields
        : undefined,
      chatbot: row.chatbot_snapshot,
      position: row.position,
      answers: row.answers,
      completedAt: row.completed_at,
    }));
    return noStoreJson({
      study: { id: study.id, title: study.title, status: study.status, locale: study.locale },
      results: summarizeResults(
        evaluations,
        mergeStudyDemographicFields(study.demographic_fields, result.rows.map((row) => row.study_snapshot)),
        study.locale,
      ),
    });
  } catch (error) {
    return internalError(error);
  }
}
