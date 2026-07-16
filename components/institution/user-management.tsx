"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type AssignableRole = "incarcerated-user" | "educator" | "legal-aid-staff";

interface InstitutionUser {
  id: string;
  username: string | null;
  displayName: string | null;
  role: string;
  accountStatus: string;
  facilityId: string | null;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "DISABLED" || status === "LOCKED") return "destructive";
  return "secondary";
}

interface IssuedCredential {
  username: string;
  temporaryPassword: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<InstitutionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createRole, setCreateRole] = useState<AssignableRole>("incarcerated-user");
  const [createError, setCreateError] = useState<string | null>(null);
  const [issuedCredential, setIssuedCredential] = useState<IssuedCredential | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/institution/users");
      const body = await response.json();
      setUsers(body.users ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer past the synchronous portion of refresh() (which calls
    // setLoading(true) immediately) so the effect body itself never
    // triggers a setState synchronously during commit.
    void Promise.resolve().then(refresh);
  }, [refresh]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    const formData = new FormData(event.currentTarget);
    const username = (formData.get("username") as string) || undefined;
    const displayName = (formData.get("displayName") as string) || undefined;

    const response = await fetch("/api/institution/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: createRole, username, displayName }),
    });
    const body = await response.json();

    if (!response.ok) {
      setCreateError(body.message ?? "Could not create the account.");
      return;
    }

    setIssuedCredential({ username: body.user.username, temporaryPassword: body.temporaryPassword });
  }

  function closeCreateDialog() {
    setCreateOpen(false);
    setIssuedCredential(null);
    refresh();
  }

  async function handleStatusToggle(targetUser: InstitutionUser) {
    const action = targetUser.accountStatus === "DISABLED" ? "reactivate" : "deactivate";
    await fetch(`/api/institution/users/${targetUser.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    refresh();
  }

  async function handleResetPassword(targetUser: InstitutionUser) {
    const response = await fetch(`/api/institution/users/${targetUser.id}/reset-password`, { method: "POST" });
    const body = await response.json();
    if (response.ok) {
      setIssuedCredential({ username: targetUser.username ?? "", temporaryPassword: body.temporaryPassword });
    }
    refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {issuedCredential && !createOpen && (
        <div role="status" className="glass-card rounded-xl border border-cc-purple/40 p-4">
          <p className="text-sm font-medium text-cc-text">
            Temporary password for <span className="font-mono">{issuedCredential.username}</span>:{" "}
            <span className="font-mono text-cc-purple">{issuedCredential.temporaryPassword}</span>
          </p>
          <p className="mt-1 text-xs text-cc-muted">
            Copy this temporary password now. It cannot be viewed again.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setIssuedCredential(null)}
          >
            Done
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-cc-text">Institution Users</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button>Create User</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Institution User</DialogTitle>
            </DialogHeader>
            {issuedCredential ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-cc-text">
                  Temporary password for <span className="font-mono">{issuedCredential.username}</span>:
                </p>
                <p className="font-mono text-lg text-cc-purple">{issuedCredential.temporaryPassword}</p>
                <p className="text-sm text-cc-muted">
                  Copy this temporary password now. It cannot be viewed again.
                </p>
                <DialogFooter>
                  <Button type="button" onClick={closeCreateDialog}>
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="create-role">Role</Label>
                  <select
                    id="create-role"
                    name="role"
                    value={createRole}
                    onChange={(event) => setCreateRole(event.target.value as AssignableRole)}
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    <option value="incarcerated-user">Incarcerated User</option>
                    <option value="educator">Educator</option>
                    <option value="legal-aid-staff">Legal Aid Staff</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="create-username">Username (optional — generated if left blank)</Label>
                  <Input id="create-username" name="username" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="create-display-name">Display name (optional)</Label>
                  <Input id="create-display-name" name="displayName" />
                </div>
                {createError && (
                  <p role="alert" className="text-sm text-destructive">
                    {createError}
                  </p>
                )}
                <DialogFooter>
                  <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                  <Button type="submit">Create</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!loading && users.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-cc-muted">
                No users yet.
              </TableCell>
            </TableRow>
          )}
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-mono">{u.username}</TableCell>
              <TableCell>{humanize(u.role)}</TableCell>
              <TableCell>
                <Badge variant={statusBadgeVariant(u.accountStatus)}>{humanize(u.accountStatus)}</Badge>
              </TableCell>
              <TableCell>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}</TableCell>
              <TableCell className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => handleStatusToggle(u)}>
                  {u.accountStatus === "DISABLED" ? "Reactivate" : "Deactivate"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleResetPassword(u)}>
                  Reset Password
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
