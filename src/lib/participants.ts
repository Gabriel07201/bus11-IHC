import { randomInt, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { hashParticipantCode } from "./auth";
import { isBusAnswers } from "./bus11";
import { getPool } from "./db";
import { selectBalancedBots } from "./assignment";
import { validateDemographicAnswers, type DemographicField, type StudyInput } from "./study-validation";
import type { ParticipantSessionView } from "./types";

type Snapshot = Pick<StudyInput, "title" | "description" | "locale" | "consentTitle" | "consentBody" | "demographicFields" | "chatbots" | "chatbotQuantity">;

export class ParticipantFlowError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly fields?: Record<string, string>,
  ) {
    super(code);
    this.name = "ParticipantFlowError";
  }
}

export async function getParticipantSession(code: string): Promise<ParticipantSessionView> {
  const pool = getPool();
  const codeHash = getCodeHash(code);
  const result = await pool.query(
    `SELECT ps.id, ps.status, ps.locale, ps.study_snapshot, s.status AS study_status
     FROM participant_sessions ps JOIN studies s ON s.id = ps.study_id
     WHERE ps.code_hash = $1`,
    [codeHash],
  );
  if (!result.rows[0]) throw new ParticipantFlowError("not_found", 404);
  if (result.rows[0].status === "issued" && result.rows[0].study_status !== "open") {
    throw new ParticipantFlowError("collection_not_open", 409);
  }
  return buildSessionView(pool, result.rows[0]);
}

export async function setParticipantConsent(code: string, accepted: boolean): Promise<ParticipantSessionView> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const session = await findSession(client, code, true);
    if (session.status === "declined") {
      await client.query("COMMIT");
      return buildSessionView(client, session);
    }
    if (session.status !== "issued") {
      if (!accepted) throw new ParticipantFlowError("consent_already_recorded", 409);
      await client.query("COMMIT");
      return buildSessionView(client, session);
    }

    const study = await client.query("SELECT status FROM studies WHERE id = $1 FOR UPDATE", [session.study_id]);
    if (study.rows[0]?.status !== "open") throw new ParticipantFlowError("collection_not_open", 409);

    const status = accepted ? "consented" : "declined";
    await client.query(
      "UPDATE participant_sessions SET status = $2, consented_at = $3, updated_at = now() WHERE id = $1",
      [session.id, status, accepted ? new Date() : null],
    );
    session.status = status;
    await client.query("COMMIT");
    return buildSessionView(client, session);
  } catch (error) {
    await rollback(client);
    throw error;
  } finally {
    client.release();
  }
}

export async function saveParticipantDemographics(
  code: string,
  input: unknown,
): Promise<ParticipantSessionView> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const session = await findSession(client, code, true);
    if (session.status === "in_progress" || session.status === "completed") {
      await client.query("COMMIT");
      return buildSessionView(client, session);
    }
    if (session.status !== "consented") throw new ParticipantFlowError("consent_required", 409);

    const snapshot = session.study_snapshot as Snapshot;
    const validation = validateDemographicAnswers(snapshot.demographicFields, input);
    if (!validation.ok) throw new ParticipantFlowError("invalid_demographics", 400, validation.errors);

    // Serializing assignments on the study row keeps balance decisions consistent across simultaneous participants.
    await client.query("SELECT id FROM studies WHERE id = $1 FOR UPDATE", [session.study_id]);
    const countsResult = await client.query(
      `SELECT pa.chatbot_id, COUNT(*)::int AS assignments
       FROM participant_assignments pa
       JOIN participant_sessions ps ON ps.id = pa.session_id
       WHERE ps.study_id = $1
       GROUP BY pa.chatbot_id`,
      [session.study_id],
    );
    const counts = Object.fromEntries(countsResult.rows.map((row) => [row.chatbot_id, row.assignments]));
    const selected = selectBalancedBots(snapshot.chatbots, counts, snapshot.chatbotQuantity, randomInt);
    const assignments = selected.map((chatbot, index) => ({ chatbot, position: index + 1 }));

    await client.query(
      "UPDATE participant_sessions SET demographics = $2::jsonb, status = 'in_progress', updated_at = now() WHERE id = $1",
      [session.id, JSON.stringify(validation.value)],
    );
    for (const { chatbot, position } of assignments) {
      await client.query(
        `INSERT INTO participant_assignments (id, session_id, chatbot_id, chatbot_snapshot, position)
         VALUES ($1, $2, $3, $4::jsonb, $5)`,
        [randomUUID(), session.id, chatbot.id, JSON.stringify(chatbot), position],
      );
    }
    session.status = "in_progress";
    await client.query("COMMIT");
    return buildSessionView(client, session);
  } catch (error) {
    await rollback(client);
    throw error;
  } finally {
    client.release();
  }
}

