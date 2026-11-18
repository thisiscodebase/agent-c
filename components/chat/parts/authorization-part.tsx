"use client";

import { KeyRoundIcon } from "lucide-react";
import type { EveInteractionPart } from "eve/react";
import { signInEnding } from "eve/react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

export function AuthorizationPart({ part }: { part: EveInteractionPart }) {
  const signIn = part.request.signIn;
  const displayName = signIn?.displayName || signIn?.name || part.request.title || "Connection";

  if (part.status === "settled") {
    const ending = part.outcome ? signInEnding(part.outcome) : "failed";
    return (
      <Alert>
        <KeyRoundIcon />
        <AlertTitle>
          {ending === "connected"
            ? `${displayName} connected`
            : `${displayName} ${ending}`}
        </AlertTitle>
        {part.reason ? <AlertDescription>{part.reason}</AlertDescription> : null}
      </Alert>
    );
  }

  return (
    <Alert>
      <KeyRoundIcon />
      <AlertTitle>{displayName}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>{part.request.prompt}</p>
        {signIn?.instructions ? <p>{signIn.instructions}</p> : null}
        {signIn?.userCode ? (
          <code className="w-fit rounded bg-muted px-2 py-1 text-foreground">{signIn.userCode}</code>
        ) : null}
        {signIn?.url ? (
          <a className="w-fit underline hover:text-foreground" href={signIn.url} rel="noreferrer" target="_blank">
            Sign in →
          </a>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
