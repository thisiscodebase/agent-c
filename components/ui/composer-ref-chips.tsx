"use client";

import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  COMPOSER_REF_SERVICES,
  formatRefMarker,
  getComposerRefService,
  type ComposerRefItem,
  type ComposerRefService,
  type ComposerRefServiceMeta,
} from "#shared/composer-refs";
import type { ConnectorSummary } from "#shared/types/connector";
import { queryKeys } from "~/lib/query-keys";
import { cn } from "~/lib/utils";

const REF_CHIP_ATTR = "data-ref-chip";

/** Leafy green — leaf of a fresh orange. */
export const REF_MENTION_COLOR = "text-lime-700 dark:text-lime-400";

const REF_INSERT_CHAR_STAGGER_MS = 28;
const REF_INSERT_CHAR_DURATION_MS = 780;
const RECENT_STALE_MS = 5 * 60_000;
const SEARCH_STALE_MS = 60_000;

type AtMatch = {
  query: string;
  range: Range;
};

export function isRefChip(node: Node | null): node is HTMLElement {
  return (
    node instanceof HTMLElement && node.getAttribute(REF_CHIP_ATTR) === "true"
  );
}

/**
 * Find `@token` before the caret.
 * - Services mode: no spaces (`@drive`).
 * - Items/search mode: spaces allowed so `@monthly all hands` lives in the
 *   composer and is replaced by the selected chip.
 */
