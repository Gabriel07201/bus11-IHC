import { describe, expect, it } from "vitest";
import { buildCsv, type CsvEvaluation } from "./csv";

const fields = [
  { id: "nationality", type: "text" as const },
  { id: "custom-123e4567-e89b-12d3-a456-426614174000", type: "text" as const, label: "Comentário" },
];

const row: CsvEvaluation = {
  participantCode: "A1B2-C3D4-E5F6-7890-ABCD",
  locale: "pt-BR",
  demographics: { nationality: "Brasileira", "custom-123e4567-e89b-12d3-a456-426614174000": "Ótimo, \"rápido\"\nsegunda linha" },
  chatbot: { id: "bot-1", name: "Assistente, A", url: "https://example.com/chat", task: "Perguntar preço" },
  position: 2,
  answers: [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1],
  completedAt: "2026-10-29T12:00:00.000Z",
};

describe("buildCsv", () => {
  it("exports one completed evaluation with raw answers, scores, and UTF-8 BOM", () => {
    const csv = buildCsv([row], fields);
    const lines = csv.replace(/^\uFEFF/, "").split("\r\n");

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('"participant_code"');
    expect(lines[0]).toContain('"item_11"');
    expect(lines[0]).toContain('"factor_accessibility_0_100"');
    expect(lines[1]).toContain('"A1B2-C3D4-E5F6-7890-ABCD"');
    expect(lines[1]).toContain('"Ótimo, ""rápido""\nsegunda linha"');
  });

  it.each(["=1+1", " +SUM(A1:A2)", "-2+3", "@SUM(1,2)"]) (
    "prefixes spreadsheet formula text with an apostrophe: %s",
    (value) => {
      const csv = buildCsv([{
        ...row,
        demographics: { ...row.demographics, "custom-123e4567-e89b-12d3-a456-426614174000": value },
      }], fields);

      expect(csv).toContain(`"'${value}"`);
    },
  );

  it("exports the age-range label saved in the participant's study snapshot", () => {
    const rangeId = "123e4567-e89b-12d3-a456-426614174010";
    const ageField = { id: "age", type: "number", ranges: [{ id: rangeId, min: 18, max: 24 }] };
    const csv = buildCsv([{
      ...row,
      demographics: { age: rangeId },
      demographicFields: [ageField],
    } as unknown as CsvEvaluation], [ageField] as unknown as typeof fields);

    expect(csv).toContain('"18–24"');
  });
});
