"use client";

import { ChevronDownIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  resolveTodos,
  TodosChecklist,
  type TodoItemData,
} from "~/components/chat/parts/todos-checklist";
import {
  formatToolName,
  getToolCallsSummaryLabel,
} from "~/lib/tool-call-display";
import { getToolCategoryIcon } from "~/lib/tool-icons";
import { cn } from "~/lib/utils";

export interface ToolCallEntry {
  tool_name: string;
  tool_category: string;
  message?: string;
  show_category?: boolean;
  tool_call_id?: string;
  inputs?: Record<string, unknown>;
  output?: string;
  icon_url?: string;
  integration_name?: string;
}

export interface IntegrationInfo {
  iconUrl?: string;
  name?: string;
}

export interface ToolCallsSectionProps {
  toolCalls: ToolCallEntry[];
  integrations?: Map<string, IntegrationInfo>;
  maxIconsToShow?: number;
  defaultExpanded?: boolean;
  className?: string;
  iconSize?: number;
  renderIcon?: (call: ToolCallEntry, size: number) => ReactNode;
  renderContent?: (content: unknown) => ReactNode;
}

function DefaultContent({ content }: { content: unknown }) {
  const text =
    typeof content === "string"
      ? content
      : (() => {
          try {
            return JSON.stringify(content, null, 2);
          } catch {
            return String(content);
          }
        })();

  return (
    <pre className="max-h-60 max-w-[32rem] w-fit overflow-auto rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground whitespace-pre-wrap break-words">
      {text}
    </pre>
  );
}

function ToolCallDetails({
  call,
  contentRenderer,
}: {
  call: ToolCallEntry;
  contentRenderer: (content: unknown) => ReactNode;
}) {
  if (call.tool_category === "todos") {
    // Always use checklist UI for todos tools (including empty lists)
    const todos = resolveTodos(call.inputs, call.output) ?? [];
    return <TodosChecklist todos={todos} />;
  }

  return (
    <>
      {call.inputs && Object.keys(call.inputs).length > 0 ? (
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Input
          </p>
          {contentRenderer(call.inputs)}
        </div>
      ) : null}
      {call.output ? (
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Output
          </p>
          {contentRenderer(call.output)}
        </div>
      ) : null}
    </>
  );
}

function isTodosOnlyGroup(toolCalls: ToolCallEntry[]): boolean {
  return toolCalls.length > 0 && toolCalls.every((call) => call.tool_category === "todos");
}

/**
 * Solo todos group: one header + checklist (no nested "Checked todos" row).
 */
function SoloTodosSection({
  call,
  todos,
  iconRenderer,
  iconSize,
  className,
}: {
  call: ToolCallEntry;
  todos: TodoItemData[];
  iconRenderer: (call: ToolCallEntry, size: number) => ReactNode;
  iconSize: number;
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={cn("not-prose w-full", className)}>
      <button
        type="button"
        onClick={() => setIsExpanded((open) => !open)}
        className="flex cursor-pointer items-center gap-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
        aria-expanded={isExpanded}
      >
        {iconRenderer(call, iconSize)}
        <span className="text-xs font-medium">
          {call.message || getToolCallsSummaryLabel([call])}
        </span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 transition-transform duration-200",
            isExpanded && "rotate-180",
          )}
        />
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="pl-1 pb-1">
          <TodosChecklist todos={todos} />
        </div>
      </div>
    </div>
  );
}

