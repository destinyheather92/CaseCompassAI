import { prisma } from "@/lib/db";
import type { AccountStatus, UserRole } from "@/lib/generated/prisma/enums";

export interface ListInstitutionUsersInput {
  /** Always the acting staff member's own institution — never client input. */
  institutionId: string;
  facilityId?: string;
  role?: UserRole;
  status?: AccountStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ListedInstitutionUser {
  id: string;
  username: string | null;
  displayName: string | null;
  role: UserRole;
  accountStatus: AccountStatus;
  facilityId: string | null;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface ListInstitutionUsersResult {
  users: ListedInstitutionUser[];
  total: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/**
 * Lists institution-managed users, always scoped by `institutionId`. The
 * Prisma `select` deliberately excludes `clerkUserId` and every other
 * field not needed by the staff dashboard — there is no password field
 * to accidentally leak, but keeping the projection minimal is cheap
 * insurance against exposing more than the UI needs.
 */
export async function listInstitutionUsers(input: ListInstitutionUsersInput): Promise<ListInstitutionUsersResult> {
  const page = input.page && input.page > 0 ? input.page : 1;
  const pageSize = Math.min(input.pageSize && input.pageSize > 0 ? input.pageSize : DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  const where = {
    institutionId: input.institutionId,
    ...(input.facilityId ? { facilityId: input.facilityId } : {}),
    ...(input.role ? { role: input.role } : {}),
    ...(input.status ? { accountStatus: input.status } : {}),
    ...(input.search
      ? {
          OR: [
            { username: { contains: input.search, mode: "insensitive" as const } },
            { internalIdentifier: { contains: input.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        accountStatus: true,
        facilityId: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, pageSize };
}
