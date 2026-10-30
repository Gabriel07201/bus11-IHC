import { describe, expect, it } from "vitest";
import { summarizeResults, type CompletedEvaluation } from "./results";

const fields = [
  { id: "age", type: "number" as const },
  { id: "sex", type: "text" as const },
];

const evaluation = (
  sessionId: string,
  chatbotId: string,
  name: string,
  answer: number,
  age: number,
  sex = "A",
): CompletedEvaluation => ({
  sessionId,
  demographics: { age, sex },
  chatbot: { id: chatbotId, name, url: `https://example.com/${chatbotId}` },
  position: 1,
  answers: Array<number>(11).fill(answer),
  completedAt: "2026-10-29T12:00:00.000Z",
});

describe("summarizeResults", () => {
  it("summarizes complete evaluations, factors, overall scores, and Likert distributions by chatbot", () => {
    const invalid = evaluation("p3", "a", "Assistente A", 2, 40);
    invalid.answers = Array<number>(11).fill(6);
    const result = summarizeResults([
      evaluation("p1", "a", "Assistente A", 1, 20),
      evaluation("p1", "b", "Assistente B", 5, 20),
      evaluation("p2", "a", "Assistente A", 5, 30, "B"),
      invalid,
    ], fields);

    expect(result.evaluations).toBe(3);
    expect(result.participants).toBe(2);
    expect(result.chatbots[0]).toMatchObject({ id: "a", evaluations: 2, overall: 50 });
    expect(result.chatbots[0].factors.map((factor) => factor.mean)).toEqual([3, 3, 3, 3]);
    expect(result.chatbots[0].items[0].counts).toEqual([1, 0, 0, 0, 1]);
    expect(result.chatbots[1]).toMatchObject({ id: "b", evaluations: 1, overall: 100 });
  });

  it("compares demographic groups using unique participants and participant-level descriptive means", () => {
    const result = summarizeResults([
      evaluation("p1", "a", "Assistente A", 1, 20),
      evaluation("p1", "b", "Assistente B", 5, 20),
      evaluation("p2", "a", "Assistente A", 5, 30, "B"),
    ], fields);

    expect(result.demographics[0].groups).toEqual([
      { value: "20", participants: 1, percent: 50, meanOverall: 50 },
      { value: "30", participants: 1, percent: 50, meanOverall: 100 },
    ]);
    expect(result.demographics[1].groups.map((group) => group.participants)).toEqual([1, 1]);
  });

  it("returns clear empty summaries when there are no complete valid evaluations", () => {
    const incomplete = evaluation("p1", "a", "Assistente A", 3, 20);
    incomplete.answers = [1, 2, 3];

    expect(summarizeResults([incomplete], fields)).toMatchObject({
      evaluations: 0,
      participants: 0,
      chatbots: [],
      demographics: [{ groups: [] }, { groups: [] }],
    });
  });

  it("labels age bands using each participant's stored study snapshot", () => {
    const firstRange = "123e4567-e89b-12d3-a456-426614174010";
    const editedRange = "123e4567-e89b-12d3-a456-426614174011";
    const firstSnapshot = [{ id: "age", type: "number", ranges: [{ id: firstRange, min: 18, max: 24 }] }];
    const editedSnapshot = [{ id: "age", type: "number", ranges: [{ id: editedRange, min: 18, max: 29 }] }];
    const rows = [
      { ...evaluation("p1", "a", "Assistente A", 3, 18), demographics: { age: firstRange }, demographicFields: firstSnapshot },
      { ...evaluation("p2", "a", "Assistente A", 5, 18), demographics: { age: editedRange }, demographicFields: editedSnapshot },
    ] as unknown as CompletedEvaluation[];
    const field = firstSnapshot[0] as unknown as Parameters<typeof summarizeResults>[1][number];
    const result = summarizeResults(rows, [field], "pt-BR");

    expect(result.demographics[0].groups.map((group) => group.value)).toEqual(["18–24", "18–29"]);
  });
});
