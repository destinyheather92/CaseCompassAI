import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * A small, well-known set of compromised/trivially-guessable passwords.
 * Intentionally short — we prioritize passphrase memorability over
 * arbitrary complexity rules, per the product's security requirements.
 */
const COMMON_PASSWORD_BLOCKLIST = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyuiop",
  "qwerty123",
  "letmein123",
  "iloveyou1",
  "admin12345",
  "welcome123",
  "changeme123",
]);

export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORD_BLOCKLIST.has(password.trim().toLowerCase());
}

function normalizeForComparison(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Shared client + server schema for the first-login (temporary → private
 * password) form. Requires the current temporary password so Clerk can
 * verify it, and refuses to let the temporary password become the new
 * one.
 */
export const firstLoginPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your temporary password."),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Your new password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
      .max(PASSWORD_MAX_LENGTH, `Your new password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`),
    confirmNewPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New password and confirmation do not match.",
    path: ["confirmNewPassword"],
  })
  .refine(
    (data) => normalizeForComparison(data.newPassword) !== normalizeForComparison(data.currentPassword),
    {
      message: "Your new password can't be the same as your temporary password.",
      path: ["newPassword"],
    },
  )
  .refine((data) => !isCommonPassword(data.newPassword), {
    message: "That password is too common. Please choose something less easily guessed.",
    path: ["newPassword"],
  });

export type FirstLoginPasswordInput = z.infer<typeof firstLoginPasswordSchema>;
