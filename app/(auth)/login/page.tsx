"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { loginRequest } from "@/lib/api/auth-requests";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [router, status]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { accessToken, refreshToken, user, organization } =
        await loginRequest(email, password);
      setSession({ accessToken, refreshToken, user, organization });
      toast.success("Signed in");
      router.replace("/");
    } catch {
      toast.error("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "hydrating" || status === "idle") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50/90 p-4">
        <Card className="w-full max-w-md border-border/40 bg-card/85 shadow-lg backdrop-blur-md">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Checking session…</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50/90 p-4">
      <Card className="w-full max-w-md border-border/40 bg-card/85 shadow-lg backdrop-blur-md transition-shadow hover:shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-semibold">NutaPOS Hub</CardTitle>
          <CardDescription>
            Sign in with the email and password for your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background/80"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              New here? Start from the{" "}
              <Link
                href="http://localhost:4321"
                className="text-primary underline-offset-4 hover:underline"
              >
                marketing site
              </Link>
              .
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
