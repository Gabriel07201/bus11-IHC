import { NextResponse } from "next/server";
import { decryptParticipantCode } from "@/lib/auth";
import { isBusAnswers } from "@/lib/bus11";
import { buildCsv, type CsvEvaluation } from "@/lib/csv";
import { getPool } from "@/lib/db";
import { internalError, jsonError, requireResearcher } from "@/lib/http";
import type { DemographicField } from "@/lib/study-validation";
import { mergeStudyDemographicFields } from "@/lib/studies";

type Context = { params: Promise<{ studyId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const groupId = await requireResearcher();
  if (typeof groupId !== "string") return groupId;
  const { studyId } = await params;

  try {
    const pool = getPool();
    const studyResult = await pool.query(
      "SELECT id, title, demographic_fields FROM studies WHERE id = $1 AND group_id = $2",
      [studyId, groupId],
    );
    const study = studyResult.rows[0];
    if (!study) return jsonError("study_not_found", 404);

    const result = await pool.query(
      `SELECT ps.encrypted_code, ps.locale, ps.demographics, ps.study_snapshot,
        pa.chatbot_snapshot, pa.position, pa.answers, pa.completed_at::text
       FROM participant_sessions ps
       JOIN participant_assignments pa ON pa.session_id = ps.id
       JOIN studies s ON s.id = ps.study_id AND s.group_id = $2
       WHERE ps.study_id = $1 AND pa.answers IS NOT NULL AND pa.completed_at IS NOT NULL
       ORDER BY pa.completed_at, pa.position`,
      [studyId, groupId],
    );
    const fields = mergeStudyDemographicFields(
      study.demographic_fields as DemographicField[],
      result.rows.map((row) => row.study_snapshot),
    );

    const evaluations: CsvEvaluation[] = result.rows
      .filter((row) => isBusAnswers(row.answers) && row.completed_at)
      .map((row) => ({
        participantCode: decryptParticipantCode(row.encrypted_code),
        locale: row.locale,
        demographics: row.demographics,
        demographicFields: Array.isArray(row.study_snapshot?.demographicFields)
          ? row.study_snapshot.demographicFields
          : undefined,
        chatbot: row.chatbot_snapshot,
        position: row.position,
        answers: row.answers,
        completedAt: row.completed_at,
      }));
    const csv = buildCsv(evaluations, fields);
    const slug = String(study.title).normalize("NFKD").replace(/\p{Diacritic}/gu, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || study.id;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bus11-${slug}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return internalError(error);
  }
}
