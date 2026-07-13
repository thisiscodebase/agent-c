import { cn } from "~/lib/utils";

export function SettingsGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-muted/60", className)}>
      {children}
    </div>
  );
}

export function SettingsRow({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border/60 px-4 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-end sm:max-w-[16rem] sm:min-w-[10rem]">
        {children}
      </div>
    </div>
  );
}
