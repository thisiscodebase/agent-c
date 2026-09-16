"use client";

import type { FC, ReactNode } from "react";
import {
  ArchiveIcon,
  FileCodeIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  MusicIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { cn } from "~/lib/utils";

export interface UploadedFile {
  id: string;
  url: string;
  name: string;
  type: string;
  description?: string;
  isUploading?: boolean;
}

export interface FilePreviewProps {
  files: UploadedFile[];
  onRemove?: (id: string) => void;
  className?: string;
  /** Card row alignment. Composer is start; user bubbles are end. */
  align?: "start" | "end";
}

function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
}

function getFileIcon(fileType: string, fileName: string): ReactNode {
  const extension = getFileExtension(fileName).toLowerCase();
  const iconClass = "size-6";

  if (fileType.startsWith("image/")) {
    return <ImageIcon className={cn(iconClass, "text-emerald-500 dark:text-emerald-400")} />;
  }

  if (fileType === "application/pdf" || extension === "pdf") {
    return <FileTextIcon className={cn(iconClass, "text-red-500 dark:text-red-400")} />;
  }

  if (
    ["doc", "docx", "odt", "rtf"].includes(extension)
    || fileType.includes("wordprocessing")
    || fileType.includes("msword")
  ) {
    return <FileTextIcon className={cn(iconClass, "text-blue-500 dark:text-blue-400")} />;
  }

  if (
    ["xls", "xlsx", "csv", "ods"].includes(extension)
    || fileType.includes("spreadsheet")
    || fileType.includes("excel")
    || fileType === "text/csv"
    || fileType === "application/csv"
  ) {
    return (
      <FileSpreadsheetIcon className={cn(iconClass, "text-green-500 dark:text-green-400")} />
    );
  }

  if (["txt", "md", "markdown"].includes(extension) || fileType === "text/plain") {
    return <FileTextIcon className={cn(iconClass, "text-zinc-500 dark:text-zinc-400")} />;
  }

  if (
    ["js", "ts", "jsx", "tsx", "py", "java", "c", "cpp", "html", "css", "json", "xml", "yaml", "yml"].includes(extension)
    || fileType.includes("javascript")
    || fileType.includes("typescript")
    || fileType === "application/json"
  ) {
    return <FileCodeIcon className={cn(iconClass, "text-yellow-500 dark:text-yellow-400")} />;
  }

  if (fileType.startsWith("video/") || ["mp4", "avi", "mov", "mkv"].includes(extension)) {
    return <VideoIcon className={cn(iconClass, "text-purple-500 dark:text-purple-400")} />;
  }

  if (fileType.startsWith("audio/") || ["mp3", "wav", "ogg"].includes(extension)) {
    return <MusicIcon className={cn(iconClass, "text-pink-500 dark:text-pink-400")} />;
  }

  if (
    ["zip", "rar", "tar", "gz", "7z"].includes(extension)
    || fileType.includes("archive")
    || fileType.includes("compressed")
  ) {
    return <ArchiveIcon className={cn(iconClass, "text-amber-500 dark:text-amber-400")} />;
  }

  return <FileIcon className={cn(iconClass, "text-zinc-500 dark:text-zinc-400")} />;
}

function getFormattedFileType(fileType: string, fileName: string): string {
  const ext = getFileExtension(fileName).toUpperCase();

  if (fileType.includes("msword") || fileType.includes("wordprocessing")) {
    return "DOC";
  }

  if (fileType.includes("spreadsheet") || fileType.includes("excel")) {
    return "SPREADSHEET";
  }

  if (fileType === "text/csv" || fileType === "application/csv" || ext === "CSV") {
    return "CSV";
  }

  const typePart = fileType.split("/")[1];

  if (!typePart || typePart === "octet-stream") {
    return ext || "FILE";
  }

  const cleanType = typePart
    .replace("vnd.openxmlformats-officedocument.", "")
    .replace("vnd.ms-", "")
    .replace("x-", "")
    .replace("document.", "")
    .replace("presentation.", "")
    .replace("application.", "")
    .split(".")[0];

  return (cleanType || ext || "FILE").toUpperCase().substring(0, 8);
}

/** GAIA-style attachment cards with type icons, image thumbs, and optional remove. */
export const FilePreview: FC<FilePreviewProps> = ({
  files,
  onRemove,
  className,
  align = "start",
}) => {
  if (files.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={cn(
          "flex flex-wrap gap-2",
          align === "end" ? "justify-end" : "justify-start",
        )}
      >
        {files.map((file) => {
          const isImage = file.type.startsWith("image/") && Boolean(file.url);

          return (
            <div
              key={file.id}
              className={cn(
                "group/file relative flex items-center rounded-xl transition-all",
                "bg-muted hover:bg-muted/80",
                isImage
                  ? "h-14 w-14 justify-center"
                  : cn("min-w-[180px] max-w-[220px] p-2", onRemove && "pr-8"),
              )}
            >
              {file.isUploading ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/30">
                  <Loader2Icon className="size-5 animate-spin text-white" />
                </div>
              ) : null}

              {onRemove ? (
                <button
                  aria-label={`Remove ${file.name}`}
                  className={cn(
                    "absolute -top-1 -right-1 z-10 flex size-5 items-center justify-center rounded-full",
                    "scale-75 opacity-0 transition-all duration-150",
                    "group-hover/file:scale-100 group-hover/file:opacity-100",
                    "cursor-pointer bg-zinc-400 hover:bg-zinc-500 dark:bg-zinc-500 dark:hover:bg-zinc-400",
                  )}
                  type="button"
                  onClick={() => onRemove(file.id)}
                >
                  <XIcon className="size-2.5 text-white" />
                </button>
              ) : null}

              {isImage ? (
                <div className="size-12 overflow-hidden rounded-md">
                  <img
                    alt={file.name}
                    className="size-full object-cover"
                    height={48}
                    src={file.url}
                    width={48}
                  />
                </div>
              ) : (
                <>
                  <div className="mr-3 flex size-10 items-center justify-center rounded-lg bg-background/70">
                    {getFileIcon(file.type, file.name)}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate text-sm font-medium text-foreground">
                      {file.name.length > 18
                        ? `${file.name.substring(0, 15)}...`
                        : file.name}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {getFormattedFileType(file.type, file.name)}
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
