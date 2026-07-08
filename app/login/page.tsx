"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { authClient } from "~/lib/auth-client";
import { agent } from "~/shared/agent";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectTo = (() => {
    const value = searchParams.get("redirect");
    return value?.startsWith("/") ? value : "/";
  })();

  async function handleGoogleSignIn() {
    setError("");
    setLoading(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: redirectTo,
      });

      if (result.error) {
        setError(result.error.message ?? "Sign in failed.");
      }
    }
    finally {
      setLoading(false);
    }
  }

  return (
    <div className="hero-glow flex min-h-svh flex-col items-center justify-center gap-6 px-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {agent.name}
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {agent.description}
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Sign in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            variant="outline"
            disabled={loading}
            onClick={handleGoogleSignIn}
          >
            Sign in with Google
          </Button>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
