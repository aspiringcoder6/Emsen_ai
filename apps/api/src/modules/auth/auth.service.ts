import { randomUUID } from "node:crypto";
import type {
  AuthResponseDto,
  AuthUserDto,
  LoginRequestDto,
  SignupRequestDto,
} from "@creator-flow/contracts";
import type { DatabaseError } from "pg";
import { database } from "../../database/pool.js";
import { HttpError } from "../../shared/http.js";
import { evaluateAndStoreUser } from "../ai/userEvaluation.service.js";
import { getCreatorDnaState } from "../creator-dna/creatorDna.service.js";
import { hashPassword, verifyPassword } from "./password.js";
import { createSession } from "./session.js";

type UserRow = {
  created_at: Date;
  display_name: string;
  id: string;
  password_hash: string;
  phone_number: string | null;
};

function mapUser(row: UserRow): AuthUserDto {
  return {
    createdAt: row.created_at.toISOString(),
    id: row.id,
    name: row.display_name,
    phoneNumber: row.phone_number,
  };
}

export async function signup(input: SignupRequestDto) {
  const userId = randomUUID();
  const passwordHash = await hashPassword(input.password);
  const client = await database.connect();
  let user: AuthUserDto;

  try {
    await client.query("BEGIN");
    const userResult = await client.query<UserRow>(
      `
        INSERT INTO users (id, phone_number, display_name, password_hash, terms_accepted_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, phone_number, display_name, password_hash, created_at
      `,
      [userId, input.phoneNumber, input.name, passwordHash],
    );
    const userRow = userResult.rows[0]!;
    user = mapUser(userRow);

    await client.query(
      `
        INSERT INTO creator_dna_profiles (
          user_id, onboarding_status, display_name
        )
        VALUES ($1, $2, $3)
      `,
      [userId, input.creatorDnaChoice === "start" ? "not-started" : "skipped", input.name],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if ((error as DatabaseError).code === "23505") {
      throw new HttpError(
        409,
        "PHONE_NUMBER_ALREADY_EXISTS",
        "Số điện thoại này đã được sử dụng.",
      );
    }
    throw error;
  } finally {
    client.release();
  }

  await evaluateAndStoreUser({
    creatorDnaChoice: input.creatorDnaChoice,
    displayName: input.name,
    stage: "signup",
    userId,
  });

  const [creatorDna, session] = await Promise.all([
    getCreatorDnaState(userId),
    createSession(userId, true),
  ]);

  return { response: { creatorDna, user } satisfies AuthResponseDto, session };
}

export async function login(input: LoginRequestDto) {
  const result = await database.query<UserRow>(
    `SELECT id, phone_number, display_name, password_hash, created_at
     FROM users
     WHERE phone_number = $1`,
    [input.phoneNumber],
  );
  const row = result.rows[0];
  if (!row || !(await verifyPassword(input.password, row.password_hash))) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Số điện thoại hoặc mật khẩu chưa đúng.");
  }

  const [creatorDna, session] = await Promise.all([
    getCreatorDnaState(row.id),
    createSession(row.id, input.remember),
  ]);

  return {
    response: { creatorDna, user: mapUser(row) } satisfies AuthResponseDto,
    session,
  };
}

export async function getAuthResponse(userId: string): Promise<AuthResponseDto> {
  const result = await database.query<UserRow>(
    `SELECT id, phone_number, display_name, password_hash, created_at FROM users WHERE id = $1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row) {
    throw new HttpError(401, "AUTH_REQUIRED", "Phiên đăng nhập không còn hợp lệ.");
  }

  return {
    creatorDna: await getCreatorDnaState(userId),
    user: mapUser(row),
  };
}
