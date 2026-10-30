import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";

const PASSWORD_HASH_BYTES = 64;
const DUMMY_SALT = Buffer.alloc(16).toString("hex");
const DUMMY_HASH = Buffer.alloc(PASSWORD_HASH_BYTES);

type GroupQuery = Pick<Pool, "query">;

export class GroupCodeAlreadyInUseError extends Error {
  constructor() {
    super("group_code_in_use");
    this.name = "GroupCodeAlreadyInUseError";
  }
}

export class InvalidResearcherGroupInputError extends Error {
  constructor(readonly field: "code" | "password") {
    super(field === "code" ? "invalid_group_code" : "invalid_password");
    this.name = "InvalidResearcherGroupInputError";
  }
}

function normalizeGroupCode(input: string): { code: string; normalizedCode: string } {
  const code = input.normalize("NFKC").trim();
  if (code.length < 3 || code.length > 64 || /[\u0000-\u001f\u007f]/u.test(code)) {
    throw new InvalidResearcherGroupInputError("code");
  }
  return { code, normalizedCode: code.toLocaleLowerCase("en-US") };
}

function derivePasswordHash(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, Buffer.from(salt, "hex"), PASSWORD_HASH_BYTES, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function createResearcherGroup(
  pool: GroupQuery,
  codeInput: string,
  password: string,
): Promise<{ id: string; code: string }> {
  const { code, normalizedCode } = normalizeGroupCode(codeInput);
  if (password.length < 8 || password.length > 128) {
    throw new InvalidResearcherGroupInputError("password");
  }

  const id = randomUUID();
  const salt = randomBytes(16).toString("hex");
  const passwordHash = (await derivePasswordHash(password, salt)).toString("hex");
  const result = await pool.query(
    `INSERT INTO researcher_groups (id, code, normalized_code, password_salt, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (normalized_code) DO NOTHING
     RETURNING id, code`,
    [id, code, normalizedCode, salt, passwordHash],
  );
  if (!result.rows[0]) throw new GroupCodeAlreadyInUseError();

  return { id: String(result.rows[0].id), code: String(result.rows[0].code) };
}

export async function authenticateResearcherGroup(
  pool: GroupQuery,
  codeInput: string,
  password: string,
): Promise<string | null> {
  let normalizedCode: string;
  try {
    ({ normalizedCode } = normalizeGroupCode(codeInput));
  } catch {
    normalizedCode = "";
  }

  const result = normalizedCode
    ? await pool.query(
      "SELECT id, password_salt, password_hash FROM researcher_groups WHERE normalized_code = $1",
      [normalizedCode],
    )
    : { rows: [] as Array<Record<string, unknown>> };
  const group = result.rows[0];
  const salt = group ? String(group.password_salt) : DUMMY_SALT;
  const expected = group ? Buffer.from(String(group.password_hash), "hex") : DUMMY_HASH;
  const actual = await derivePasswordHash(password.slice(0, 128), salt);
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

  return group && matches ? String(group.id) : null;
}
