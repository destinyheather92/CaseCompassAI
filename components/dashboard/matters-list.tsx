"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Check, X as XIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { JURISDICTION_OPTIONS } from "@/lib/jurisdictions-data";
import { caseTypeLabel } from "@/lib/intake-options-data";
import type { CaseType } from "@/types/intake";
import type { MatterSummary } from "@/lib/matters/list-matters";

const STATUS_LABELS: Record<MatterSummary["status"], string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

const STATUS_VARIANTS: Record<MatterSummary["status"], "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  ARCHIVED: "outline",
};

function jurisdictionLabelFor(code: string | null): string | null {
  if (!code) return null;
  return JURISDICTION_OPTIONS.find((option) => option.value === code)?.label ?? code;
}

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Inline rename affordance — a pencil icon that swaps the title for an editable field with Save/Cancel, its own loading/error state, and no effect on the matter's id or any linked data. */
function MatterTitle({ matter, onRenamed }: { matter: MatterSummary; onRenamed: (title: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(matter.title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setValue(matter.title);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
    setValue(matter.title);
  }

  async function save() {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Matter name can't be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/matters/${matter.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      const body = await response.json();
      if (body.status === "renamed") {
        onRenamed(body.title);
        setEditing(false);
      } else {
        setError(body.message ?? "Could not rename this matter right now.");
      }
    } catch {
      setError("Could not rename this matter right now.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5">
        <h3 className="text-sm font-bold text-cc-text">{matter.title}</h3>
        <button
          type="button"
          onClick={startEditing}
          aria-label={`Rename ${matter.title}`}
          data-testid="rename-matter-button"
          className="text-cc-muted transition-colors hover:text-cc-purple"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={120}
          disabled={saving}
          aria-label="Matter name"
          data-testid="matter-title-input"
          className="h-8 flex-1"
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
            if (event.key === "Escape") cancel();
          }}
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          aria-label="Save matter name"
          data-testid="save-matter-name"
          className="text-cc-teal transition-colors hover:text-cc-text disabled:opacity-50"
        >
          <Check className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          aria-label="Cancel renaming"
          className="text-cc-muted transition-colors hover:text-cc-text disabled:opacity-50"
        >
          <XIcon className="size-4" aria-hidden="true" />
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function MatterCard({ matter, onRenamed }: { matter: MatterSummary; onRenamed: (matterId: string, title: string) => void }) {
  return (
    <div className="glass-card flex flex-col gap-3 rounded-2xl p-5" data-testid="matter-card" data-matter-id={matter.id}>
      <div className="flex items-start justify-between gap-3">
        <MatterTitle matter={matter} onRenamed={(title) => onRenamed(matter.id, title)} />
        <Badge variant={STATUS_VARIANTS[matter.status]}>{STATUS_LABELS[matter.status]}</Badge>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-cc-muted sm:grid-cols-4">
        {matter.matterType && (
          <div>
            <dt className="uppercase tracking-wide">Type</dt>
            <dd className="mt-0.5 text-cc-text">{caseTypeLabel(matter.matterType as CaseType)}</dd>
          </div>
        )}
        {matter.caseNumber && (
          <div>
            <dt className="uppercase tracking-wide">Case #</dt>
            <dd className="mt-0.5 text-cc-text">{matter.caseNumber}</dd>
          </div>
        )}
        {(matter.court || jurisdictionLabelFor(matter.jurisdiction)) && (
          <div>
            <dt className="uppercase tracking-wide">Court / Jurisdiction</dt>
            <dd className="mt-0.5 text-cc-text">{matter.court ?? jurisdictionLabelFor(matter.jurisdiction)}</dd>
          </div>
        )}
        <div>
          <dt className="uppercase tracking-wide">Last Updated</dt>
          <dd className="mt-0.5 text-cc-text">{formatDate(matter.updatedAt)}</dd>
        </div>
      </dl>

      {matter.intakeProgressPercent !== null && matter.intakeProgressPercent < 100 && (
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-cc-purple" style={{ width: `${matter.intakeProgressPercent}%` }} />
          </div>
          <p className="mt-1 text-[0.7rem] text-cc-muted">Intake {matter.intakeProgressPercent}% complete</p>
        </div>
      )}

      <div>
        <Link href={matter.primaryAction.href} className={buttonVariants({ size: "sm" })}>
          {matter.primaryAction.label}
        </Link>
      </div>
    </div>
  );
}

function NewMatterDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (matterId: string) => void }) {
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const trimmed = title.trim();
      const response = await fetch("/api/matters", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(trimmed ? { title: trimmed } : {}),
      });
      const body = await response.json();
      if (body.status === "created") {
        onCreated(body.matterId);
      } else {
        setError(body.message ?? "Could not create a new matter right now.");
      }
    } catch {
      setError("Could not create a new matter right now.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!creating) {
          setTitle("");
          setError(null);
          onOpenChange(next);
        }
      }}
    >
      <DialogContent className="sm:max-w-sm" data-testid="new-matter-dialog">
        <DialogHeader>
          <DialogTitle>Name your matter</DialogTitle>
          <DialogDescription>
            Give this matter a name you&apos;ll recognize later, or leave it blank and we&apos;ll pick a neutral default.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-matter-title">Matter name (optional)</Label>
          <Input
            id="new-matter-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="e.g. Lexington County DUI Appeal"
            disabled={creating}
            data-testid="new-matter-title-input"
            onKeyDown={(event) => {
              if (event.key === "Enter") handleCreate();
            }}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={creating} />}>Cancel</DialogClose>
          <Button type="button" onClick={handleCreate} disabled={creating} data-testid="create-matter-submit">
            {creating ? "Creating…" : "Create Matter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The primary multi-matter navigation surface for the individual
 * dashboard — every matter shown here belongs only to the signed-in
 * caller (GET /api/matters scopes strictly to the authenticated user).
 * "New Matter" always creates a fresh, empty matter rather than reusing
 * or overwriting an existing one. Renaming a matter only ever changes
 * its title — never its id — so nothing linked to it is disconnected.
 */
export function MattersList() {
  const router = useRouter();
  const [matters, setMatters] = useState<MatterSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/matters")
      .then((response) => response.json())
      .then((body) => {
        if (cancelled) return;
        if (body.status === "ok") {
          setMatters(body.matters);
        } else {
          setError("Could not load your matters right now.");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your matters right now.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleRenamed(matterId: string, title: string) {
    setMatters((current) => current?.map((m) => (m.id === matterId ? { ...m, title } : m)) ?? current);
  }

  function handleCreated(matterId: string) {
    router.push(`/get-started?matterId=${matterId}`);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-[0.15em] text-cc-muted uppercase">Your Matters</h2>
        <Button type="button" size="sm" onClick={() => setDialogOpen(true)} data-testid="new-matter-button">
          <Plus className="size-4" aria-hidden="true" />
          New Matter
        </Button>
      </div>

      <NewMatterDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={handleCreated} />

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {matters === null ? (
        <p className="text-sm text-cc-muted">Loading your matters…</p>
      ) : matters.length === 0 ? (
        <p className="text-sm text-cc-muted" data-testid="matters-empty-state">
          You have not created a matter yet. Start a new matter to build your personalized legal research roadmap.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-testid="matters-list">
          {matters.map((matter) => (
            <MatterCard key={matter.id} matter={matter} onRenamed={handleRenamed} />
          ))}
        </div>
      )}
    </section>
  );
}
