"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { consumeHandoffRequest } from "@/lib/api/auth-requests";
import { fetchOrganizationMe } from "@/lib/api/users";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import { postLoginRedirect } from "@/lib/platform-access";

function MissingCodeCard() {
  return (
    <Card className="w-full max-w-md border-border/40 bg-card/85 shadow-lg backdrop-blur-md">
      <CardHeader>
        <CardTitle>Could not complete sign-in</CardTitle>
        <CardDescription>
          Missing handoff code. Return to the signup page and try again.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href="/login"
          className={cn(buttonVariants(), "inline-flex w-full justify-center")}
        >
          Go to sign in
        </Link>
      </CardContent>
    </Card>
  );
}

function CallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code");
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    (async () => {
      try {
        const { accessToken, refreshToken, user, organization } =
          await consumeHandoffRequest(code);
        if (cancelled) return;
        setSession({ accessToken, refreshToken, user, organization });
        const oid = user.organizationId ?? organization?.id;
        if (oid) {
          try {
            const full = await fetchOrganizationMe();
            useAuthStore.getState().setOrganization(full);
          } catch {
            /* keep org from handoff payload */
          }
        }
        router.replace(postLoginRedirect(user));
      } catch {
        if (cancelled) return;
        setError("This link is invalid or has expired. Sign in instead.");
        toast.error("Handoff failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, router, setSession]);

  if (!code) {
    return <MissingCodeCard />;
  }

  if (error) {
    return (
      <Card className="w-full max-w-md border-border/40 bg-card/85 shadow-lg backdrop-blur-md">
        <CardHeader>
          <CardTitle>Could not complete sign-in</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/login"
            className={cn(buttonVariants(), "inline-flex w-full justify-center")}
          >
            Go to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-border/40 bg-card/85 shadow-lg backdrop-blur-md">
      <CardHeader>
        <CardTitle>Completing sign-in</CardTitle>
        <CardDescription>Securing your session…</CardDescription>
      </CardHeader>
    </Card>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50/90 p-4">
      <Suspense
        fallback={
          <Card className="w-full max-w-md border-border/40 bg-card/85 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Loading</CardTitle>
              <CardDescription>Please wait…</CardDescription>
            </CardHeader>
          </Card>
        }
      >
        <CallbackContent />
      </Suspense>
    </div>
  );
}
