"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      closeButton
      position="top-center"
      richColors
      toastOptions={{
        classNames: {
          toast: "font-sans",
          description: "whitespace-pre-wrap break-words",
        },
      }}
    />
  );
}
