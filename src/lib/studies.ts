import type { StudyRecord, StudyStatus } from "./types";
import type { DemographicField } from "./study-validation";

export function studyFromDatabase(row: Record<string, unknown>): StudyRecord {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description),
    locale: row.locale as StudyRecord["locale"],
    status: row.status as StudyStatus,
    consentTitle: String(row.consent_title),
    consentBody: String(row.consent_body),
    demographicFields: row.demographic_fields as StudyRecord["demographicFields"],
    chatbots: row.chatbots as StudyRecord["chatbots"],
    chatbotQuantity: Number(row.chatbot_quantity),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mergeStudyDemographicFields(
  current: readonly DemographicField[],
  snapshots: readonly unknown[],
): DemographicField[] {
  const fields = new Map(current.map((field) => [field.id, field]));
  for (const value of snapshots) {
    if (typeof value !== "object" || value === null) continue;
    const snapshot = value as { demographicFields?: DemographicField[] };
    for (const field of snapshot.demographicFields ?? []) {
      if (!fields.has(field.id)) fields.set(field.id, field);
    }
  }
  return [...fields.values()];
}
