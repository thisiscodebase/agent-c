"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  MenuIcon,
  PencilIcon,
  PlusIcon,
  PodiumIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { profilePathForEmail } from "#shared/user-handle";
import { CommandPalette } from "~/components/command-palette";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "~/components/ui/sheet";
import { useChatNavigation } from "~/hooks/chat/use-chat-navigation";
import { requestThreadTitleGeneration } from "~/hooks/chat/use-thread-title";
import { formatThreadTime, useThreadList } from "~/hooks/chat/use-threads";
import { useThreadGroups } from "~/hooks/chat/use-thread-groups";
import { useSidebarResize } from "~/hooks/use-sidebar-resize";
import { useAdminAccess } from "~/hooks/use-admin";
import { authClient } from "~/lib/auth-client";
import { cn } from "~/lib/utils";

type ShellUser = {
  name?: string | null;
  image?: string | null;
  email?: string | null;
};

type ThreadGroup = ReturnType<typeof useThreadGroups>[number];

function userInitial(user: ShellUser | undefined) {
  return user?.name?.trim()?.[0]?.toUpperCase() ?? "?";
}

function mobilePageTitle({
  pathname,
  activeChatId,
  threads,
}: {
  pathname: string;
  activeChatId?: string;
  threads: { id: string; title: string }[];
}) {
  if (activeChatId) {
    return threads.find((thread) => thread.id === activeChatId)?.title ?? "Chat";
  }
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/leaderboard")) return "Leaderboard";
  if (pathname.startsWith("/admin")) return "Admin";
  if (pathname.startsWith("/u/")) return "Profile";
  return "Agent C";
}

