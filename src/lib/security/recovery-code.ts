import { randomBytes } from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function segment(length: number) {
  const bytes = randomBytes(length);
  let value = "";
  for (const byte of bytes) {
    value += ALPHABET[byte % ALPHABET.length];
  }
  return value;
}

export function generateRecoveryCode() {
  return `SHEEP-${segment(4)}-${segment(4)}-${segment(4)}`;
}
