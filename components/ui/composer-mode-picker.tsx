"use client";

import {
  ChevronDownIcon,
  CitrusIcon,
  MinusIcon,
  PlusIcon,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
  AGENT_MODES,
  getAgentMode,
  prefsForMode,
  reasoningEffortLabel,
  stepReasoningEffort,
  toggleAgentPrefs,
  type AgentModeDefinition,
  type AgentModeIcon,
  type AgentModeId,
  type AgentPrefs,
} from "#shared/agent-modes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

/** Hover delay before the mode description tip appears. */
const MODE_TIP_DELAY_MS = 1000;

/** Lucide glass-water with the liquid (lower half) filled. */
function JuiceGlassIcon({
  className,
  size = 24,
  strokeWidth = 2,
  absoluteStrokeWidth,
  ...props
}: LucideProps) {
  const clipId = useId();
  const pixelSize = typeof size === "number" ? size : Number.parseInt(size, 10) || 24;
  const stroke =
    absoluteStrokeWidth === true
      ? (Number(strokeWidth) * 24) / pixelSize
      : strokeWidth;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...props}
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M5.116 4.104A1 1 0 0 1 6.11 3h11.78a1 1 0 0 1 .994 1.105L17.19 20.21A2 2 0 0 1 15.2 22H8.8a2 2 0 0 1-2-1.79z" />
        </clipPath>
      </defs>
      {/* Liquid fill below the surface line (y≈12). */}
      <path
        d="M5.5 12.15 C7.8 10.4 9.7 13.6 12 12 C14.3 10.4 16.2 13.6 18.5 12.15 L17.19 20.21A2 2 0 0 1 15.2 22H8.8a2 2 0 0 1-1.99-1.79Z"
        fill="currentColor"
        stroke="none"
        opacity={0.35}
        clipPath={`url(#${clipId})`}
      />
      <path d="M5.116 4.104A1 1 0 0 1 6.11 3h11.78a1 1 0 0 1 .994 1.105L17.19 20.21A2 2 0 0 1 15.2 22H8.8a2 2 0 0 1-2-1.79z" />
      <path d="M6 12a5 5 0 0 1 6 0 5 5 0 0 0 6 0" />
    </svg>
  );
}

const MODE_ICONS: Record<AgentModeIcon, LucideIcon> = {
  citrus: CitrusIcon,
  "glass-water": JuiceGlassIcon as LucideIcon,
};

export function getAgentModeIcon(icon: AgentModeIcon): LucideIcon {
  return MODE_ICONS[icon];
}

export type ComposerModePickerProps = {
  value: AgentPrefs;
  onChange: (next: AgentPrefs) => void;
  disabled?: boolean;
};

