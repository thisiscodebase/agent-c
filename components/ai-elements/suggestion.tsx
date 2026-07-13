"use client";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { ComponentProps, ReactNode } from "react";
import { useCallback } from "react";

export type SuggestionsProps = ComponentProps<"div">;

export const Suggestions = ({
  className,
  children,
  ...props
}: SuggestionsProps) => (
  <div
    className={cn(
      "flex w-full flex-wrap items-center justify-center gap-2",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
  icon?: ReactNode;
};

export const Suggestion = ({
  suggestion,
  onClick,
  icon,
  className,
  variant = "outline",
  size = "sm",
  children,
  ...props
}: SuggestionProps) => {
  const handleClick = useCallback(() => {
    onClick?.(suggestion);
  }, [onClick, suggestion]);

  return (
    <Button
      className={cn("h-auto cursor-pointer gap-2 rounded-full px-3.5 py-1.5", className)}
      onClick={handleClick}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {icon ? (
        <span className="inline-flex shrink-0 items-center justify-center [&_img]:size-3.5">
          {icon}
        </span>
      ) : null}
      <span className="whitespace-normal text-left">{children || suggestion}</span>
    </Button>
  );
};
