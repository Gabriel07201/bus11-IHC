import { describe, expect, it } from "vitest";
import { BUS11_FACTORS, scoreBus11 } from "./bus11";

describe("scoreBus11", () => {
  it.each([
    { answer: 1, mean: 1, normalized: 0 },
    { answer: 3, mean: 3, normalized: 50 },
    { answer: 5, mean: 5, normalized: 100 },
  ])("maps a uniform response of $answer to $normalized", ({ answer, mean, normalized }) => {
    const result = scoreBus11(Array<number>(11).fill(answer));

    expect(result.factors).toHaveLength(4);
    expect(result.factors.map((factor) => factor.mean)).toEqual(Array(4).fill(mean));
    expect(result.factors.map((factor) => factor.normalized)).toEqual(Array(4).fill(normalized));
    expect(result.overall).toBe(normalized);
  });

  it("uses the approved four factor groups and weights their normalized scores equally", () => {
    expect(BUS11_FACTORS.map((factor) => factor.items)).toEqual([
      [1, 2],
      [3, 4, 5, 6, 7, 8, 9],
      [10],
      [11],
    ]);

    const result = scoreBus11([1, 5, 3, 3, 3, 3, 3, 3, 3, 5, 1]);

    expect(result.factors.map((factor) => factor.mean)).toEqual([3, 3, 5, 1]);
    expect(result.factors.map((factor) => factor.normalized)).toEqual([50, 50, 100, 0]);
    expect(result.overall).toBe(50);
  });

  it.each([
    [],
    Array<number>(10).fill(3),
    Array<number>(12).fill(3),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1],
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1],
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 2.5, 1],
  ])("rejects invalid or incomplete answers: %j", (answers) => {
    expect(() => scoreBus11(answers)).toThrow();
  });
});
