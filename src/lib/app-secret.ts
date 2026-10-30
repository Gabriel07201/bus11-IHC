import { randomBytes } from "node:crypto";
import { link, mkdir, open, readFile, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const SECRET_PATTERN = /^[a-f0-9]{64}$/i;

export type EnsureAppSecretOptions = {
  secretPath: string;
  hasExistingParticipantData: () => Promise<boolean>;
  legacySecret: string;
};

export function getAppSecretPath(): string {
  const configuredPath = process.env.BUS11_SECRET_FILE;
  if (configuredPath) return path.resolve(configuredPath);

  const configDirectory = process.env.LOCALAPPDATA
    ?? process.env.XDG_CONFIG_HOME
    ?? path.join(os.homedir(), ".config");
  return path.join(configDirectory, "bus11-ihc", "app-secret");
}

async function readSecret(secretPath: string): Promise<string | undefined> {
  let contents: string;
  try {
    contents = await readFile(secretPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }

  const secret = contents.trim();
  if (!SECRET_PATTERN.test(secret)) {
    throw new Error(`A chave BUS-11 existente em ${secretPath} está inválida. Restaure uma cópia de segurança conhecida.`);
  }
  return secret;
}

async function persistSecretAtomically(secretPath: string, secret: string): Promise<string> {
  await mkdir(path.dirname(secretPath), { recursive: true, mode: 0o700 });
  const temporaryPath = `${secretPath}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  const file = await open(temporaryPath, "wx", 0o600);
  try {
    await file.writeFile(secret, "utf8");
    await file.sync();
  } finally {
    await file.close();
  }

  try {
    await link(temporaryPath, secretPath);
    return secret;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      const existing = await readSecret(secretPath);
      if (existing) return existing;
    }
    throw error;
  } finally {
    await unlink(temporaryPath).catch(() => undefined);
  }
}

export async function ensureAppSecret({
  secretPath,
  hasExistingParticipantData,
  legacySecret,
}: EnsureAppSecretOptions): Promise<string> {
  const existing = await readSecret(secretPath);
  if (existing) return existing;

  if (SECRET_PATTERN.test(legacySecret)) {
    return persistSecretAtomically(secretPath, legacySecret);
  }

  if (await hasExistingParticipantData()) {
    throw new Error(
      `A chave BUS-11 está ausente em ${secretPath}, mas já existem dados de participantes. `
      + "Restaure a chave anterior ou a cópia de segurança; uma nova chave não será criada.",
    );
  }

  return persistSecretAtomically(secretPath, randomBytes(32).toString("hex"));
}
