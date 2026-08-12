"use client";

import type { ChatStatus } from "ai";
import { ArrowUpIcon, MicIcon, SquareIcon, XIcon } from "lucide-react";
import {
  type CSSProperties,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  SkillSlashMenu,
  clearComposerContent,
  composerHasContent,
  serializeComposerContent,
  setComposerPlainText,
  useSkillSlashMenu,
} from "~/components/ui/composer-skill-chips";
import {
  RefMentionMenu,
  useRefMentionMenu,
} from "~/components/ui/composer-ref-chips";
import { ComposerModePicker } from "~/components/ui/composer-mode-picker";
import { useDetailPanel } from "~/hooks/use-detail-panel";
import { useSpeechDictation } from "~/hooks/use-speech-dictation";
import type { AgentPrefs } from "#shared/agent-modes";
import { isComposerRefService } from "#shared/composer-refs";
import { cn } from "~/lib/utils";

/** Prepared for file-attachment UI (not rendered yet). */
export type UploadedFile = {
  id: string;
  name: string;
  type: string;
  url: string;
  description?: string;
  isUploading?: boolean;
};

/** @deprecated Prefer shared/composer-skills — kept for API compatibility. */
export type ComposerTool = {
  name: string;
  category: string;
  description?: string;
  icon?: ReactNode;
};

/** Prepared for the plus-button context menu (not rendered yet). */
export type ComposerContextOption = {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  onClick?: () => void;
};

export type ComposerProps = {
  /**
   * Static placeholder. When omitted, the empty composer rotates through
   * built-in hints (skills, connectors, general prompts).
   */
  placeholder?: string;
  onSubmit?: (message: string, files?: UploadedFile[]) => void;
  onChange?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  maxRows?: number;
  defaultValue?: string;
  /** When set, resets the editor to this plain text (chips are not preserved). */
  value?: string;
  className?: string;
  /** Reserved for upcoming attachment chips. */
  attachedFiles?: UploadedFile[];
  onRemoveFile?: (id: string) => void;
  /** @deprecated Slash skills are built-in; prop ignored. */
  tools?: ComposerTool[];
  onToolSelect?: (tool: ComposerTool) => void;
  showToolsButton?: boolean;
  /** Reserved for upcoming plus-button menu. */
  contextOptions?: ComposerContextOption[];
  onAttachClick?: () => void;
  status?: ChatStatus;
  onStop?: () => void;
  /** Per-thread Zest/Juice mode + reasoning. When set, shows the mode picker. */
  agentPrefs?: AgentPrefs;
  onAgentPrefsChange?: (prefs: AgentPrefs) => void;
};

const LINE_HEIGHT_PX = 24;
/** Empty / resting composer height (two text lines). */
const MIN_ROWS = 2;

/** Rotating empty-state hints when no static `placeholder` prop is passed. */
const COMPOSER_PLACEHOLDERS = [
  "What would you like to know?",
  "Type / for skills…",
  "Mention a Drive file with @…",
  "Draft a bid response with /bid-writing…",
  "Search Drive for the latest deck…",
  "What's the status of that HubSpot deal?",
] as const;

const PLACEHOLDER_ROTATE_MS = 4200;
const PLACEHOLDER_FADE_MS = 220;

function useRotatingPlaceholder(enabled: boolean): {
  text: string;
  fading: boolean;
} {
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setFading(false);
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let fadeTimeout: number | undefined;

    const id = window.setInterval(() => {
      if (reduceMotion) {
        setIndex((i) => (i + 1) % COMPOSER_PLACEHOLDERS.length);
        return;
      }
      setFading(true);
      fadeTimeout = window.setTimeout(() => {
        setIndex((i) => (i + 1) % COMPOSER_PLACEHOLDERS.length);
        setFading(false);
      }, PLACEHOLDER_FADE_MS);
    }, PLACEHOLDER_ROTATE_MS);

    return () => {
      window.clearInterval(id);
      if (fadeTimeout !== undefined) window.clearTimeout(fadeTimeout);
    };
  }, [enabled]);

  return {
    text: COMPOSER_PLACEHOLDERS[index] ?? COMPOSER_PLACEHOLDERS[0],
    fading,
  };
}

