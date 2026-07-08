"use client";

import { AlertTriangleIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { chatInputColumnClass } from "./chat-layout";

function formatChatError(error: Error) {
  const message = error.message;

  if (
    message.includes("compiled-agent-manifest")
    || message.includes("LoadCompiledManifestError")
  ) {
    return "The agent was recompiled while this chat was in progress. Start a new chat, or restart the dev server if the problem persists.";
  }

  return message;
}

export function ChatErrorBanner({ error }: { error: Error | undefined }) {
  const [dismissedError, setDismissedError] = useState<Error | undefined>(undefined);

  if (!error || error === dismissedError) return null;

  return (
    <div className="pb-2">
      <div className={chatInputColumnClass}>
        <Alert variant="destructive">
        <AlertTriangleIcon />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>{formatChatError(error)}</AlertDescription>
        <AlertAction>
          <Button size="icon-sm" variant="ghost" onClick={() => setDismissedError(error)}>
            <XIcon />
          </Button>
        </AlertAction>
      </Alert>
      </div>
    </div>
  );
}
