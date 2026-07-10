"use client";

import type { ChatStatus } from "ai";
import { ArrowUpIcon, MicVocalIcon, SquareIcon, XIcon } from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Spinner } from "~/components/ui/spinner";
import { useSpeechDictation } from "~/hooks/use-speech-dictation";
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

/** Prepared for slash-command / tools UI (not rendered yet). */
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
  placeholder?: string;
  onSubmit?: (message: string, files?: UploadedFile[]) => void;
  onChange?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  maxRows?: number;
  defaultValue?: string;
  value?: string;
  className?: string;
  /** Reserved for upcoming attachment chips. */
  attachedFiles?: UploadedFile[];
  onRemoveFile?: (id: string) => void;
  /** Reserved for upcoming slash-command tools. */
  tools?: ComposerTool[];
  onToolSelect?: (tool: ComposerTool) => void;
  showToolsButton?: boolean;
  /** Reserved for upcoming plus-button menu. */
  contextOptions?: ComposerContextOption[];
  onAttachClick?: () => void;
  status?: ChatStatus;
  onStop?: () => void;
};

const LINE_HEIGHT_PX = 24;

export function Composer({
  placeholder = "What would you like to know?",
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
}: ComposerProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentValue = value !== undefined ? value : uncontrolledValue;
  const isGenerating = status === "submitted" || status === "streaming";
  const canSubmit =
    Boolean(currentValue.trim()) || attachedFiles.length > 0;

  const setValue = useCallback(
    (next: string) => {
      if (value === undefined) {
        setUncontrolledValue(next);
      }
      onChange?.(next);
    },
    [onChange, value],
  );

  const getBaseText = useCallback(() => currentValue, [currentValue]);

  const {
    supported: dictationSupported,
    listening: isDictating,
    error: dictationError,
    stop: stopDictation,
    toggle: toggleDictation,
  } = useSpeechDictation({
    disabled: disabled || isGenerating,
    getBaseText,
    onTranscript: setValue,
  });

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const maxHeight = LINE_HEIGHT_PX * maxRows;
    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, LINE_HEIGHT_PX),
      maxHeight,
    );
    textarea.style.height = `${nextHeight}px`;
  }, [maxRows]);

  useEffect(() => {
    resizeTextarea();
  }, [currentValue, resizeTextarea]);

  useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus();
    }
  }, [autoFocus]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      if (isDictating) {
        stopDictation();
      }
      setValue(event.target.value);
    },
    [isDictating, setValue, stopDictation],
  );

  const handleSubmit = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      if (disabled || isGenerating) return;
      if (!canSubmit) return;

      stopDictation();
      onSubmit?.(currentValue, attachedFiles);
      if (value === undefined) {
        setUncontrolledValue("");
      }
    },
    [
      attachedFiles,
      canSubmit,
      currentValue,
      disabled,
      isGenerating,
      onSubmit,
      stopDictation,
      value,
    ],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || event.shiftKey) return;
      if (isComposing || event.nativeEvent.isComposing) return;

      event.preventDefault();
      handleSubmit();
    },
    [handleSubmit, isComposing],
  );

  const handleStop = useCallback(() => {
    onStop?.();
  }, [onStop]);

  let sendIcon = <ArrowUpIcon className="size-4" />;
  if (status === "submitted") {
    sendIcon = <Spinner className="size-4" />;
  } else if (status === "streaming") {
    sendIcon = <SquareIcon className="size-3.5 fill-current" />;
  } else if (status === "error") {
    sendIcon = <XIcon className="size-4" />;
  }

  return (
    <form className={cn("w-full", className)} onSubmit={handleSubmit}>
      <div
        className={cn(
          "relative rounded-3xl border border-black/5 bg-white px-4 pt-3 pb-3",
          "dark:border-white/10 dark:bg-card",
          "shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.08)]",
          "transition-[box-shadow,border-color] duration-200",
          "hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.1)]",
          "focus-within:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.1)]",
        )}
      >
        <textarea
          ref={textareaRef}
          aria-label={placeholder}
          className={cn(
            "w-full resize-none bg-transparent text-base leading-6",
            "text-foreground placeholder:text-muted-foreground/70",
            "focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            "min-h-6",
          )}
          disabled={disabled || isGenerating}
          name="message"
          onChange={handleChange}
          onCompositionEnd={() => setIsComposing(false)}
          onCompositionStart={() => setIsComposing(true)}
          onKeyDown={handleKeyDown}
          placeholder={isDictating ? "Listening…" : placeholder}
          rows={1}
          style={{
            maxHeight: `${LINE_HEIGHT_PX * maxRows}px`,
            overflowY: "auto",
          }}
          value={currentValue}
        />

        <div className="mt-2 flex items-center justify-between gap-2">
          {/* Left toolbar — reserved for attach / tools / settings */}
          <div
            className="flex min-w-0 items-center gap-1"
            data-slot="composer-tools"
          />

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
                  (disabled || isGenerating) &&
                    "cursor-not-allowed opacity-50",
                )}
                disabled={disabled || isGenerating}
                onClick={toggleDictation}
                title={
                  dictationError ??
                  (isDictating ? "Stop dictation" : "Dictate")
                }
                type="button"
              >
                <MicVocalIcon
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
