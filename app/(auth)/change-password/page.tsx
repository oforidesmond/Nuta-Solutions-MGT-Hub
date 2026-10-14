"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LoginBrand } from "@/components/auth/login-brand";
import { LoginShell } from "@/components/auth/login-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { changePasswordRequest } from "@/lib/api/auth-requests";
import { handleApiError } from "@/lib/api/errors";
import { userNeedsPasswordChange } from "@/lib/auth/password-change";
import { useAppNavigate } from "@/lib/hooks/use-app-navigate";
import { postLoginRedirect } from "@/lib/platform-access";
import { useAuthStore } from "@/stores/auth-store";

const fieldClassName =
  "h-11 rounded-xl border-input/80 bg-background/90 px-3.5 text-base md:text-sm";

const MIN_PASSWORD_LENGTH = 8;

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  show,
  onToggleShow,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className={`${fieldClassName} pr-11`}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
          onClick={onToggleShow}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  const { replace } = useAppNavigate();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const clearSession = useAuthStore((s) => s.clearSession);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const needsChange = userNeedsPasswordChange(user);

  useEffect(() => {
    if (status === "unauthenticated") {
      replace("/login");
      return;
    }
    if (status === "authenticated" && user && !needsChange) {
      replace(postLoginRedirect(user));
    }
  }, [needsChange, replace, status, user]);

  const mismatch = useMemo(
    () => confirmPassword.length > 0 && newPassword !== confirmPassword,
    [confirmPassword, newPassword],
  );

  const sameAsCurrent = useMemo(
    () => newPassword.length > 0 && currentPassword.length > 0 && newPassword === currentPassword,
    [currentPassword, newPassword],
  );

  const tooShort = newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH;

  const canSubmit =
    !submitting &&
    currentPassword.length > 0 &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    newPassword === confirmPassword &&
    newPassword !== currentPassword;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await changePasswordRequest({
        currentPassword,
        newPassword,
      });
      patchUser({
        isTemporaryPassword: false,
        needsPasswordChange: false,
      });
      toast.success("Password updated. Welcome back.");
      const nextUser = {
        ...useAuthStore.getState().user!,
        isTemporaryPassword: false,
        needsPasswordChange: false,
      };
      replace(postLoginRedirect(nextUser));
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  function onSignOut() {
    clearSession();
    replace("/login");
  }

  if (status === "hydrating" || status === "idle") {
    return (
      <LoginShell>
        <LoginBrand description="Checking your session…" />
        <div className="mt-8 space-y-4" aria-busy aria-label="Loading">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </LoginShell>
    );
  }

  if (status === "unauthenticated" || (status === "authenticated" && user && !needsChange)) {
    return null;
  }

  return (
    <LoginShell>
      <LoginBrand description="For your security, choose a new password before continuing to the hub." />
      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3.5 py-3 text-sm text-amber-950 dark:text-amber-100">
          You signed in with a temporary password. Set one you will remember — you will use it for
          every future sign-in.
        </div>

        <PasswordField
          id="current-password"
          label="Temporary password"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
          placeholder="The password you just used"
          show={showCurrent}
          onToggleShow={() => setShowCurrent((v) => !v)}
        />

        <PasswordField
          id="new-password"
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          show={showNew}
          onToggleShow={() => setShowNew((v) => !v)}
        />
        {tooShort ? (
          <p className="text-xs text-destructive">
            Use at least {MIN_PASSWORD_LENGTH} characters.
          </p>
        ) : null}
        {sameAsCurrent ? (
          <p className="text-xs text-destructive">
            New password must be different from the temporary one.
          </p>
        ) : null}

        <PasswordField
          id="confirm-password"
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          placeholder="Re-enter new password"
          show={showConfirm}
          onToggleShow={() => setShowConfirm((v) => !v)}
        />
        {mismatch ? (
          <p className="text-xs text-destructive">Passwords do not match.</p>
        ) : null}

        <Button
          type="submit"
          disabled={!canSubmit}
          className="h-11 w-full rounded-xl text-base font-medium"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            "Save and continue"
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="h-10 w-full text-muted-foreground"
          onClick={onSignOut}
          disabled={submitting}
        >
          Sign out
        </Button>
      </form>
    </LoginShell>
  );
}
