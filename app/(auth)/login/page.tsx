"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LoginBrand } from "@/components/auth/login-brand";
import { LoginShell } from "@/components/auth/login-shell";
import { loginRequest } from "@/lib/api/auth-requests";
import { fetchOrganizationMe } from "@/lib/api/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getMarketingSiteUrl } from "@/lib/constants";
import { useAppNavigate } from "@/lib/hooks/use-app-navigate";
import { useAuthStore } from "@/stores/auth-store";
import { userNeedsPasswordChange } from "@/lib/auth/password-change";
import { postLoginRedirect } from "@/lib/platform-access";

const fieldClassName =
  "h-11 rounded-xl border-input/80 bg-background/90 px-3.5 text-base md:text-sm";

export default function LoginPage() {
  const { replace } = useAppNavigate();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      replace(postLoginRedirect(user));
    }
  }, [replace, status, user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { accessToken, refreshToken, user, organization, defaultBranchId } =
        await loginRequest(email, password);
      setSession({
        accessToken,
        refreshToken,
        user,
        organization,
        defaultBranchId,
      });
      const oid = user.organizationId ?? organization?.id;
      if (oid) {
        try {
          const full = await fetchOrganizationMe();
          useAuthStore.getState().setOrganization(full);
        } catch {
          /* keep org from login payload */
        }
      }
      toast.success(
        userNeedsPasswordChange(user)
          ? "Signed in — choose a new password to continue."
          : "Signed in",
      );
      replace(postLoginRedirect(user));
    } catch {
      toast.error("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "hydrating" || status === "idle") {
    return (
      <LoginShell>
        <LoginBrand description="Checking your session…" />
        <div className="mt-8 space-y-4" aria-busy aria-label="Loading sign in">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </LoginShell>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  return (
    <LoginShell>
      <LoginBrand />
      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@yourbusiness.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={fieldClassName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={fieldClassName}
          />
        </div>
        <Button
          type="submit"
          className="mt-1 h-11 w-full rounded-xl text-base font-medium shadow-sm"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
        <p className="pt-1 text-center text-xs leading-relaxed text-muted-foreground">
          New here?{" "}
          <Link
            href={getMarketingSiteUrl()}
            className="font-medium text-primary underline-offset-4 transition-colors hover:underline"
          >
            Visit the marketing site
          </Link>
        </p>
      </form>
    </LoginShell>
  );
}