function SidebarNav({
  activeChatId,
  groups,
  user,
  profileHref,
  showAdmin,
  showShortcuts,
  onNewChat,
  onSearch,
  onDeleteThread,
  onRenameThread,
}: {
  activeChatId?: string;
  groups: ThreadGroup[];
  user: ShellUser | undefined;
  profileHref: string;
  showAdmin: boolean;
  showShortcuts?: boolean;
  onNewChat: () => void;
  onSearch: () => void;
  onDeleteThread: (threadId: string) => void;
  onRenameThread: (threadId: string) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5 p-3">
        <Button className="w-full justify-between" variant="outline" onClick={onNewChat}>
          <span className="flex items-center gap-1.5">
            <PlusIcon className="size-4" />
            New
          </span>
          {showShortcuts ? <kbd className="text-xs text-muted-foreground">⌘N</kbd> : null}
        </Button>
        <Button className="w-full justify-between" variant="ghost" onClick={onSearch}>
          <span className="flex items-center gap-2">
            <SearchIcon className="size-4" />
            Search
          </span>
          {showShortcuts ? <kbd className="text-xs text-muted-foreground">⌘K</kbd> : null}
        </Button>
      </div>

      <ScrollArea className="min-w-0 flex-1 px-3">
        <nav className="flex min-w-0 flex-col gap-4 pb-3">
          {groups.map((group) => (
            <div key={group.id}>
              <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">{group.label}</p>
              <div className="flex min-w-0 flex-col gap-0.5">
                {group.items.map((thread) => (
                  <ContextMenu key={thread.id}>
                    <ContextMenuTrigger className="group relative flex min-w-0 items-center">
                      <Link
                        className="group/link flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 pr-2 text-sm group-hover:pr-8 hover:bg-orange-500/8 dark:hover:bg-orange-500/12 data-[active=true]:bg-orange-500/15 data-[active=true]:font-medium data-[active=true]:text-orange-950 data-[active=true]:hover:bg-orange-500/20 dark:data-[active=true]:bg-orange-500/22 dark:data-[active=true]:text-orange-50 dark:data-[active=true]:hover:bg-orange-500/30"
                        data-active={thread.id === activeChatId}
                        href={`/chat/${thread.id}`}
                      >
                        <span className="min-w-0 truncate">{thread.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground group-hover:hidden group-data-[active=true]/link:text-orange-600 dark:group-data-[active=true]/link:text-orange-400">
                          {formatThreadTime(thread.updatedAt)}
                        </span>
                      </Link>
                      <Button
                        className="absolute right-0 hidden shrink-0 group-hover:inline-flex"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => onDeleteThread(thread.id)}
                      >
                        &times;
                      </Button>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-40">
                      <ContextMenuGroup>
                        <ContextMenuItem onClick={() => onRenameThread(thread.id)}>
                          <PencilIcon />
                          Rename
                        </ContextMenuItem>
                      </ContextMenuGroup>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="flex items-center gap-1 p-3">
        <Button
          className="h-10 min-w-0 flex-1 justify-start gap-2.5 px-2"
          nativeButton={false}
          render={<Link href={profileHref} />}
          variant="ghost"
        >
          <Avatar>
            <AvatarImage alt={user?.name ?? "Account"} src={user?.image ?? undefined} />
            <AvatarFallback>{userInitial(user)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 truncate text-left font-medium">
            {user?.name?.trim() || "Profile"}
          </span>
        </Button>
        <Button
          aria-label="Leaderboard"
          className="shrink-0 text-muted-foreground"
          nativeButton={false}
          render={<Link href="/leaderboard" />}
          size="icon"
          variant="ghost"
        >
          <PodiumIcon className="size-4" />
        </Button>
        {showAdmin ? (
          <Button
            aria-label="Admin dashboard"
            className="shrink-0 text-muted-foreground"
            nativeButton={false}
            render={<Link href="/admin" />}
            size="icon"
            variant="ghost"
          >
            <ShieldIcon className="size-4" />
          </Button>
        ) : null}
        <Button
          aria-label="Settings"
          className="shrink-0 text-muted-foreground"
          nativeButton={false}
          render={<Link href="/settings" />}
          size="icon"
          variant="ghost"
        >
          <SettingsIcon className="size-4" />
        </Button>
      </div>
    </>
  );
}

export function AppShell({
  children,
  user: serverUser,
}: {
  children: React.ReactNode;
  user: ShellUser;
}) {
  const params = useParams<{ id?: string }>();
  const pathname = usePathname();
  const activeChatId = typeof params.id === "string" ? params.id : undefined;
  const queryClient = useQueryClient();

  const { threads } = useThreadList();
  const groups = useThreadGroups(threads);
  const { navigate, deleteThread } = useChatNavigation();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { width: sidebarWidth, startResize, onKeyDown: onResizeKeyDown, minWidth, maxWidth } =
    useSidebarResize();
  const { data: session } = authClient.useSession();
  const { data: adminAccess } = useAdminAccess();
  const user = session?.user ?? serverUser;
  const profileHref = useMemo(
    () => profilePathForEmail(user?.email) ?? "/settings",
    [user?.email],
  );
  const pageTitle = useMemo(
    () => mobilePageTitle({ pathname, activeChatId, threads }),
    [pathname, activeChatId, threads],
  );

  const startNewChat = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const renameThread = useCallback(
    (threadId: string) => {
      void requestThreadTitleGeneration(
        threadId,
        { mode: "refine", force: true },
        queryClient,
      );
    },
    [queryClient],
  );

  const handleDeleteThread = useCallback(
    (threadId: string) => {
      void deleteThread(threadId, activeChatId);
    },
    [deleteThread, activeChatId],
  );

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }

      if (event.key === "k") {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      }

      if (event.key === "n") {
        event.preventDefault();
        startNewChat();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [startNewChat]);

  const sidebarProps = {
    activeChatId,
    groups,
    user,
    profileHref,
    showAdmin: Boolean(adminAccess?.allowed),
    onNewChat: () => {
      setMobileNavOpen(false);
      startNewChat();
    },
    onSearch: () => {
      setMobileNavOpen(false);
      setPaletteOpen(true);
    },
    onDeleteThread: handleDeleteThread,
    onRenameThread: renameThread,
  };

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <CommandPalette onOpenChange={setPaletteOpen} open={paletteOpen} />

      <aside
        className="app-sidebar-frost relative hidden shrink-0 flex-col border-r border-black/[0.06] md:flex"
        style={{ width: sidebarWidth }}
      >
        <SidebarNav {...sidebarProps} showShortcuts />

        <div
          aria-label="Resize sidebar"
          aria-orientation="vertical"
          aria-valuemax={maxWidth}
          aria-valuemin={minWidth}
          aria-valuenow={sidebarWidth}
          className="absolute top-0 right-0 z-10 h-full w-1 translate-x-1/2 cursor-col-resize touch-none hover:bg-border/60 active:bg-border"
          onKeyDown={onResizeKeyDown}
          onMouseDown={startResize}
          role="separator"
          tabIndex={0}
        />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          className={cn(
            "app-sidebar-frost w-[min(20rem,85vw)] gap-0 p-0 sm:max-w-xs",
            "[&_[data-slot=sheet-close]]:top-3.5",
          )}
          side="left"
          showCloseButton
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Browse chats, open settings, or start a new conversation.
          </SheetDescription>
          <div className="flex h-full flex-col pt-10">
            <SidebarNav {...sidebarProps} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-2 border-b border-border/60 px-2 py-1.5 md:hidden">
          <Button
            aria-label="Open navigation"
            size="icon"
            variant="ghost"
            onClick={() => setMobileNavOpen(true)}
          >
            <MenuIcon className="size-5" />
          </Button>
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{pageTitle}</p>
        </header>

        <main className="min-h-0 min-w-0 flex-1 bg-background">{children}</main>
      </div>
    </div>
  );
}
