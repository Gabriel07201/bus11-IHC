import { describe, expect, it, vi } from "vitest";
import { authenticateResearcherGroup, createResearcherGroup, GroupCodeAlreadyInUseError } from "./groups";

type GroupPool = Parameters<typeof createResearcherGroup>[0];

function makePool() {
  const groups = new Map<string, { id: string; code: string; password_salt: string; password_hash: string }>();
  const query = vi.fn(async (sql: string, values: unknown[] = []) => {
    if (sql.includes("INSERT INTO researcher_groups")) {
      const [id, code, normalizedCode, salt, passwordHash] = values as string[];
      if (groups.has(normalizedCode)) return { rows: [], rowCount: 0 };
      const group = { id, code, password_salt: salt, password_hash: passwordHash };
      groups.set(normalizedCode, group);
      return { rows: [{ id, code }], rowCount: 1 };
    }

    if (sql.includes("FROM researcher_groups")) {
      const group = groups.get(String(values[0]));
      return { rows: group ? [group] : [], rowCount: group ? 1 : 0 };
    }

    throw new Error(`Unexpected query: ${sql}`);
  });

  return { groups, queryMock: query, query: query as unknown as GroupPool["query"] };
}

describe("researcher groups", () => {
  it("stores a salted scrypt hash instead of the password", async () => {
    const pool = makePool();
    const result = await createResearcherGroup(pool, " Equipe-IHC ", "senha-segura-123");
    const parameters = pool.queryMock.mock.calls[0]?.[1] as string[];

    expect(result).toEqual({ id: expect.any(String), code: "Equipe-IHC" });
    expect(parameters).toHaveLength(5);
    expect(parameters[2]).toBe("equipe-ihc");
    expect(parameters[3]).toMatch(/^[a-f0-9]{32}$/);
    expect(parameters[4]).toMatch(/^[a-f0-9]{128}$/);
    expect(parameters).not.toContain("senha-segura-123");
  });

  it("authenticates case-insensitive group codes and rejects an incorrect password", async () => {
    const pool = makePool();
    const group = await createResearcherGroup(pool, "equipe-ihc", "senha-segura-123");

    expect(await authenticateResearcherGroup(pool, " EQUIPE-IHC ", "senha-segura-123")).toBe(group.id);
    expect(await authenticateResearcherGroup(pool, "equipe-ihc", "senha-incorreta")).toBeNull();
    expect(await authenticateResearcherGroup(pool, "grupo-inexistente", "senha-segura-123")).toBeNull();
  });

  it("uses the database unique constraint to allow only one concurrent code registration", async () => {
    const pool = makePool();
    const results = await Promise.allSettled([
      createResearcherGroup(pool, "Equipe-IHC", "senha-segura-123"),
      createResearcherGroup(pool, " equipe-ihc ", "outra-senha-segura"),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected).toMatchObject({ status: "rejected", reason: expect.any(GroupCodeAlreadyInUseError) });
  });

  it("rejects group codes shorter than three characters and passwords shorter than eight", async () => {
    const pool = makePool();

    await expect(createResearcherGroup(pool, "ab", "senha-segura-123"))
      .rejects.toMatchObject({ message: "invalid_group_code" });
    await expect(createResearcherGroup(pool, "equipe", "curta"))
      .rejects.toMatchObject({ message: "invalid_password" });
    expect(pool.queryMock).not.toHaveBeenCalled();
  });
});