export function ComposerModePicker({
  value,
  onChange,
  disabled = false,
}: ComposerModePickerProps) {
  const [open, setOpen] = useState(false);
  const [activeModeId, setActiveModeId] = useState<AgentModeId>(value.mode);

  const selected = useMemo(() => getAgentMode(value.mode), [value.mode]);
  const SelectedIcon = getAgentModeIcon(selected.icon);
  const activeMode = getAgentMode(activeModeId);
  const isJuice = value.mode === "juice";
  const canDecrease = value.reasoning !== "low";
  const canIncrease = value.reasoning !== "high";

  function setMode(mode: AgentModeId) {
    setActiveModeId(mode);
    if (mode !== value.mode) {
      onChange(prefsForMode(mode));
    }
  }

  function setEffort(delta: -1 | 1) {
    onChange({
      ...value,
      reasoning: stepReasoningEffort(value.reasoning, delta),
    });
  }

  return (
    <Popover
      open={disabled ? false : open}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
        if (next) {
          setActiveModeId(value.mode);
        }
      }}
    >
      <TooltipProvider delay={MODE_TIP_DELAY_MS}>
        <Tooltip disabled={disabled || open}>
          <TooltipTrigger
            closeOnClick={false}
            delay={MODE_TIP_DELAY_MS}
            disabled={disabled || open}
            render={(props) => (
              <div
                {...props}
                className={cn(
                  "group flex h-8 items-stretch overflow-hidden rounded-full text-sm font-medium transition-colors",
                  disabled && "pointer-events-none",
                  isJuice
                    ? "bg-orange-600 text-white hover:bg-orange-600/90"
                    : [
                        "bg-orange-500/10 text-orange-600 hover:bg-orange-500/15",
                        "dark:bg-orange-500/15 dark:text-orange-400 dark:hover:bg-orange-500/25",
                      ],
                  open &&
                    (isJuice
                      ? "bg-orange-600/90"
                      : "bg-orange-500/15 dark:bg-orange-500/25"),
                  props.className,
                )}
              >
                <button
                  aria-label={
                    disabled
                      ? `Mode ${selected.label}`
                      : `Mode ${selected.label}. Click to switch.`
                  }
                  className={cn(
                    "flex items-center gap-1.5 py-0 pl-2.5 outline-none transition-[padding] duration-200",
                    disabled ? "pr-2.5" : "pr-1",
                  )}
                  disabled={disabled}
                  onClick={() => {
                    const next = toggleAgentPrefs(value);
                    setActiveModeId(next.mode);
                    onChange(next);
                  }}
                  type="button"
                >
                  <SelectedIcon className="size-3.5 shrink-0" />
                  <span>{selected.label}</span>
                </button>

                <PopoverTrigger
                  aria-hidden={disabled}
                  aria-label="Open mode and effort options"
                  aria-expanded={open}
                  className={cn(
                    "flex items-center justify-center outline-none transition-[width,opacity,padding] duration-200",
                    isJuice
                      ? "text-white/90"
                      : "text-orange-600/80 dark:text-orange-400/80",
                    disabled
                      ? "w-0 overflow-hidden p-0 opacity-0"
                      : "w-auto pr-2 pl-0.5 opacity-100",
                  )}
                  disabled={disabled}
                  tabIndex={disabled ? -1 : undefined}
                >
                  <ChevronDownIcon
                    className={cn(
                      "size-3.5 transition-transform duration-200",
                      open && "rotate-180",
                    )}
                  />
                </PopoverTrigger>
              </div>
            )}
          />
          <TooltipContent
            align="start"
            className="max-w-56 text-left leading-relaxed"
            side="top"
            sideOffset={8}
          >
            {selected.description}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        align="start"
        className="w-auto overflow-visible border-0 bg-transparent p-0 shadow-none ring-0"
        side="top"
        sideOffset={8}
      >
        <div className="relative w-56">
          <div
            className={cn(
              "overflow-hidden rounded-xl border border-black/8 bg-popover p-1",
              "text-popover-foreground shadow-lg dark:border-white/10",
            )}
          >
            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Effort
              </span>
              <div className="flex items-center gap-1">
                <button
                  aria-label="Decrease effort"
                  className={cn(
                    "flex size-6 items-center justify-center rounded-md",
                    "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                  disabled={!canDecrease}
                  onClick={() => setEffort(-1)}
                  type="button"
                >
                  <MinusIcon className="size-3.5" />
                </button>
                <span className="min-w-14 text-center text-xs font-medium text-foreground">
                  {reasoningEffortLabel(value.reasoning)}
                </span>
                <button
                  aria-label="Increase effort"
                  className={cn(
                    "flex size-6 items-center justify-center rounded-md",
                    "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                  disabled={!canIncrease}
                  onClick={() => setEffort(1)}
                  type="button"
                >
                  <PlusIcon className="size-3.5" />
                </button>
              </div>
            </div>

            <div className="mx-1 border-t border-border/60" />

            <div className="px-2 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Mode
            </div>
            <div role="listbox" aria-label="Agent mode">
              {AGENT_MODES.map((mode) => {
                const active = mode.id === activeModeId;
                const selectedMode = mode.id === value.mode;
                const Icon = getAgentModeIcon(mode.icon);
                return (
                  <button
                    key={mode.id}
                    aria-selected={selectedMode}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm",
                      "outline-none transition-colors",
                      active ? "bg-muted" : "hover:bg-muted/70",
                    )}
                    onClick={() => setMode(mode.id)}
                    onMouseEnter={() => setActiveModeId(mode.id)}
                    role="option"
                    type="button"
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        "text-orange-600 dark:text-orange-400",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                      {mode.label}
                    </span>
                    {selectedMode ? (
                      <span className="text-[11px] text-muted-foreground">
                        Selected
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="absolute top-0 left-[calc(100%+0.5rem)] hidden sm:block">
            <ModeExplainer mode={activeMode} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ModeExplainer({ mode }: { mode: AgentModeDefinition }) {
  const Icon = getAgentModeIcon(mode.icon);
  return (
    <div
      className={cn(
        "w-56 rounded-xl border border-black/8 bg-popover p-3",
        "text-popover-foreground shadow-lg dark:border-white/10",
      )}
      id="composer-mode-explainer"
      role="tooltip"
    >
      <div className="flex items-start gap-2">
        <Icon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            "text-orange-600 dark:text-orange-400",
          )}
        />
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{mode.label}</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {mode.description}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground/80">When: </span>
            {mode.whenToUse}
          </p>
        </div>
      </div>
    </div>
  );
}
