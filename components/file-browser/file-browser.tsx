"use client";

import { ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  FileBrowserIconsView,
  FileBrowserListView,
} from "~/components/file-browser/file-browser-views";
import {
  folderContents,
  folderTrail,
  normalizeFolderPath,
  parentFolderPath,
  type FileSystemFileItem,
  type FileSystemItem,
} from "~/lib/file-system";
import { cn } from "~/lib/utils";

const VIEWS = [
  { id: "icons", label: "Icons" },
  { id: "list", label: "List" },
] as const;

type FileBrowserView = typeof VIEWS[number]["id"];

export interface FileBrowserHomeContext {
  goTo: (path: string) => void;
}

/** Cursor into the visited-folder trail, so back and forward behave like Finder. */
function useFolderHistory(initialPath: string) {
  const [{ trail, cursor }, setHistory] = useState(() => ({
    trail: [normalizeFolderPath(initialPath)],
    cursor: 0,
  }));

  const goTo = useCallback((next: string) => {
    const normalized = normalizeFolderPath(next);

    setHistory((history) => {
      if (history.trail[history.cursor] === normalized) {
        return history;
      }

      // Navigating after going back drops the forward entries, as in a browser.
      const visited = [...history.trail.slice(0, history.cursor + 1), normalized];
      return { trail: visited, cursor: visited.length - 1 };
    });
  }, []);

  const back = useCallback(
    () => setHistory((history) => ({ ...history, cursor: Math.max(0, history.cursor - 1) })),
    [],
  );

  const forward = useCallback(
    () => setHistory((history) => ({
      ...history,
      cursor: Math.min(history.trail.length - 1, history.cursor + 1),
    })),
    [],
  );

  return {
    path: trail[cursor] ?? "",
    goTo,
    back,
    forward,
    canGoBack: cursor > 0,
    canGoForward: cursor < trail.length - 1,
  };
}

export function FileBrowser({
  items,
  title = "Files",
  emptyState,
  renderFilePreview,
  renderHome,
  onFileOpen,
  className,
}: {
  items: FileSystemItem[];
  title?: string;
  emptyState?: ReactNode;
  renderFilePreview?: (file: FileSystemFileItem) => ReactNode;
  /** When set, shown at the Docs root instead of the folder icons grid. */
  renderHome?: (ctx: FileBrowserHomeContext) => ReactNode;
  onFileOpen: (file: FileSystemFileItem) => void;
  className?: string;
}) {
  const [view, setView] = useState<FileBrowserView>("icons");
  const [selectedPath, setSelectedPath] = useState<string>();
  const { path, goTo, back, forward, canGoBack, canGoForward } = useFolderHistory("");

  const contents = useMemo(() => folderContents(items, path), [items, path]);
  const trail = folderTrail(path);
  const entryCount = contents.folders.length + contents.files.length;
  const atHome = path === "" && Boolean(renderHome);

  const open = useCallback((item: FileSystemItem) => {
    if (item.kind === "folder") {
      setSelectedPath(undefined);
      goTo(item.path);
      return;
    }

    onFileOpen(item);
  }, [goTo, onFileOpen]);

  const goUp = useCallback(() => {
    setSelectedPath(undefined);
    goTo(parentFolderPath(path));
  }, [goTo, path]);

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (atHome) {
      return;
    }

    const entries: FileSystemItem[] = [...contents.folders, ...contents.files];

    if (event.key === "Enter") {
      const selected = entries.find((entry) => entry.path === selectedPath);
      if (selected) {
        event.preventDefault();
        open(selected);
      }
      return;
    }

    if ((event.key === "ArrowUp" && event.metaKey) || event.key === "Backspace") {
      if (path) {
        event.preventDefault();
        goUp();
      }
      return;
    }

    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }

    event.preventDefault();
    const current = entries.findIndex((entry) => entry.path === selectedPath);
    const step = event.key === "ArrowDown" ? 1 : -1;
    const next = entries[Math.min(entries.length - 1, Math.max(0, current + step))];
    if (next) {
      setSelectedPath(next.path);
    }
  }, [atHome, contents, goUp, open, path, selectedPath]);

  const viewProps = {
    contents,
    items,
    selectedPath,
    onSelect: (item: FileSystemItem) => setSelectedPath(item.path),
    onOpen: open,
    renderFilePreview,
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-background",
        className,
      )}
    >
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 px-2 py-2">
        <div className="flex items-center">
          <Button
            aria-label="Back"
            disabled={!canGoBack}
            onClick={back}
            size="icon-sm"
            variant="ghost"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            aria-label="Forward"
            disabled={!canGoForward}
            onClick={forward}
            size="icon-sm"
            variant="ghost"
          >
            <ChevronRightIcon />
          </Button>
          <Button
            aria-label="Enclosing folder"
            disabled={!path}
            onClick={goUp}
            size="icon-sm"
            variant="ghost"
          >
            <ChevronUpIcon />
          </Button>
        </div>

        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1 text-sm">
          <button
            className="shrink-0 rounded px-1.5 py-0.5 font-medium hover:bg-orange-500/10"
            onClick={() => {
              setSelectedPath(undefined);
              goTo("");
            }}
            type="button"
          >
            {title}
          </button>

          {trail.map((crumb) => (
            <span className="flex min-w-0 items-center gap-1" key={crumb.path}>
              <ChevronRightIcon className="size-3 shrink-0 text-muted-foreground" />
              <button
                className="min-w-0 truncate rounded px-1.5 py-0.5 hover:bg-orange-500/10"
                onClick={() => {
                  setSelectedPath(undefined);
                  goTo(crumb.path);
                }}
                type="button"
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>

        {atHome ? null : (
          <Tabs onValueChange={(next) => setView(next as FileBrowserView)} value={view}>
            <TabsList>
              {VIEWS.map((option) => (
                <TabsTrigger key={option.id} value={option.id}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </header>

      {/* One tab stop for the whole grid, matching a Finder pane. */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="outline-none" onKeyDown={onKeyDown} tabIndex={0}>
          {atHome && renderHome ? (
            renderHome({ goTo })
          ) : entryCount === 0 ? (
            <div className="flex h-40 items-center justify-center p-6 text-center text-sm text-muted-foreground">
              {emptyState ?? "This folder is empty."}
            </div>
          ) : view === "icons" ? (
            <FileBrowserIconsView {...viewProps} />
          ) : (
            <FileBrowserListView {...viewProps} />
          )}
        </div>
      </ScrollArea>

      {atHome ? null : (
        <footer className="shrink-0 border-t border-border/60 px-3 py-1.5 text-center text-xs text-muted-foreground">
          {entryCount === 1 ? "1 item" : `${entryCount} items`}
        </footer>
      )}
    </div>
  );
}
