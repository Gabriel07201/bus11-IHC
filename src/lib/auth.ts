import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { cookies } from "next/headers";
import { getAppSecretPath } from "./app-secret";

export { ensureAppSecret } from "./app-secret";

export const RESEARCHER_COOKIE_NAME = "bus11_researcher";
const RESEARCHER_SESSION_MS = 12 * 60 * 60 * 1000;

function appSecret(): Buffer {
  let configured: string;
  try {
    configured = readFileSync(getAppSecretPath(), "utf8").trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("A chave local do BUS-11 ainda não foi inicializada. Reinicie a aplicação.");
    }
    throw error;
  }
  if (!configured || !/^[a-f0-9]{64}$/i.test(configured)) {
    throw new Error("A chave local do BUS-11 está inválida. Restaure uma cópia de segurança conhecida.");
  }
  return Buffer.from(configured, "hex");
}

function deriveKey(purpose: string): Buffer {
  return createHmac("sha256", appSecret()).update(`bus11:${purpose}`).digest();
}

export function createParticipantCode(): string {
  return randomBytes(10).toString("hex").toUpperCase().match(/.{4}/g)!.join("-");
}

export function normalizeParticipantCode(input: string): string {
  const normalized = input.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-F0-9]{20}$/.test(normalized)) throw new RangeError("Informe o código de 20 caracteres recebido do pesquisador.");
  return normalized;
}

export function hashParticipantCode(input: string): string {
  return createHmac("sha256", deriveKey("participant-lookup"))
    .update(normalizeParticipantCode(input))
    .digest("hex");
}

export function encryptParticipantCode(input: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey("participant-export"), iv);
  const ciphertext = Buffer.concat([cipher.update(input, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptParticipantCode(value: string): string {
  const [version, encodedIv, encodedTag, encodedCiphertext, extra] = value.split(".");
  if (version !== "v1" || !encodedIv || !encodedTag || !encodedCiphertext || extra) {
    throw new RangeError("O código criptografado está em formato inválido.");
  }
  const decipher = createDecipheriv("aes-256-gcm", deriveKey("participant-export"), Buffer.from(encodedIv, "base64url"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

const GROUP_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createResearcherToken(groupId: string, now = Date.now()): string {
  if (!GROUP_ID_PATTERN.test(groupId)) throw new RangeError("Identificador de grupo inválido.");
  const payload = Buffer.from(JSON.stringify({
    groupId,
    expiresAt: now + RESEARCHER_SESSION_MS,
    nonce: randomBytes(16).toString("hex"),
  })).toString("base64url");
  const signature = createHmac("sha256", deriveKey("researcher-cookie")).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function getResearcherGroupIdFromToken(token: string, now = Date.now()): string | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;

  try {
    const expected = createHmac("sha256", deriveKey("researcher-cookie")).update(payload).digest();
    const provided = Buffer.from(signature, "base64url");
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

    const decoded: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof decoded !== "object" || decoded === null) return null;
    const value = decoded as { groupId?: unknown; expiresAt?: unknown; nonce?: unknown };
    if (typeof value.groupId !== "string" || !GROUP_ID_PATTERN.test(value.groupId)) return null;
    if (typeof value.nonce !== "string" || !/^[a-f0-9]{32}$/.test(value.nonce)) return null;
    if (!Number.isSafeInteger(value.expiresAt) || (value.expiresAt as number) <= now
      || (value.expiresAt as number) > now + RESEARCHER_SESSION_MS + 1000) return null;
    return value.groupId;
  } catch {
    return null;
  }
}

export function verifyResearcherToken(token: string, now = Date.now()): boolean {
  return getResearcherGroupIdFromToken(token, now) !== null;
}

export async function getResearcherGroupId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return getResearcherGroupIdFromToken(cookieStore.get(RESEARCHER_COOKIE_NAME)?.value ?? "");
  } catch {
    return null;
  }
}
