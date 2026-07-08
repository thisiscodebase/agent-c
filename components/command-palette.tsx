"use client";

import { PlusIcon, SettingsIcon, MessageSquareIcon, PlugIcon } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "~/components/ui/command";
import { useChatNavigation } from "~/hooks/chat/use-chat-navigation";
import { useThreadList } from "~/hooks/chat/use-threads";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { threads } = useThreadList();
  const { navigate } = useChatNavigation();

  function go(to: string) {
    onOpenChange(false);
    navigate(to);
  }

  return (
    <CommandDialog onOpenChange={onOpenChange} open={open}>
      <CommandInput placeholder="Type a command or search chats…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go("/")}>
            <PlusIcon />
            New chat
          </CommandItem>
          <CommandItem onSelect={() => go("/settings/profile")}>
            <SettingsIcon />
            Profile settings
          </CommandItem>
          <CommandItem onSelect={() => go("/settings/integrations")}>
            <PlugIcon />
            Integrations
          </CommandItem>
        </CommandGroup>
        {threads.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Chats">
              {threads.map((thread) => (
                <CommandItem key={thread.id} value={thread.title} onSelect={() => go(`/chat/${thread.id}`)}>
                  <MessageSquareIcon />
                  {thread.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
      <div className="flex items-center justify-end border-t px-3 py-2">
        <CommandShortcut>⌘K</CommandShortcut>
      </div>
    </CommandDialog>
  );
}
