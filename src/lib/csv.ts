import type { BusAnswers } from "./bus11";
import { scoreBus11 } from "./bus11";
import { formatAgeRange, type DemographicField } from "./study-validation";

export interface CsvEvaluation {
  participantCode: string;
  locale: "pt-BR" | "en";
  demographics: Record<string, string | number>;
  demographicFields?: DemographicField[];
  chatbot: { id: string; name: string; url: string; task: string };
  position: number;
  answers: BusAnswers;
  completedAt: string;
}

function csvCell(value: string | number): string {
  let text = String(value);
  if (typeof value === "string" && /^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function fieldLabel(field: DemographicField, locale: CsvEvaluation["locale"]): string {
  if (field.label) return field.label;
  const labels = locale === "en"
    ? { age: "Age", sex: "Sex", nationality: "Nationality" }
    : { age: "Idade", sex: "Sexo", nationality: "Nacionalidade" };
  return labels[field.id as keyof typeof labels] ?? field.id;
}

export function buildCsv(rows: readonly CsvEvaluation[], fields: readonly DemographicField[]): string {
  const locale = rows[0]?.locale ?? "pt-BR";
  const demographicHeaders = fields.map((field) => `demographic_${field.id}_${fieldLabel(field, locale)}`);
  const itemHeaders = Array.from({ length: 11 }, (_, index) => `item_${String(index + 1).padStart(2, "0")}`);
  const factorHeaders = ["accessibility", "functionalConversation", "privacy", "responsiveness"]
    .flatMap((factor) => [`factor_${factor}_mean_1_5`, `factor_${factor}_0_100`]);
  const headers = [
    "participant_code",
    "study_language",
    ...demographicHeaders,
    "chatbot_id",
    "chatbot_name",
    "chatbot_link",
    "evaluation_order",
    ...itemHeaders,
    ...factorHeaders,
    "overall_0_100",
    "completed_at",
  ];

  const lines = [headers.map((header) => csvCell(header)).join(",")];
  for (const row of rows) {
    const score = scoreBus11(row.answers);
    const values: (string | number)[] = [
      row.participantCode,
      row.locale,
      ...fields.map((field) => {
        const value = row.demographics[field.id];
        if (field.id === "age" && typeof value === "string") {
          const snapshotField = row.demographicFields?.find((item) => item.id === field.id);
          const range = snapshotField?.ranges?.find((item) => item.id === value);
          if (range) return formatAgeRange(range);
        }
        return value === undefined ? "" : value;
      }),
      row.chatbot.id,
      row.chatbot.name,
      row.chatbot.url,
      row.position,
      ...row.answers,
      ...score.factors.flatMap((factor) => [factor.mean, factor.normalized]),
      score.overall,
      row.completedAt,
    ];
    lines.push(values.map(csvCell).join(","));
  }

  return `\uFEFF${lines.join("\r\n")}`;
}
