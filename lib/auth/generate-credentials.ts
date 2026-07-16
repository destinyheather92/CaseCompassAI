import { randomInt } from "node:crypto";

/**
 * Base32-ish alphabet with visually ambiguous characters removed
 * (0/O, 1/I/L) so staff can read a temporary username or password aloud
 * or copy it without confusion.
 */
const UNAMBIGUOUS_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function randomChar(): string {
  return UNAMBIGUOUS_ALPHABET[randomInt(UNAMBIGUOUS_ALPHABET.length)];
}

function randomString(length: number): string {
  return Array.from({ length }, randomChar).join("");
}

function sanitizeFacilityCode(facilityCode: string): string {
  const cleaned = facilityCode.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned.length > 0 ? cleaned : "facility";
}

/**
 * Generates a staff-facing username in the `facilitycode-<6 random
 * chars>` format. Uses `crypto.randomInt`, not `Math.random`, so
 * usernames aren't predictable/sequential — see security invariant on
 * avoiding predictable identifiers.
 */
export function generateUsername(facilityCode: string): string {
  return `${sanitizeFacilityCode(facilityCode)}-${randomString(6)}`;
}

/**
 * Generates a cryptographically random temporary password. 16 characters
 * from a 32-character alphabet is ~80 bits of entropy — comfortably
 * above the password policy's 10-character minimum and not a dictionary
 * word, so it can never collide with the common-password blocklist.
 */
export function generateTemporaryPassword(): string {
  return randomString(16);
}
