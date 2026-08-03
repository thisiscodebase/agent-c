"use client";

import { FileTextIcon, FolderIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  countFilesUnder,
  formatFileDate,
  formatFileSize,
  itemName,
  type FileSystemFileItem,
  type FileSystemFolderItem,
  type FileSystemItem,
  type FolderContents,
} from "~/lib/file-system";
import { cn } from "~/lib/utils";

export interface FileBrowserViewProps {
  contents: FolderContents;
  items: FileSystemItem[];
  selectedPath?: string;
  onSelect: (item: FileSystemItem) => void;
  onOpen: (item: FileSystemItem) => void;
  renderFilePreview?: (file: FileSystemFileItem) => ReactNode;
}

/** Single click selects, double click opens — Finder's contract. */
function entryHandlers(
  item: FileSystemItem,
  { onSelect, onOpen }: Pick<FileBrowserViewProps, "onSelect" | "onOpen">,
) {
  return {
    onClick: () => onSelect(item),
    onDoubleClick: () => onOpen(item),
  };
}

function FolderTile({
  folder,
  fileCount,
  selected,
  ...handlers
}: {
  folder: FileSystemFolderItem;
  fileCount: number;
  selected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  return (
    <button
      className="group flex w-full flex-col items-center gap-2 rounded-lg p-2 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      data-selected={selected}
      title={itemName(folder)}
      type="button"
      {...handlers}
    >
      <FolderIcon className="size-20 fill-orange-300/70 stroke-orange-500/70 dark:fill-orange-400/25 dark:stroke-orange-300/60" />
      <span className="rounded px-1.5 py-0.5 text-xs break-words group-data-[selected=true]:bg-orange-500/20 group-data-[selected=true]:font-medium">
        {itemName(folder)}
      </span>
      <span className="-mt-1.5 text-[0.6875rem] text-muted-foreground">
        {fileCount === 1 ? "1 item" : `${fileCount} items`}
      </span>
    </button>
  );
}

function FileTile({
  file,
  selected,
  preview,
  ...handlers
}: {
  file: FileSystemFileItem;
  selected: boolean;
  preview: ReactNode;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  return (
    <button
      className="group flex w-full flex-col items-center gap-2 rounded-lg p-2 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      data-selected={selected}
      title={itemName(file)}
      type="button"
      {...handlers}
    >
      <div className="h-28 w-[5.5rem] overflow-hidden rounded-sm border border-border/70 shadow-sm group-data-[selected=true]:ring-2 group-data-[selected=true]:ring-orange-500/50">
        {preview ?? (
          <div className="flex size-full items-center justify-center bg-background">
            <FileTextIcon className="size-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <span className="rounded px-1.5 py-0.5 text-xs break-words group-data-[selected=true]:bg-orange-500/20 group-data-[selected=true]:font-medium">
        {itemName(file)}
      </span>
    </button>
  );
}

export function FileBrowserIconsView({
  contents,
  items,
  selectedPath,
  onSelect,
  onOpen,
  renderFilePreview,
}: FileBrowserViewProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2 p-3">
      {contents.folders.map((folder) => (
        <FolderTile
          fileCount={countFilesUnder(items, folder.path)}
          folder={folder}
          key={folder.path}
          selected={folder.path === selectedPath}
          {...entryHandlers(folder, { onSelect, onOpen })}
        />
      ))}

      {contents.files.map((file) => (
        <FileTile
          file={file}
          key={file.path}
          preview={renderFilePreview?.(file)}
          selected={file.path === selectedPath}
          {...entryHandlers(file, { onSelect, onOpen })}
        />
      ))}
    </div>
  );
}

function ListRow({
  item,
  selected,
  icon,
  kind,
  size,
  ...handlers
}: {
  item: FileSystemItem;
  selected: boolean;
  icon: ReactNode;
  kind: string;
  size: string;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  return (
    <tr
      className={cn(
        "cursor-default select-none",
        selected ? "bg-orange-500/15 font-medium" : "hover:bg-orange-500/8",
      )}
      {...handlers}
    >
      <td className="flex min-w-0 items-center gap-2 px-3 py-1.5">
        {icon}
        <span className="min-w-0 truncate">{itemName(item)}</span>
      </td>
      <td className="hidden px-3 py-1.5 text-muted-foreground sm:table-cell">{kind}</td>
      <td className="px-3 py-1.5 text-muted-foreground">{formatFileDate(item.updatedAt)}</td>
      <td className="hidden px-3 py-1.5 text-right text-muted-foreground sm:table-cell">{size}</td>
    </tr>
  );
}

export function FileBrowserListView({
  contents,
  selectedPath,
  onSelect,
  onOpen,
}: FileBrowserViewProps) {
  return (
    <table className="w-full table-fixed text-left text-sm">
      <thead className="sticky top-0 bg-background text-xs text-muted-foreground">
        <tr className="border-b border-border/60">
          <th className="px-3 py-1.5 font-medium">Name</th>
          <th className="hidden w-28 px-3 py-1.5 font-medium sm:table-cell">Kind</th>
          <th className="w-32 px-3 py-1.5 font-medium">Modified</th>
          <th className="hidden w-20 px-3 py-1.5 text-right font-medium sm:table-cell">Size</th>
        </tr>
      </thead>
      <tbody>
        {contents.folders.map((folder) => (
          <ListRow
            icon={<FolderIcon className="size-4 shrink-0 fill-orange-300/70 stroke-orange-500/70" />}
            item={folder}
            key={folder.path}
            kind="Folder"
            selected={folder.path === selectedPath}
            size="--"
            {...entryHandlers(folder, { onSelect, onOpen })}
          />
        ))}

        {contents.files.map((file) => (
          <ListRow
            icon={<FileTextIcon className="size-4 shrink-0 text-muted-foreground" />}
            item={file}
            key={file.path}
            kind="Document"
            selected={file.path === selectedPath}
            size={formatFileSize(file.size)}
            {...entryHandlers(file, { onSelect, onOpen })}
          />
        ))}
      </tbody>
    </table>
  );
}
