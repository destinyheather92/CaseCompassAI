import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserProfile } from "@clerk/nextjs";
import { requireDashboardAccess } from "@/lib/auth/dashboard-authorization";
import { prisma } from "@/lib/db";
import { RESOURCE_DISCLAIMER } from "@/lib/resources-constants";
import { ClearSessionButton } from "@/components/dashboard/clear-session-button";
import { PreferencesForm } from "@/components/dashboard/preferences-form";
import type { UserPreferences } from "@/lib/dashboard/user-preferences-schema";

export const metadata: Metadata = {
  title: "Settings | CaseCompass AI",
};

const ROLE_LABELS: Record<string, string> = {
  INDIVIDUAL: "Individual account",
  INCARCERATED_USER: "Institution-managed account",
  EDUCATOR: "Educator account",
  LEGAL_AID_STAFF: "Legal aid staff account",
  INSTITUTION_ADMIN: "Institution administrator",
  SYSTEM_ADMIN: "System administrator",
};

export default async function SettingsPage() {
  const authResult = await requireDashboardAccess();
  if (!authResult.ok) {
    redirect(authResult.redirectTo);
  }

  const { user } = authResult;
  const isIndividual = user.role === "INDIVIDUAL";

  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { preferences: true } });
  const preferences = (row?.preferences as UserPreferences | null) ?? {};

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-cc-text">Settings</h1>
        <p className="mt-1 text-sm text-cc-muted">Account information and privacy controls.</p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Account</h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-cc-muted">Account Type</dt>
            <dd className="mt-1 text-sm font-medium text-cc-text">{ROLE_LABELS[user.role] ?? user.role}</dd>
          </div>
          <div>
            <dt className="text-xs text-cc-muted">Status</dt>
            <dd className="mt-1 text-sm font-medium text-cc-text">{user.accountStatus === "ACTIVE" ? "Active" : user.accountStatus}</dd>
          </div>
        </dl>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Login & Security</h2>
        {isIndividual ? (
          <div className="mt-4">
            <UserProfile routing="hash" />
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-2 text-sm text-cc-muted">
            <p>Account login information is managed by authorized institutional staff.</p>
            <p>Contact authorized institutional staff for a password reset.</p>
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Accessibility & Display</h2>
        <p className="mt-2 text-xs text-cc-muted">These preferences are stored on your account and never affect what you can access.</p>
        <div className="mt-4">
          <PreferencesForm initialPreferences={preferences} />
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Shared Device Privacy</h2>
        <p className="mt-2 text-sm text-cc-muted">
          If you&apos;re using a shared or public device, clear your session before you walk away. This signs you out
          and removes anything CaseCompass may have saved on this device.
        </p>
        <div className="mt-4">
          <ClearSessionButton />
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Legal Notice</h2>
        <p className="mt-2 text-xs text-cc-muted">{RESOURCE_DISCLAIMER}</p>
        <Link href="/resources/what-casecompass-can-and-cannot-do" className="mt-2 inline-block text-xs font-medium text-cc-purple hover:underline">
          What CaseCompass can and cannot do
        </Link>
      </div>
    </div>
  );
}
