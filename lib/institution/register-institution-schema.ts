import { z } from "zod";

export const INSTITUTION_TYPE_OPTIONS = [
  "STATE_PRISON",
  "FEDERAL_PRISON",
  "COUNTY_JAIL",
  "REENTRY_PROGRAM",
  "LAW_LIBRARY",
  "LEGAL_AID_PARTNER",
  "EDUCATIONAL_PARTNER",
  "OTHER",
] as const;

/**
 * Public, guest-submittable registration form — see
 * lib/institution/register-institution.ts for what happens with it.
 * Deliberately collects no password: the contact person authenticates via
 * a system-generated username + temporary password, the same
 * no-email-required pattern used for every other institution-managed
 * account (see docs/behavior/institutional-accounts.md).
 */
export const registerInstitutionSchema = z.object({
  facilityName: z.string().trim().min(2, "Facility name is required.").max(200),
  institutionType: z.enum(INSTITUTION_TYPE_OPTIONS),
  institutionTypeOther: z.string().trim().max(200).optional(),
  organizationName: z.string().trim().max(200).optional(),
  address: z.string().trim().max(500).optional(),
  contactName: z.string().trim().min(1, "Contact person is required.").max(200),
  contactTitle: z.string().trim().max(200).optional(),
  contactEmail: z.string().trim().email("Enter a valid work email.").max(320),
  contactPhone: z.string().trim().max(50).optional(),
  estimatedPopulation: z.coerce.number().int().min(0).max(1_000_000).optional(),
  estimatedUsers: z.coerce.number().int().min(0).max(1_000_000).optional(),
});

export type RegisterInstitutionInput = z.infer<typeof registerInstitutionSchema>;