export function Composer({
  placeholder,
  onSubmit,
  onChange,
  disabled = false,
  autoFocus = false,
  maxRows = 8,
  defaultValue = "",
  value,
  className,
  attachedFiles = [],
  status,
  onStop,
  agentPrefs,
  onAgentPrefsChange,
}: ComposerProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!defaultValue.trim());
  const canSubmit = !isEmpty || attachedFiles.length > 0;

  const isGenerating = status === "submitted" || status === "streaming";
  const editorDisabled = disabled || isGenerating;

  const rotatePlaceholders = placeholder === undefined;
  const rotating = useRotatingPlaceholder(rotatePlaceholders && isEmpty);
  const activePlaceholder =
    placeholder ?? rotating.text ?? "What would you like to know?";
  const ariaLabel = placeholder ?? "What would you like to know?";

  const emitChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    setIsEmpty(!composerHasContent(editor));
    onChange?.(serializeComposerContent(editor));
  }, [onChange]);

  const syncLocalEmpty = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    setIsEmpty(!composerHasContent(editor));
  }, []);


  const slash = useSkillSlashMenu({
    editorRef,
    containerRef: cardRef,
    disabled: editorDisabled,
    onContentChange: emitChange,
  });

  const refs = useRefMentionMenu({
    editorRef,
    containerRef: cardRef,
    disabled: editorDisabled,
    onOpen: slash.close,
    onContentChange: emitChange,
  });

  // Keep menus mutually exclusive.
  useEffect(() => {
    if (slash.open) refs.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to slash.open
  }, [slash.open]);

  const getBaseText = useCallback(() => {
    const editor = editorRef.current;
    return editor ? serializeComposerContent(editor) : "";
  }, []);

  const setPlainValue = useCallback(
    (next: string) => {
      const editor = editorRef.current;
      if (!editor) return;
      setComposerPlainText(editor, next);
      emitChange();
      slash.refresh();
      refs.refresh();
    },
    [emitChange, refs.refresh, slash.refresh],
  );

  const {
    supported: dictationSupported,
    listening: isDictating,
    error: dictationError,
    stop: stopDictation,
    toggle: toggleDictation,
  } = useSpeechDictation({
    disabled: editorDisabled,
    getBaseText,
    onTranscript: setPlainValue,
  });

  const { openSkill, openRef } = useDetailPanel();

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const openFromChip = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      const skill = target.closest('[data-skill-chip="true"]');
      if (skill instanceof HTMLElement && skill.dataset.skillId) {
        openSkill(skill.dataset.skillId);
        return true;
      }
      const ref = target.closest('[data-ref-chip="true"]');
      if (ref instanceof HTMLElement) {
        const service = ref.dataset.service;
        const id = ref.dataset.refId;
        if (service && id && isComposerRefService(service)) {
          openRef(service, id, ref.dataset.name);
          return true;
        }
      }
      return false;
    };

    const onClick = (event: MouseEvent) => {
      if (openFromChip(event.target)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const onChipKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (!(event.target instanceof HTMLElement)) return;
      if (
        !event.target.matches(
          '[data-skill-chip="true"], [data-ref-chip="true"]',
        )
      ) {
        return;
      }
      if (openFromChip(event.target)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    editor.addEventListener("click", onClick);
    editor.addEventListener("keydown", onChipKeyDown);
    return () => {
      editor.removeEventListener("click", onClick);
      editor.removeEventListener("keydown", onChipKeyDown);
    };
  }, [openRef, openSkill]);

  const resizeEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.style.height = "0px";
    const minHeight = LINE_HEIGHT_PX * MIN_ROWS;
    const maxHeight = LINE_HEIGHT_PX * maxRows;
    const nextHeight = Math.min(
      Math.max(editor.scrollHeight, minHeight),
      maxHeight,
    );
    editor.style.height = `${nextHeight}px`;
  }, [maxRows]);

  useEffect(() => {
    resizeEditor();
  }, [isEmpty, resizeEditor]);

  useEffect(() => {
    if (autoFocus) {
      editorRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (defaultValue && editorRef.current && !editorRef.current.textContent) {
      setComposerPlainText(editorRef.current, defaultValue);
      syncLocalEmpty();
    }
    // Only seed once from defaultValue.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount seed
  }, []);

  useEffect(() => {
    if (value === undefined) return;
    const editor = editorRef.current;
    if (!editor) return;
    const current = serializeComposerContent(editor);
    if (current === value) return;
    setComposerPlainText(editor, value);
    syncLocalEmpty();
  }, [syncLocalEmpty, value]);

  const handleInput = useCallback(() => {
    if (isDictating) {
      stopDictation();
    }
    emitChange();
    resizeEditor();
    slash.refresh();
    refs.refresh();
  }, [
    emitChange,
    isDictating,
    refs.refresh,
    resizeEditor,
    slash.refresh,
    stopDictation,
  ]);

  const handleSubmit = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      if (editorDisabled) return;

      const editor = editorRef.current;
      if (!editor) return;

      const message = serializeComposerContent(editor);
      if (!message && attachedFiles.length === 0) return;

      stopDictation();
      onSubmit?.(message, attachedFiles);

      if (value === undefined) {
        clearComposerContent(editor);
        emitChange();
        resizeEditor();
        slash.close();
        refs.close();
      }
    },
    [
      attachedFiles,
      editorDisabled,
      emitChange,
      onSubmit,
      refs.close,
      resizeEditor,
      slash.close,
      stopDictation,
      value,
    ],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (slash.onKeyDown(event)) return;
      if (refs.onKeyDown(event)) return;

      if (event.key !== "Enter" || event.shiftKey) return;
      if (isComposing || event.nativeEvent.isComposing) return;

      event.preventDefault();
      handleSubmit();
    },
    [handleSubmit, isComposing, refs.onKeyDown, slash.onKeyDown],
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");
      if (!text) return;
      document.execCommand("insertText", false, text);
      emitChange();
      resizeEditor();
      slash.refresh();
      refs.refresh();
    },
    [emitChange, refs.refresh, resizeEditor, slash.refresh],
  );

  const handleStop = useCallback(() => {
    onStop?.();
  }, [onStop]);

  let sendIcon = <ArrowUpIcon className="size-4" />;
  if (status === "submitted" || status === "streaming") {
    sendIcon = <SquareIcon className="size-3.5 fill-current" />;
  } else if (status === "error") {
    sendIcon = <XIcon className="size-4" />;
  }

  const menuStyle: CSSProperties = {
    left: slash.menuPos.left,
    bottom: slash.menuPos.bottom,
  };

  const refMenuStyle: CSSProperties = {
    left: refs.menuPos.left,
    bottom: refs.menuPos.bottom,
  };

  return (
    <form className={cn("w-full", className)} onSubmit={handleSubmit}>
      <div
        ref={cardRef}
        className={cn(
          "relative rounded-3xl border border-black/5 bg-white px-4 pt-3 pb-3",
          "dark:border-white/10 dark:bg-card",
          "shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.08)]",
          "transition-[box-shadow,border-color] duration-200",
          "hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.1)]",
          "focus-within:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.1)]",
        )}
      >
        <SkillSlashMenu
          activeIndex={slash.activeIndex}
          onActiveIndexChange={slash.setActiveIndex}
          onSelect={slash.selectSkill}
          open={slash.open}
          query={slash.query}
          skills={slash.skills}
          style={menuStyle}
        />

        <RefMentionMenu
          activeIndex={refs.activeIndex}
          error={refs.error}
          items={refs.items}
          level={refs.level}
          loading={refs.loading}
          onActiveIndexChange={refs.setActiveIndex}
          onSelectItem={refs.selectItem}
          onSelectService={refs.selectService}
          open={refs.open}
          query={refs.query}
          recentItems={refs.recentItems}
          searchEmpty={refs.searchEmpty}
          searching={refs.searching}
          connecting={refs.connecting}
          service={refs.service}
          services={refs.services}
          style={refMenuStyle}
        />

        <div className="relative">
          {isEmpty ? (
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 text-base leading-6 text-muted-foreground/70",
                "transition-opacity duration-200 ease-out",
                !isDictating && rotatePlaceholders && rotating.fading
                  ? "opacity-0"
                  : "opacity-100",
              )}
            >
              {isDictating ? "Listening…" : activePlaceholder}
            </div>
          ) : null}
          <div
            ref={editorRef}
            aria-label={ariaLabel}
            aria-multiline="true"
            className={cn(
              "relative w-full resize-none bg-transparent text-base leading-6",
              "text-foreground focus:outline-none",
              "min-h-12 whitespace-pre-wrap break-words",
              editorDisabled && "pointer-events-none opacity-50",
            )}
            contentEditable={!editorDisabled}
            data-slot="composer-editor"
            onCompositionEnd={() => setIsComposing(false)}
            onCompositionStart={() => setIsComposing(true)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            role="textbox"
            style={{
              minHeight: `${LINE_HEIGHT_PX * MIN_ROWS}px`,
              maxHeight: `${LINE_HEIGHT_PX * maxRows}px`,
              overflowY: "auto",
            }}
            suppressContentEditableWarning
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            {agentPrefs && onAgentPrefsChange ? (
              <ComposerModePicker
                disabled={editorDisabled}
                onChange={onAgentPrefsChange}
                value={agentPrefs}
              />
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            {dictationSupported ? (
              <button
                aria-label={
                  isDictating ? "Stop dictation" : "Start dictation"
                }
                aria-pressed={isDictating}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full transition-colors",
                  isDictating
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  editorDisabled && "cursor-not-allowed opacity-50",
                )}
                disabled={editorDisabled}
                onClick={toggleDictation}
                title={
                  dictationError ??
                  (isDictating ? "Stop dictation" : "Dictate")
                }
                type="button"
              >
                <MicIcon
                  className={cn("size-4", isDictating && "animate-pulse")}
                />
              </button>
            ) : null}

            <button
              aria-label={isGenerating ? "Stop" : "Send message"}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                isGenerating
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : canSubmit && !disabled
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "bg-muted text-muted-foreground",
                (disabled || (!canSubmit && !isGenerating)) &&
                  "cursor-not-allowed",
              )}
              disabled={disabled || (!isGenerating && !canSubmit)}
              onClick={isGenerating && onStop ? handleStop : undefined}
              type={isGenerating && onStop ? "button" : "submit"}
            >
              {sendIcon}
            </button>
          </div>
        </div>
      </div>

      {dictationError ? (
        <p
          className="mt-2 max-w-prose px-1 text-xs text-destructive"
          role="alert"
        >
          {dictationError}
        </p>
      ) : null}
    </form>
  );
}
