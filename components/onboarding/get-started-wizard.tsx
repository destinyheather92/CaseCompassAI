"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useIntakeStore } from "@/stores/use-intake-store";
import { WelcomeStep } from "@/components/onboarding/welcome-step";
import { SingleChoiceStep } from "@/components/onboarding/single-choice-step";
import { MultiChoiceStep } from "@/components/onboarding/multi-choice-step";
import { JurisdictionStep } from "@/components/onboarding/jurisdiction-step";
import { AdaptiveQuestion } from "@/components/onboarding/adaptive-question";
import { IntakeLoading } from "@/components/onboarding/intake-loading";
import { IntakeRecovery } from "@/components/onboarding/intake-recovery";
import { IntakeReview } from "@/components/onboarding/intake-review";
import { IntakeNavBar } from "@/components/onboarding/intake-nav-bar";
import { IntakeShell } from "@/components/onboarding/intake-shell";
import {
  CASE_TYPE_OPTIONS,
  PROCEDURAL_STAGE_OPTIONS,
  RESEARCH_GOAL_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  caseTypeLabel,
  proceduralStageLabel,
} from "@/lib/intake-options-data";
import { CASE_TYPE_ICONS, PROCEDURAL_STAGE_ICONS, RESEARCH_GOAL_ICONS, DOCUMENT_TYPE_ICONS } from "@/lib/intake-option-icons";
import { JURISDICTION_OPTIONS } from "@/lib/jurisdictions-data";
import type { CaseType, DocumentType, ProceduralStage, ResearchGoal } from "@/types/intake";

const SAFE_START_ERROR =
  "CaseCompass could not start the interview right now. Your answers are still saved, so you can try again.";
const SAFE_ANSWER_ERROR =
  "CaseCompass could not prepare the next question right now. Your answer is saved, so you can try again.";
const SAFE_COMPLETE_ERROR = "CaseCompass could not save your confirmation right now. Please try again.";
const SAFE_ROADMAP_ERROR =
  "CaseCompass could not build your roadmap right now. Your intake was saved, so you can try again.";
const SAFE_RESUME_ERROR = "CaseCompass could not load your saved intake right now.";

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

/**
 * `must-change-password` can only ever come back for an institution-managed
 * account — individual accounts are always created with
 * `mustChangePassword: false` (see lib/auth/sync-clerk-user.ts) and have no
 * path that sets it true. So redirecting on this status can never affect a
 * regular individual user; it only ever fires for the population it's
 * meant for.
 */
function isMustChangePassword(body: { status?: string }): boolean {
  return body?.status === "must-change-password";
}

/**
 * The interactive intake wizard — rendered only once app/get-started/page.tsx
 * has already confirmed the caller is authenticated (a guest never reaches
 * this component at all; see docs/behavior/matters.md). `matterId`, when
 * provided, is the matter (already ownership-verified server-side) this
 * intake attaches to; when absent, starting the interview creates a new
 * matter automatically.
 */