export async function saveParticipantAnswers(
  code: string,
  assignmentId: string,
  answers: unknown,
): Promise<ParticipantSessionView> {
  if (!isBusAnswers(answers)) throw new ParticipantFlowError("invalid_answers", 400);

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const session = await findSession(client, code, true);
    if (session.status === "completed") {
      await client.query("COMMIT");
      return buildSessionView(client, session);
    }
    if (session.status !== "in_progress") throw new ParticipantFlowError("session_not_started", 409);

    const assignment = await client.query(
      "SELECT id, answers FROM participant_assignments WHERE id = $1 AND session_id = $2 FOR UPDATE",
      [assignmentId, session.id],
    );
    if (!assignment.rows[0]) throw new ParticipantFlowError("assignment_not_found", 404);
    if (assignment.rows[0].answers === null) {
      await client.query(
        "UPDATE participant_assignments SET answers = $2::jsonb, completed_at = now() WHERE id = $1",
        [assignmentId, JSON.stringify(answers)],
      );
    }

    const pending = await client.query(
      "SELECT COUNT(*)::int AS count FROM participant_assignments WHERE session_id = $1 AND answers IS NULL",
      [session.id],
    );
    if (pending.rows[0].count === 0) {
      await client.query("UPDATE participant_sessions SET status = 'completed', updated_at = now() WHERE id = $1", [session.id]);
      session.status = "completed";
    }

    await client.query("COMMIT");
    return buildSessionView(client, session);
  } catch (error) {
    await rollback(client);
    throw error;
  } finally {
    client.release();
  }
}

function getCodeHash(code: string): string {
  try {
    return hashParticipantCode(code);
  } catch (error) {
    if (error instanceof RangeError) throw new ParticipantFlowError("invalid_code", 400);
    throw error;
  }
}

async function findSession(client: PoolClient, code: string, lock = false): Promise<QueryResultRow> {
  const result = await client.query(
    `SELECT ps.id, ps.study_id, ps.status, ps.locale, ps.study_snapshot, s.status AS study_status
     FROM participant_sessions ps JOIN studies s ON s.id = ps.study_id
     WHERE ps.code_hash = $1${lock ? " FOR UPDATE OF ps" : ""}`,
    [getCodeHash(code)],
  );
  if (!result.rows[0]) throw new ParticipantFlowError("not_found", 404);
  return result.rows[0];
}

async function buildSessionView(client: Pick<PoolClient, "query">, row: QueryResultRow): Promise<ParticipantSessionView> {
  const snapshot = row.study_snapshot as Snapshot;
  const result = await client.query(
    `SELECT id, chatbot_id, chatbot_snapshot, position, answers
     FROM participant_assignments WHERE session_id = $1 ORDER BY position`,
    [row.id],
  );
  return {
    id: row.id,
    status: row.status,
    locale: snapshot.locale,
    title: snapshot.title,
    description: snapshot.description,
    consentTitle: snapshot.consentTitle,
    consentBody: snapshot.consentBody,
    demographicFields: snapshot.demographicFields as DemographicField[],
    assignments: result.rows.map((assignment) => ({
      id: assignment.id,
      position: assignment.position,
      chatbotId: assignment.chatbot_id,
      chatbot: assignment.chatbot_snapshot,
      completed: assignment.answers !== null,
    })),
  };
}

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Keep the original transaction error.
  }
}