export function findAtMatch(
  root: HTMLElement,
  options?: { allowSpaces?: boolean },
): AtMatch | null {
  const selection = window.getSelection();
  if (!selection || !selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const caret = selection.getRangeAt(0);
  if (!root.contains(caret.startContainer)) return null;
  if (caret.startContainer.nodeType !== Node.TEXT_NODE) return null;

  const textNode = caret.startContainer as Text;
  const full = textNode.textContent ?? "";
  const before = full.slice(0, caret.startOffset);
  const pattern = options?.allowSpaces
    ? /(?:^|[\s\u00a0])(@[^\n]*)$/
    : /(?:^|[\s\u00a0])(@[^\s\u00a0]*)$/;
  const match = before.match(pattern);
  if (!match?.[1]) return null;

  const token = match[1];
  // Don't treat a trailing space-only query specially — trim is for search API.
  const start = caret.startOffset - token.length;
  const range = document.createRange();
  range.setStart(textNode, start);
  range.setEnd(textNode, caret.startOffset);

  return {
    query: token.slice(1),
    range,
  };
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function refIconImgHtml(iconSrc: string): string {
  return `<img src="${iconSrc}" alt="" width="16" height="16" class="block size-full object-contain" />`;
}

function fillRefLabelChars(label: HTMLSpanElement, plainLabel: string) {
  label.replaceChildren();
  Array.from(plainLabel).forEach((char, index) => {
    const span = document.createElement("span");
    span.className = "ref-mention-char";
    span.style.setProperty("--i", String(index));
    span.textContent = char === " " ? "\u00a0" : char;
    label.append(span);
  });
}

function playRefInsertAnimation(mention: HTMLSpanElement, charCount: number) {
  mention.dataset.inserting = "true";
  const settleMs =
    REF_INSERT_CHAR_DURATION_MS +
    Math.max(0, charCount - 1) * REF_INSERT_CHAR_STAGGER_MS;
  window.setTimeout(() => {
    if (!mention.isConnected) return;
    delete mention.dataset.inserting;
  }, settleMs);
}

export function createRefChipElement(
  service: ComposerRefService,
  item: ComposerRefItem,
  options?: { animate?: boolean },
): HTMLSpanElement {
  const meta = getComposerRefService(service);
  const mention = document.createElement("span");
  mention.setAttribute(REF_CHIP_ATTR, "true");
  mention.contentEditable = "false";
  mention.dataset.service = service;
  mention.dataset.refId = item.id;
  mention.dataset.name = item.name;
  if (item.url) mention.dataset.url = item.url;
  mention.className = cn(
    "ref-mention max-w-full whitespace-nowrap",
    "text-base font-normal",
    REF_MENTION_COLOR,
    "cursor-pointer select-none",
  );
  mention.setAttribute("title", `${meta?.label ?? service}: ${item.name}`);
  mention.setAttribute("role", "button");
  mention.tabIndex = 0;

  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.className = cn(
    "ref-mention-icon mr-1 inline-block size-[1em] align-[-0.125em]",
  );
  icon.innerHTML = refIconImgHtml(meta?.iconSrc ?? "/icons/drive.svg");

  const display = `@${item.name}`;
  const label = document.createElement("span");
  label.className = "ref-mention-label";
  fillRefLabelChars(label, display);

  mention.append(icon, label);

  if (options?.animate && !prefersReducedMotion()) {
    playRefInsertAnimation(mention, display.length);
  }

  return mention;
}

export function insertRefChip(
  root: HTMLElement,
  service: ComposerRefService,
  item: ComposerRefItem,
  replaceRange: Range,
) {
  replaceRange.deleteContents();

  const chip = createRefChipElement(service, item, { animate: true });
  replaceRange.insertNode(chip);

  const space = document.createTextNode("\u00a0");
  chip.after(space);

  const selection = window.getSelection();
  if (!selection) return;
  const after = document.createRange();
  after.setStart(space, space.length);
  after.collapse(true);
  selection.removeAllRanges();
  selection.addRange(after);

  root.focus();
}

/** Expand a ref chip DOM node to its agent marker. */
export function serializeRefChip(node: HTMLElement): string {
  const service = node.dataset.service;
  const id = node.dataset.refId;
  const name = node.dataset.name;
  if ((service === "drive" || service === "notion") && id && name) {
    return formatRefMarker(service, id, name);
  }
  return name ? `@${name}` : "";
}

type RefItemsResponse = {
  items: ComposerRefItem[];
  meta?: { connecting?: boolean };
};

async function fetchRefItems(
  service: ComposerRefService,
  query: string,
): Promise<RefItemsResponse> {
  const params = new URLSearchParams({ service, q: query });
  const res = await fetch(`/api/composer/refs?${params}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? `Failed to load ${service} items`);
  }
  const data = (await res.json()) as RefItemsResponse;
  return {
    items: data.items ?? [],
    meta: data.meta,
  };
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function humanizeMime(mimeType: string | undefined): string | null {
  if (!mimeType || mimeType === "notion/page") return null;
  const map: Record<string, string> = {
    "application/vnd.google-apps.document": "Google Doc",
    "application/vnd.google-apps.spreadsheet": "Google Sheet",
    "application/vnd.google-apps.presentation": "Google Slides",
    "application/vnd.google-apps.folder": "Folder",
    "application/vnd.google-apps.form": "Google Form",
    "application/pdf": "PDF",
    "image/png": "PNG",
    "image/jpeg": "JPEG",
    "text/plain": "Text",
  };
  if (map[mimeType]) return map[mimeType];
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  const subtype = mimeType.split("/")[1];
  return subtype ? subtype.toUpperCase() : mimeType;
}

type RefMentionMenuProps = {
  open: boolean;
  level: "services" | "items";
  query: string;
  services: ComposerRefServiceMeta[];
  service: ComposerRefService | null;
  items: ComposerRefItem[];
  recentItems: ComposerRefItem[];
  searching: boolean;
  searchEmpty: boolean;
  loading: boolean;
  /** First Notion MCP handshake (or idle reconnect) — not a normal search. */
  connecting: boolean;
  error: string | null;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelectService: (service: ComposerRefService) => void;
  onSelectItem: (item: ComposerRefItem) => void;
  style?: CSSProperties;
};

function itemsLoadingLabel(args: {
  service: ComposerRefService | null;
  searching: boolean;
  connecting: boolean;
}): string {
  if (args.connecting) {
    return "Connecting to Notion…";
  }
  if (args.service === "notion") {
    return args.searching ? "Searching Notion…" : "Loading Notion…";
  }
  return args.searching ? "Searching…" : "Loading…";
}

export function RefMentionMenu({
  open,
  level,
  query,
  services,
  service,
  items,
  recentItems,
  searching,
  searchEmpty,
  loading,
  connecting,
  error,
  activeIndex,
  onActiveIndexChange,
  onSelectService,
  onSelectItem,
  style,
}: RefMentionMenuProps) {
  if (!open) return null;

  const activeServiceMeta = service ? getComposerRefService(service) : null;
  const activeItem = level === "items" ? (items[activeIndex] ?? null) : null;
  const activeServiceRow =
    level === "services" ? (services[activeIndex] ?? null) : null;

  const showRecentFallback = searchEmpty && recentItems.length > 0;
  const loadingLabel = itemsLoadingLabel({ service, searching, connecting });

  return (
    <div className="absolute z-50" style={style}>
      <div className="relative w-56">
        <div
          className={cn(
            "overflow-hidden rounded-xl border border-black/8 bg-popover p-1",
            "text-popover-foreground shadow-lg dark:border-white/10",
          )}
          role="listbox"
        >
          <div className="px-2 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {level === "services"
              ? `Mention${query ? ` · @${query}` : ""}`
              : connecting
                ? `${activeServiceMeta?.label ?? "Notion"} · connecting`
                : `${activeServiceMeta?.label ?? "Items"}${
                    searching ? ` · search` : " · recent"
                  }`}
          </div>

          {level === "services" ? (
            services.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">
                Connect Drive or Notion in Settings
              </div>
            ) : (
              services.map((entry, index) => {
                const active = index === activeIndex;
                return (
                  <button
                    key={entry.id}
                    aria-selected={active}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm",
                      "outline-none transition-colors",
                      active ? "bg-muted" : "hover:bg-muted/70",
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onSelectService(entry.id)}
                    onMouseEnter={() => onActiveIndexChange(index)}
                    role="option"
                    type="button"
                  >
                    <img
                      alt=""
                      className="size-4 shrink-0 object-contain"
                      height={16}
                      src={entry.iconSrc}
                      width={16}
                    />
                    <span className="min-w-0 truncate font-medium text-foreground">
                      {entry.label}
                    </span>
                  </button>
                );
              })
            )
          ) : loading && items.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground">
              <p>{loadingLabel}</p>
              {connecting ? (
                <p className="mt-1 text-[11px] text-muted-foreground/80">
                  First load opens a secure session — later searches are faster.
                </p>
              ) : null}
            </div>
          ) : error && items.length === 0 ? (
            <div className="px-2 py-3 text-sm text-destructive">{error}</div>
          ) : items.length === 0 && !showRecentFallback ? (
            <div className="px-2 py-3 text-sm text-muted-foreground">
              No matches
            </div>
          ) : (
            <>
              {showRecentFallback ? (
                <div className="px-2 py-1 text-[11px] text-muted-foreground">
                  No matches — recent
                </div>
              ) : null}
              {(showRecentFallback ? recentItems : items).map((item, index) => {
                const active = index === activeIndex;
                return (
                  <button
                    key={item.id}
                    aria-describedby={
                      active ? "ref-mention-explainer" : undefined
                    }
                    aria-selected={active}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm",
                      "outline-none transition-colors",
                      active ? "bg-muted" : "hover:bg-muted/70",
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onSelectItem(item)}
                    onMouseEnter={() => onActiveIndexChange(index)}
                    role="option"
                    type="button"
                  >
                    {activeServiceMeta ? (
                      <img
                        alt=""
                        className="size-4 shrink-0 object-contain"
                        height={16}
                        src={activeServiceMeta.iconSrc}
                        width={16}
                      />
                    ) : null}
                    <span className="min-w-0 truncate font-medium text-foreground">
                      {item.name}
                    </span>
                  </button>
                );
              })}
              {loading ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  {connecting ? "Connecting to Notion…" : loadingLabel}
                </div>
              ) : null}
            </>
          )}
        </div>

        {activeItem && activeServiceMeta ? (
          <div className="absolute top-0 left-[calc(100%+0.5rem)]">
            <RefExplainer item={activeItem} service={activeServiceMeta} />
          </div>
        ) : null}
        {activeServiceRow && level === "services" ? (
          <div className="absolute top-0 left-[calc(100%+0.5rem)]">
            <ServiceExplainer service={activeServiceRow} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ServiceExplainer({ service }: { service: ComposerRefServiceMeta }) {
  return (
    <div
      className={cn(
        "w-56 rounded-xl border border-black/8 bg-popover p-3",
        "text-popover-foreground shadow-lg dark:border-white/10",
      )}
      role="tooltip"
    >
      <div className="flex items-start gap-2">
        <img
          alt=""
          className="mt-0.5 size-4 shrink-0 object-contain"
          height={16}
          src={service.iconSrc}
          width={16}
        />
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">
            {service.label}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {service.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function RefExplainer({
  item,
  service,
}: {
  item: ComposerRefItem;
  service: ComposerRefServiceMeta;
}) {
  const kind =
    service.id === "notion"
      ? "Page"
      : humanizeMime(item.mimeType) ?? "File";
  const details: string[] = [service.label, kind];
  if (item.author) details.push(item.author);
  if (item.modifiedAt) {
    details.push(`Updated ${formatShortDate(item.modifiedAt)}`);
  } else if (item.createdAt) {
    details.push(`Created ${formatShortDate(item.createdAt)}`);
  }

  return (
    <div
      className={cn(
        "w-56 rounded-xl border border-black/8 bg-popover p-3",
        "text-popover-foreground shadow-lg dark:border-white/10",
      )}
      id="ref-mention-explainer"
      role="tooltip"
    >
      <div className="flex items-start gap-2">
        <img
          alt=""
          className="mt-0.5 size-4 shrink-0 object-contain"
          height={16}
          src={service.iconSrc}
          width={16}
        />
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{item.name}</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {details.join(" · ")}
          </p>
          {item.createdAt && item.modifiedAt ? (
            <p className="mt-1 text-[11px] text-muted-foreground/80">
              Created {formatShortDate(item.createdAt)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type UseRefMentionMenuArgs = {
  editorRef: React.RefObject<HTMLElement | null>;
  containerRef: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
  onOpen?: () => void;
  onContentChange: () => void;
};

export function useRefMentionMenu({
  editorRef,
  containerRef,
  disabled,
  onOpen,
  onContentChange,
}: UseRefMentionMenuArgs) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<"services" | "items">("services");
  const [service, setService] = useState<ComposerRefService | null>(null);
  /** Service-filter query (no spaces) while picking a connector. */
  const [serviceFilter, setServiceFilter] = useState("");
  /**
   * Protected search buffer in items mode — spaces allowed; not written into
   * the contenteditable (editor stays `@`).
   */
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPos, setMenuPos] = useState({ left: 8, bottom: 56 });
  const replaceRangeRef = useRef<Range | null>(null);
  const levelRef = useRef(level);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  const matchAt = useCallback((editor: HTMLElement) => {
    return findAtMatch(editor, {
      allowSpaces: levelRef.current === "items",
    });
  }, []);

  const connectorsQuery = useQuery({
    queryKey: queryKeys.connectors,
    queryFn: () =>
      fetch("/api/connectors").then(
        (r) => r.json() as Promise<ConnectorSummary[]>,
      ),
    staleTime: 60_000,
  });

  const connectedServices = COMPOSER_REF_SERVICES.filter((entry) => {
    const row = connectorsQuery.data?.find((c) => c.id === entry.connectorId);
    return row?.status.state === "connected";
  });

  const filteredServices = (() => {
    const q = serviceFilter.trim().toLowerCase();
    if (!q) return [...connectedServices];
    return connectedServices.filter(
      (entry) =>
        entry.id.includes(q) ||
        entry.label.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q),
    );
  })();

  const trimmedSearch = searchQuery.trim();
  const searching = level === "items" && trimmedSearch.length > 0;

  const recentQuery = useQuery({
    queryKey: queryKeys.composerRefsRecent(service ?? "none"),
    queryFn: () => fetchRefItems(service!, ""),
    enabled: open && level === "items" && Boolean(service),
    staleTime: RECENT_STALE_MS,
  });

  const searchQueryResult = useQuery({
    queryKey: queryKeys.composerRefsSearch(service ?? "none", trimmedSearch),
    queryFn: () => fetchRefItems(service!, trimmedSearch),
    enabled: open && level === "items" && Boolean(service) && searching,
    staleTime: SEARCH_STALE_MS,
  });

  const recentItems = recentQuery.data?.items ?? [];
  const searchItems = searchQueryResult.data?.items ?? [];
  const searchEmpty =
    searching &&
    !searchQueryResult.isFetching &&
    (searchQueryResult.isSuccess || searchQueryResult.isError) &&
    searchItems.length === 0;
  const items = searching
    ? searchEmpty
      ? recentItems
      : searchItems
    : recentItems;
  const loading = searching
    ? searchQueryResult.isFetching
    : recentQuery.isFetching;
  const error = searching
    ? searchQueryResult.error instanceof Error
      ? searchQueryResult.error.message
      : null
    : recentQuery.error instanceof Error
      ? recentQuery.error.message
      : null;

  // Notion MCP handshake on cold start (no warm recent cache yet).
  const connecting =
    service === "notion" &&
    loading &&
    recentItems.length === 0 &&
    !recentQuery.isSuccess;

  const query = level === "services" ? serviceFilter : searchQuery;

  useEffect(() => {
    setActiveIndex(0);
  }, [query, level, service, items.length, searchEmpty]);

  const close = useCallback(() => {
    setOpen(false);
    setLevel("services");
    setService(null);
    setServiceFilter("");
    setSearchQuery("");
    replaceRangeRef.current = null;
  }, []);

  const placeMenu = useCallback((matchRange: Range, container: HTMLElement) => {
    const rect = matchRange.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const panelWidth = 224;
    setMenuPos({
      left: Math.max(
        8,
        Math.min(
          rect.left - containerRect.left,
          containerRect.width - panelWidth,
        ),
      ),
      bottom: containerRect.bottom - rect.top + 8,
    });
  }, []);

  const refresh = useCallback(() => {
    if (disabled) {
      close();
      return;
    }
    const editor = editorRef.current;
    const container = containerRef.current;
    if (!editor || !container) {
      close();
      return;
    }

    const match = matchAt(editor);
    if (!match) {
      close();
      return;
    }

    replaceRangeRef.current = match.range.cloneRange();
    setOpen(true);
    onOpen?.();
    placeMenu(match.range, container);

    if (levelRef.current === "items") {
      setSearchQuery(match.query);
    } else {
      setServiceFilter(match.query);
    }
  }, [close, containerRef, disabled, editorRef, matchAt, onOpen, placeMenu]);

  useLayoutEffect(() => {
    if (!open) return;
    const match = editorRef.current ? matchAt(editorRef.current) : null;
    const container = containerRef.current;
    if (!match || !container) return;
    placeMenu(match.range, container);
  }, [containerRef, editorRef, matchAt, open, placeMenu, query, level]);

  // Prefetch recent for connected services when the menu first opens.
  useEffect(() => {
    if (!open || level !== "services") return;
    for (const entry of connectedServices) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.composerRefsRecent(entry.id),
        queryFn: () => fetchRefItems(entry.id, ""),
        staleTime: RECENT_STALE_MS,
      });
    }
  }, [connectedServices, open, level, queryClient]);

  const selectService = useCallback(
    (next: ComposerRefService) => {
      const editor = editorRef.current;
      const range = replaceRangeRef.current;
      if (!editor || !range) return;

      // Reset to bare `@` — further typing appears in the composer as the
      // search query (spaces allowed) and is replaced on select.
      range.deleteContents();
      const at = document.createTextNode("@");
      range.insertNode(at);
      const after = document.createRange();
      after.setStart(at, at.length);
      after.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(after);

      replaceRangeRef.current = (() => {
        const r = document.createRange();
        r.setStart(at, 0);
        r.setEnd(at, at.length);
        return r;
      })();

      setService(next);
      setLevel("items");
      setServiceFilter("");
      setSearchQuery("");
      setActiveIndex(0);
      editor.focus();
      onContentChange();

      void queryClient.prefetchQuery({
        queryKey: queryKeys.composerRefsRecent(next),
        queryFn: () => fetchRefItems(next, ""),
        staleTime: RECENT_STALE_MS,
      });
    },
    [editorRef, onContentChange, queryClient],
  );

  const selectItem = useCallback(
    (item: ComposerRefItem) => {
      const editor = editorRef.current;
      const range = replaceRangeRef.current;
      if (!editor || !range || !service) return;

      const match = matchAt(editor);
      const useRange = match?.range ?? range;
      insertRefChip(editor, service, item, useRange);
      close();
      onContentChange();
    },
    [close, editorRef, matchAt, onContentChange, service],
  );

  const backToServices = useCallback(() => {
    const editor = editorRef.current;
    const range = replaceRangeRef.current;
    // Collapse composer token back to `@` when returning to service list.
    if (editor && range) {
      const match = matchAt(editor);
      const useRange = match?.range ?? range;
      useRange.deleteContents();
      const at = document.createTextNode("@");
      useRange.insertNode(at);
      const after = document.createRange();
      after.setStart(at, at.length);
      after.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(after);
      replaceRangeRef.current = (() => {
        const r = document.createRange();
        r.setStart(at, 0);
        r.setEnd(at, at.length);
        return r;
      })();
      onContentChange();
    }

    setLevel("services");
    setService(null);
    setSearchQuery("");
    setServiceFilter("");
    setActiveIndex(0);
  }, [editorRef, matchAt, onContentChange]);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (!open) return false;

      if (event.key === "Escape") {
        event.preventDefault();
        if (level === "items") {
          backToServices();
        } else {
          close();
        }
        return true;
      }

      if (level === "items") {
        // Backspace on bare `@` returns to services (query synced from editor).
        if (event.key === "Backspace" && searchQuery.length === 0) {
          event.preventDefault();
          backToServices();
          return true;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          if (items.length === 0) return true;
          setActiveIndex((i) => (i + 1) % items.length);
          return true;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          if (items.length === 0) return true;
          setActiveIndex(
            (i) => (i - 1 + items.length) % items.length,
          );
          return true;
        }

        if (
          (event.key === "Enter" && !event.shiftKey) ||
          event.key === "Tab"
        ) {
          const item = items[activeIndex];
          if (item) {
            event.preventDefault();
            selectItem(item);
            return true;
          }
        }

        // Let printable keys (incl. space) type into the composer `@…` token.
        return false;
      }

      // Services level — normal navigation; typing stays in the editor.
      const count = filteredServices.length;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (count === 0) return true;
        setActiveIndex((i) => (i + 1) % count);
        return true;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (count === 0) return true;
        setActiveIndex((i) => (i - 1 + count) % count);
        return true;
      }

      if (
        (event.key === "Enter" && !event.shiftKey) ||
        event.key === "Tab"
      ) {
        const entry = filteredServices[activeIndex];
        if (entry) {
          event.preventDefault();
          selectService(entry.id);
          return true;
        }
      }

      return false;
    },
    [
      activeIndex,
      backToServices,
      close,
      items,
      filteredServices,
      level,
      open,
      searchQuery.length,
      selectItem,
      selectService,
    ],
  );

  return {
    open,
    level,
    query,
    service,
    services: filteredServices,
    items,
    recentItems,
    searching,
    searchEmpty,
    loading,
    connecting,
    error,
    activeIndex,
    setActiveIndex,
    menuPos,
    refresh,
    close,
    selectService,
    selectItem,
    onKeyDown,
  };
}
