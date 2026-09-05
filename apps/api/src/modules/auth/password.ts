import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const keyLength = 64;
const cost = 16_384;
const blockSize = 8;
const parallelization = 1;

function deriveKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      keyLength,
      { N: cost, maxmem: 64 * 1024 * 1024, p: parallelization, r: blockSize },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      },
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt);
  return [
    "scrypt",
    cost,
    blockSize,
    parallelization,
    salt.toString("hex"),
    derivedKey.toString("hex"),
  ].join("$");
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, storedCost, storedBlockSize, storedParallelization, saltHex, keyHex] =
    storedHash.split("$");

  if (
    algorithm !== "scrypt" ||
    Number(storedCost) !== cost ||
    Number(storedBlockSize) !== blockSize ||
    Number(storedParallelization) !== parallelization ||
    !saltHex ||
    !keyHex
  ) {
    return false;
  }

  const expected = Buffer.from(keyHex, "hex");
  const actual = await deriveKey(password, Buffer.from(saltHex, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