export function ToolCallsSection({
  toolCalls,
  integrations,
  maxIconsToShow = 10,
  defaultExpanded = false,
  className,
  iconSize = 16,
  renderIcon,
  renderContent,
}: ToolCallsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedCalls, setExpandedCalls] = useState<Set<number>>(() => new Set());

  const integrationLookup = useMemo(() => {
    if (integrations) return integrations;
    return new Map<string, IntegrationInfo>();
  }, [integrations]);

  const getIconUrl = (call: ToolCallEntry): string | undefined => {
    if (call.icon_url) return call.icon_url;
    return integrationLookup.get(call.tool_category)?.iconUrl;
  };

  const getIntegrationName = (call: ToolCallEntry): string | undefined => {
    if (call.integration_name) return call.integration_name;
    return integrationLookup.get(call.tool_category)?.name;
  };

  const toggleCallExpansion = (index: number) => {
    setExpandedCalls((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  if (toolCalls.length === 0) return null;

  const defaultRenderIcon = (call: ToolCallEntry, size: number) =>
    getToolCategoryIcon(call.tool_category || "general", { size }, getIconUrl(call));

  const iconRenderer = renderIcon ?? defaultRenderIcon;
  const contentRenderer =
    renderContent ?? ((content: unknown) => <DefaultContent content={content} />);

  // Flatten: todos-only groups skip the nested tool-call row
  if (isTodosOnlyGroup(toolCalls)) {
    const call = toolCalls[toolCalls.length - 1]!;
    const todos = resolveTodos(call.inputs, call.output) ?? [];
    return (
      <SoloTodosSection
        call={call}
        className={className}
        iconRenderer={iconRenderer}
        iconSize={iconSize}
        todos={todos}
      />
    );
  }

  const renderStackedIcons = () => {
    const seenCategories = new Set<string>();
    const uniqueIcons = toolCalls.filter((call) => {
      const category = call.tool_category || "general";
      if (seenCategories.has(category)) return false;
      seenCategories.add(category);
      return true;
    });
    const displayIcons = uniqueIcons.slice(0, maxIconsToShow);

    return (
      <span className="flex items-center -space-x-1.5">
        {displayIcons.map((call, index) => (
          <span
            key={`${call.tool_call_id ?? call.tool_name}-${index}`}
            className="relative inline-flex items-center justify-center"
            style={{
              rotate:
                displayIcons.length > 1
                  ? index % 2 === 0
                    ? "8deg"
                    : "-8deg"
                  : "0deg",
              zIndex: index,
            }}
          >
            {iconRenderer(call, iconSize)}
          </span>
        ))}
        {uniqueIcons.length > maxIconsToShow ? (
          <span className="relative z-10 ml-1 text-xs text-muted-foreground">
            +{uniqueIcons.length - maxIconsToShow}
          </span>
        ) : null}
      </span>
    );
  };

  return (
    <div className={cn("not-prose w-full", className)}>
      <button
        type="button"
        onClick={() => setIsExpanded((open) => !open)}
        className="flex cursor-pointer items-center gap-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
        aria-expanded={isExpanded}
      >
        {renderStackedIcons()}
        <span className="text-xs font-medium">
          {getToolCallsSummaryLabel(toolCalls)}
        </span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 transition-transform duration-200",
            isExpanded && "rotate-180",
          )}
        />
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="flex flex-col gap-1 pt-1 pb-1">
          {toolCalls.map((call, index) => {
            const hasCategoryText =
              call.show_category !== false &&
              Boolean(call.tool_category) &&
              call.tool_category !== "unknown" &&
              call.tool_category !== "general";
            const hasDetails = Boolean(call.inputs) || Boolean(call.output);
            const isTodosCall = call.tool_category === "todos";
            // Todos always show their checklist once the parent group is open
            const isCallExpanded = isTodosCall || expandedCalls.has(index);
            const label = call.message || formatToolName(call.tool_name);

            return (
              <div
                key={call.tool_call_id ?? `${call.tool_name}-step-${index}`}
                className="flex gap-2"
              >
                <div className="flex w-7 shrink-0 flex-col items-center">
                  <span className="flex size-7 shrink-0 items-center justify-center">
                    {iconRenderer(call, iconSize)}
                  </span>
                  {index < toolCalls.length - 1 ? (
                    <span className="mt-0.5 w-px min-h-2 flex-1 bg-border" />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1 pb-2">
                  <div className="flex min-h-7 items-center gap-1">
                    {hasDetails && !isTodosCall ? (
                      <button
                        type="button"
                        className="group/parent flex min-w-0 cursor-pointer items-center gap-1 text-left"
                        onClick={() => toggleCallExpansion(index)}
                        aria-expanded={isCallExpanded}
                      >
                        <span className="text-xs font-medium text-foreground/80 group-hover/parent:text-foreground">
                          {label}
                        </span>
                        <ChevronDownIcon
                          className={cn(
                            "size-3 shrink-0 text-muted-foreground transition-transform duration-200",
                            isCallExpanded && "rotate-180",
                          )}
                        />
                      </button>
                    ) : (
                      <p className="text-xs font-medium text-foreground/80">{label}</p>
                    )}
                  </div>

                  {hasCategoryText ? (
                    <p className="text-[11px] text-muted-foreground">
                      {getIntegrationName(call) ||
                        call.tool_category
                          .replace(/_/g, " ")
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
                          )
                          .join(" ")}
                    </p>
                  ) : null}

                  {isCallExpanded && hasDetails ? (
                    <div className="mt-2 flex flex-col gap-2">
                      <ToolCallDetails call={call} contentRenderer={contentRenderer} />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ToolCallsSection;
