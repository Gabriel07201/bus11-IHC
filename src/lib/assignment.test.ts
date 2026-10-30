import { describe, expect, it } from "vitest";
import { selectBalancedBots } from "./assignment";

const bots = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("selectBalancedBots", () => {
  it("chooses only bots with the smallest assignment count before randomizing ties", () => {
    const selected = selectBalancedBots(
      bots,
      { a: 3, b: 1, c: 1 },
      2,
      (length) => length - 1,
    );

    expect(selected.map((bot) => bot.id)).toEqual(["c", "b"]);
  });

  it("never repeats a bot within one session", () => {
    const selected = selectBalancedBots(bots, {}, 3, () => 0);

    expect(selected).toHaveLength(3);
    expect(new Set(selected.map((bot) => bot.id)).size).toBe(3);
  });

  it("balances repeated single-bot assignments across tied bots", () => {
    const counts = { a: 0, b: 0, c: 0 };

    for (let turn = 0; turn < 9; turn += 1) {
      const [selected] = selectBalancedBots(bots, counts, 1, () => 0);
      counts[selected.id as keyof typeof counts] += 1;
    }

    expect(counts).toEqual({ a: 3, b: 3, c: 3 });
  });

  it("uses the random callback to shuffle the selected order", () => {
    const indexes = [0, 1];
    const selected = selectBalancedBots(bots, {}, 3, () => indexes.shift() ?? 0);

    expect(selected.map((bot) => bot.id)).toEqual(["c", "b", "a"]);
  });

  it.each([
    { quantity: 0, bots },
    { quantity: 4, bots },
    { quantity: 1, bots: [{ id: "a" }, { id: "a" }] },
  ])("rejects invalid selection settings: %j", ({ quantity, bots: options }) => {
    expect(() => selectBalancedBots(options, {}, quantity, () => 0)).toThrow();
  });
});
