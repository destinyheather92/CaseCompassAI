import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Institution Settings | CaseCompass AI",
};

/**
 * Read-only for this first pass; an edit form is a natural next step but
 * out of scope here — see docs/behavior/institutional-accounts.md's
 * known limitations. Authentication settings are never editable here at
 * all — those stay managed through Clerk, never this app.
 */
export default async function InstitutionSettingsPage() {
  const authResult = await requireAuthenticatedUser({ roles: ["INSTITUTION_ADMIN"] });
  if (!authResult.ok) {
    redirect(authResult.redirectTo);
  }
  if (!authResult.user.institutionId) {
    redirect("/institution/login");
  }

  const institution = await prisma.institution.findUnique({ where: { id: authResult.user.institutionId } });
  if (!institution) {
    redirect("/institution/dashboard");
  }

  const fields = [
    { label: "Facility / Institution Name", value: institution.name },
    { label: "Organization / Agency", value: institution.organizationName },
    { label: "Institution Type", value: institution.institutionType === "OTHER" ? institution.institutionTypeOther : institution.institutionType },
    { label: "Address", value: institution.address },
    { label: "Contact Person", value: institution.contactName },
    { label: "Contact Title", value: institution.contactTitle },
    { label: "Contact Email", value: institution.contactEmail },
    { label: "Contact Phone", value: institution.contactPhone },
    { label: "Estimated Population", value: institution.estimatedPopulation },
    { label: "Estimated Users", value: institution.estimatedUsers },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-cc-text">Institution Settings</h1>
        <p className="mt-1 text-sm text-cc-muted">
          Profile information collected at registration. Authentication settings are always managed through your
          identity provider, never here.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <dl className="flex flex-col divide-y divide-white/[0.06]">
          {fields.map((field) => (
            <div key={field.label} className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-cc-muted">{field.label}</dt>
              <dd className="text-right text-sm font-medium text-cc-text">{field.value ?? "Not provided"}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
