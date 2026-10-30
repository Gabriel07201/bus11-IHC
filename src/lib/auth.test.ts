import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as authModule from "./auth";
import {
  createParticipantCode,
  decryptParticipantCode,
  encryptParticipantCode,
  hashParticipantCode,
  normalizeParticipantCode,
  createResearcherToken,
  verifyResearcherToken,
} from "./auth";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const secret = "0123456789abcdef".repeat(4);
let authSecretDirectory: string;

beforeEach(async () => {
  authSecretDirectory = await mkdtemp(path.join(os.tmpdir(), "bus11-auth-"));
  const secretPath = path.join(authSecretDirectory, "app-secret");
  await writeFile(secretPath, secret, { mode: 0o600 });
  vi.stubEnv("BUS11_SECRET_FILE", secretPath);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(authSecretDirectory, { recursive: true, force: true });
});

type EnsureAppSecretOptions = {
  secretPath: string;
  hasExistingParticipantData: () => Promise<boolean>;
  legacySecret: string;
};
type EnsureAppSecret = (options: EnsureAppSecretOptions) => Promise<string>;

function getEnsureAppSecret(): EnsureAppSecret {
  const ensure = (authModule as unknown as { ensureAppSecret?: EnsureAppSecret }).ensureAppSecret;
  expect(ensure).toBeTypeOf("function");
  return ensure as EnsureAppSecret;
}

async function withSecretPath<T>(run: (secretPath: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "bus11-secret-"));
  try {
    return await run(path.join(directory, "app-secret"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("persistent application secret", () => {
  it("creates one random key and reuses it across concurrent startups", async () => {
    const ensure = getEnsureAppSecret();
    await withSecretPath(async (secretPath) => {
      const options: EnsureAppSecretOptions = {
        secretPath,
        hasExistingParticipantData: async () => false,
        legacySecret: "",
      };
      const [first, second] = await Promise.all([ensure(options), ensure(options)]);

      expect(first).toMatch(/^[a-f0-9]{64}$/);
      expect(second).toBe(first);
      expect(await readFile(secretPath, "utf8")).toBe(first);
    });
  });

  it("does not invent a replacement key when participant data already exists", async () => {
    const ensure = getEnsureAppSecret();
    await withSecretPath(async (secretPath) => {
      await expect(ensure({
        secretPath,
        hasExistingParticipantData: async () => true,
        legacySecret: "",
      })).rejects.toThrow(/dados de participantes/i);
    });
  });

  it("persists a valid legacy key so existing participant codes remain usable", async () => {
    const ensure = getEnsureAppSecret();
    await withSecretPath(async (secretPath) => {
      const legacySecret = "0123456789abcdef".repeat(4);
      const result = await ensure({
        secretPath,
        hasExistingParticipantData: async () => true,
        legacySecret,
      });

      expect(result).toBe(legacySecret);
      expect(await readFile(secretPath, "utf8")).toBe(legacySecret);
    });
  });

  it("uses the persisted key for authentication without requiring APP_SECRET", async () => {
    await withSecretPath(async (secretPath) => {
      await writeFile(secretPath, "0123456789abcdef".repeat(4), { mode: 0o600 });
      vi.stubEnv("APP_SECRET", "");
      vi.stubEnv("BUS11_SECRET_FILE", secretPath);

      expect(() => createResearcherToken("f9b6f55f-83d0-44f8-85a8-fc58da218fd1")).not.toThrow();
    });
  });
});

describe("participant codes", () => {
  it("creates a readable random code and accepts its formatted form", () => {
    const code = createParticipantCode();

    expect(code).toMatch(/^[A-F0-9]{4}(?:-[A-F0-9]{4}){4}$/);
    expect(normalizeParticipantCode(code)).toMatch(/^[A-F0-9]{20}$/);
  });

  it("normalizes lookup hashes while retaining an encrypted export value", () => {
    const code = "A1B2-C3D4-E5F6-7890-ABCD";
    const encrypted = encryptParticipantCode(code);

    expect(hashParticipantCode(code)).toBe(hashParticipantCode(code.replaceAll("-", "")));
    expect(encrypted).not.toContain(code);
    expect(decryptParticipantCode(encrypted)).toBe(code);
  });

  it("rejects malformed participant codes", () => {
    expect(() => normalizeParticipantCode("BUS11-ABC")).toThrow();
  });
});

describe("researcher access", () => {
  it("signs an expiring session for its group and rejects changes or expiry", () => {
    const groupId = "f9b6f55f-83d0-44f8-85a8-fc58da218fd1";
    const token = createResearcherToken(groupId, 1_000);

    expect(verifyResearcherToken(token, 1_001)).toBe(true);
    const payload = Buffer.from(token.split(".")[0], "base64url").toString("utf8");
    expect(JSON.parse(payload)).toMatchObject({ groupId });
    expect(verifyResearcherToken(`${token}x`, 1_001)).toBe(false);
    expect(verifyResearcherToken(token, 13 * 60 * 60 * 1000)).toBe(false);
  });
});
