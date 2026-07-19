import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark } from "lucide-react";
import { requireDashboardAccess } from "@/lib/auth/dashboard-authorization";
import { getUserSavedItems } from "@/lib/dashboard/get-user-saved-items";
import { getUserSavedCases } from "@/lib/dashboard/get-user-saved-cases";
import { RemoveSavedItemButton } from "@/components/dashboard/remove-saved-item-button";
import { RemoveSavedCaseButton } from "@/components/dashboard/remove-saved-case-button";

export const metadata: Metadata = {
  title: "Saved | CaseCompass AI",
};

export default async function SavedItemsPage() {
  const authResult = await requireDashboardAccess();
  if (!authResult.ok) {
    redirect(authResult.redirectTo);
  }

  const [items, cases] = await Promise.all([
    getUserSavedItems(authResult.user.id),
    getUserSavedCases(authResult.user.id),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-cc-text">Saved</h1>
        <p className="mt-1 text-sm text-cc-muted">Resources, terms, cases, and notes you&apos;ve saved for later.</p>
      </div>

      {items.length === 0 && cases.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
          <Bookmark className="size-8 text-cc-purple" aria-hidden="true" />
          <p className="text-sm text-cc-muted">Nothing saved yet.</p>
        </div>
      ) : (
        <>
          {cases.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Saved Cases</h2>
              <div className="glass-card mt-4 flex flex-col divide-y divide-white/[0.06] rounded-2xl">
                {cases.map((savedCase) => (
                  <div key={savedCase.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <a
                        href={savedCase.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-cc-text hover:text-cc-purple"
                      >
                        {savedCase.caseName}
                      </a>
                      <p className="text-xs text-cc-muted">
                        {savedCase.court}
                        {savedCase.citation ? ` · ${savedCase.citation}` : ""}
                      </p>
                    </div>
                    <RemoveSavedCaseButton savedCaseId={savedCase.id} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Saved Resources & Terms</h2>
              <div className="glass-card mt-4 flex flex-col divide-y divide-white/[0.06] rounded-2xl">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      {item.href ? (
                        <Link href={item.href} className="text-sm font-medium text-cc-text hover:text-cc-purple">
                          {item.title}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-cc-text">{item.title}</p>
                      )}
                      <p className="text-xs text-cc-muted">{item.resourceType.replace(/_/g, " ").toLowerCase()}</p>
                    </div>
                    <RemoveSavedItemButton savedItemId={item.id} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