function GetStartedContent({ matterId }: { matterId?: string }) {
  const store = useIntakeStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeSessionId = searchParams.get("sessionId");

  const [loading, setLoading] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);

  const hasSavedProgress = store.step !== "welcome" && store.step !== "complete";

  useEffect(() => {
    if (!resumeSessionId || store.sessionId === resumeSessionId) return;
    // Defer past the synchronous portion (setResuming/setError) so the
    // effect body itself never triggers a setState synchronously during
    // commit — same pattern as components/institution/user-management.tsx.
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setResuming(true);
      setError(null);
      fetch(`/api/intake/interview/${resumeSessionId}`)
        .then((response) => response.json())
        .then((body) => {
          if (cancelled) return;
          if (isMustChangePassword(body)) {
            router.push("/first-login");
            return;
          }
          if (body.status !== "found") {
            setError(body.message ?? SAFE_RESUME_ERROR);
            return;
          }
          store.hydrateFromSession(body.session);
        })
        .catch(() => {
          if (!cancelled) setError(SAFE_RESUME_ERROR);
        })
        .finally(() => {
          if (!cancelled) setResuming(false);
        });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeSessionId]);

  async function handleStartInterview() {
    setLoading(true);
    setError(null);
    try {
      const body = await postJson("/api/intake/interview/start", {
        caseType: store.caseType,
        jurisdiction: store.jurisdiction,
        proceduralStage: store.proceduralStage,
        researchGoals: store.researchGoals,
        documentTypes: store.documentTypes,
        ...(matterId ? { matterId } : {}),
      });
      if (isMustChangePassword(body)) {
        router.push("/first-login");
        return;
      }
      if (body.status !== "started") {
        setError(body.message ?? SAFE_START_ERROR);
        return;
      }
      store.applyStartedSession(body);
      store.goToStep(body.intakeStatus === "ready-for-review" ? "review" : "ai-interview");
    } catch {
      setError(SAFE_START_ERROR);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswerSubmit(answerText: string) {
    const question = store.currentQuestion;
    if (!question || !store.sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const body = await postJson("/api/intake/interview/answer", {
        sessionId: store.sessionId,
        questionId: question.id,
        answerText,
      });
      if (isMustChangePassword(body)) {
        router.push("/first-login");
        return;
      }
      if (body.status !== "answered") {
        setError(body.message ?? SAFE_ANSWER_ERROR);
        return;
      }
      store.recordAnsweredTurn(question.id, question.text, answerText);
      store.applyAnsweredTurn(body);
      if (body.intakeStatus === "ready-for-review") {
        store.goToStep("review");
      }
    } catch {
      setError(SAFE_ANSWER_ERROR);
    } finally {
      setLoading(false);
    }
  }

  /** Attempts roadmap generation for an already-confirmed intake. On failure the intake stays confirmed and saved — never reset. */
  async function generateRoadmap(intakeId: string) {
    setRoadmapError(null);
    let body: { status?: string; roadmapId?: string; message?: string };
    try {
      body = await postJson("/api/dashboard/roadmap/generate", { intakeId });
    } catch {
      body = { status: "network-error" };
    }
    if (isMustChangePassword(body)) {
      router.push("/first-login");
      return;
    }
    if (body.status !== "created" || !body.roadmapId) {
      setRoadmapError(body.message ?? SAFE_ROADMAP_ERROR);
      store.goToStep("complete");
      return;
    }
    store.reset();
    router.push(`/dashboard/roadmaps/${body.roadmapId}`);
  }

  async function handleConfirm() {
    if (!store.sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const body = await postJson(`/api/intake/interview/${store.sessionId}/complete`, {
        acknowledged: store.acknowledged,
      });
      if (isMustChangePassword(body)) {
        router.push("/first-login");
        return;
      }
      if (body.status !== "completed") {
        setError(body.message ?? SAFE_COMPLETE_ERROR);
        return;
      }
      await generateRoadmap(store.sessionId);
    } catch {
      setError(SAFE_COMPLETE_ERROR);
    } finally {
      setLoading(false);
    }
  }

  async function handleRetryRoadmap() {
    if (!store.sessionId) return;
    setLoading(true);
    try {
      await generateRoadmap(store.sessionId);
    } finally {
      setLoading(false);
    }
  }

  /** Never marks the intake complete or generates a roadmap — just leaves the wizard without losing anything already saved server-side. */
  function handleSaveAndExit() {
    router.push(store.sessionId ? "/dashboard?saved=intake" : "/dashboard");
  }

  function retry() {
    setError(null);
  }

  function reviewInstead() {
    setError(null);
    store.goToStep(store.answeredTurns.length > 0 || store.currentQuestion ? "ai-interview" : "document-types");
  }

  return (
    <IntakeShell step={store.step} navBar={<IntakeNavBar isSignedIn={true} onSaveAndExit={handleSaveAndExit} />}>
      {error ? (
        <IntakeRecovery message={error} onRetry={retry} onReview={reviewInstead} />
      ) : loading || resuming ? (
        <IntakeLoading />
      ) : (
        <>
          {store.step === "welcome" && (
            <WelcomeStep
              hasSavedProgress={hasSavedProgress}
              onStart={() => store.goToStep("case-type")}
              onResume={() => {}}
              onStartOver={() => store.reset()}
            />
          )}

          {store.step === "case-type" && (
            <SingleChoiceStep
              heading="What best describes your situation?"
              options={CASE_TYPE_OPTIONS}
              icons={CASE_TYPE_ICONS}
              selected={store.caseType}
              onSelect={(value) => store.setCaseType(value as CaseType)}
              onBack={() => store.goToStep("welcome")}
              onContinue={() => store.goToStep("jurisdiction")}
            />
          )}

          {store.step === "jurisdiction" && (
            <JurisdictionStep
              value={store.jurisdiction}
              onChange={store.setJurisdiction}
              onBack={() => store.goToStep("case-type")}
              onContinue={() => store.goToStep("procedural-stage")}
            />
          )}

          {store.step === "procedural-stage" && (
            <SingleChoiceStep
              heading="Where is your case in the process?"
              options={PROCEDURAL_STAGE_OPTIONS}
              icons={PROCEDURAL_STAGE_ICONS}
              selected={store.proceduralStage}
              onSelect={(value) => store.setProceduralStage(value as ProceduralStage)}
              onBack={() => store.goToStep("jurisdiction")}
              onContinue={() => store.goToStep("research-goals")}
            />
          )}

          {store.step === "research-goals" && (
            <MultiChoiceStep
              heading="What are you hoping to understand?"
              options={RESEARCH_GOAL_OPTIONS}
              icons={RESEARCH_GOAL_ICONS}
              selected={store.researchGoals}
              onToggle={(value) => store.toggleResearchGoal(value as ResearchGoal)}
              onBack={() => store.goToStep("procedural-stage")}
              onContinue={() => store.goToStep("document-types")}
            />
          )}

          {store.step === "document-types" && (
            <MultiChoiceStep
              heading="Do you have any documents from your case?"
              options={DOCUMENT_TYPE_OPTIONS}
              icons={DOCUMENT_TYPE_ICONS}
              selected={store.documentTypes}
              onToggle={(value) => store.toggleDocumentType(value as DocumentType)}
              onBack={() => store.goToStep("research-goals")}
              onContinue={handleStartInterview}
              continueLabel="Continue"
            />
          )}

          {store.step === "ai-interview" && store.currentQuestion && (
            <AdaptiveQuestion key={store.currentQuestion.id} question={store.currentQuestion} onSubmit={handleAnswerSubmit} submitting={loading} />
          )}

          {store.step === "review" && (
            <IntakeReview
              caseType={caseTypeLabel(store.caseType)}
              jurisdiction={JURISDICTION_OPTIONS.find((option) => option.value === store.jurisdiction)?.label ?? store.jurisdiction}
              proceduralStage={proceduralStageLabel(store.proceduralStage)}
              factualSummary={store.factualSummary}
              unresolvedInformation={store.unresolvedInformation}
              answeredTurns={store.answeredTurns}
              acknowledged={store.acknowledged}
              onAcknowledgedChange={store.setAcknowledged}
              onConfirm={handleConfirm}
              onEditLayer1={() => store.goToStep("case-type")}
              submitting={loading}
            />
          )}

          {store.step === "complete" && roadmapError && (
            <div className="glass-card flex w-full max-w-lg flex-col items-center gap-4 rounded-3xl p-8 text-center sm:p-10">
              <span className="flex size-14 items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10">
                <AlertTriangle className="size-6 text-amber-400" aria-hidden="true" strokeWidth={1.75} />
              </span>
              <h2 className="text-2xl font-bold text-cc-text">Your intake is saved.</h2>
              <p role="alert" className="text-cc-muted">
                {roadmapError}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button type="button" onClick={handleRetryRoadmap} disabled={loading}>
                  Try Again
                </Button>
                <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
                  Return to Dashboard
                </Link>
              </div>
            </div>
          )}

          {store.step === "complete" && !roadmapError && (
            <div className="glass-card flex w-full max-w-lg flex-col items-center gap-4 rounded-3xl p-8 text-center sm:p-10">
              <span className="flex size-14 items-center justify-center rounded-full border border-cc-teal/50 bg-gradient-to-br from-cc-teal/20 to-cc-purple/10 shadow-[0_0_30px_rgba(34,211,238,0.25)]">
                <CheckCircle2 className="size-6 text-cc-teal" aria-hidden="true" strokeWidth={1.75} />
              </span>
              <h2 className="text-2xl font-bold text-cc-text">Building your roadmap…</h2>
              <p className="text-cc-muted">CaseCompass is preparing your personalized research roadmap.</p>
            </div>
          )}
        </>
      )}
    </IntakeShell>
  );
}

export function GetStartedWizard({ matterId }: { matterId?: string }) {
  return (
    <Suspense fallback={<IntakeLoading />}>
      <GetStartedContent matterId={matterId} />
    </Suspense>
  );
}
