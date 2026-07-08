"use client";

import { AlertTriangleIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";

export function ChatErrorBanner({ error }: { error: Error | undefined }) {
  const [dismissedError, setDismissedError] = useState<Error | undefined>(undefined);

  if (!error || error === dismissedError) return null;

  return (
    <div className="border-t bg-background p-3">
      <Alert variant="destructive">
        <AlertTriangleIcon />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
        <AlertAction>
          <Button size="icon-sm" variant="ghost" onClick={() => setDismissedError(error)}>
            <XIcon />
          </Button>
        </AlertAction>
      </Alert>
    </div>
  );
}
