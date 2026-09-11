import { hash, verify } from "@node-rs/argon2";

// Argon2id with sensible interactive params.
const opts = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, opts);
}

export function verifyPassword(digest: string, plain: string): Promise<boolean> {
  return verify(digest, plain, opts);
}
