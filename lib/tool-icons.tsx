import type { LucideIcon } from "lucide-react";
import {
  BrainIcon,
  Building2Icon,
  Code2Icon,
  GlobeIcon,
  InfoIcon,
  MessageCircleQuestionIcon,
  NotebookPenIcon,
  SquareArrowOutUpRightIcon,
  ToolCaseIcon,
  WrenchIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

export type ToolIconProps = {
  size?: number;
  className?: string;
  showBackground?: boolean;
};

type LucideIconConfig = {
  kind: "lucide";
  icon: LucideIcon;
  bgClass: string;
  iconClass: string;
};

type ImageIconConfig = {
  kind: "image";
  src: string;
  bgClass: string;
  alt: string;
  /**
   * Classes on the `<img>` itself. Use for monochrome logos that need a
   * dark-mode treatment (e.g. `dark:invert`) instead of a separate asset.
   */
  imgClass?: string;
};

type IconConfig = LucideIconConfig | ImageIconConfig;

const iconConfigs: Record<string, IconConfig> = {
  development: {
    kind: "lucide",
    icon: Code2Icon,
    bgClass: "bg-cyan-500/15",
    iconClass: "text-cyan-600 dark:text-cyan-400",
  },
  todos: {
    kind: "lucide",
    icon: NotebookPenIcon,
    bgClass: "bg-amber-500/15",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  memory: {
    kind: "lucide",
    icon: BrainIcon,
    bgClass: "bg-indigo-500/15",
    iconClass: "text-indigo-600 dark:text-indigo-400",
  },
  reasoning: {
    kind: "lucide",
    icon: BrainIcon,
    bgClass: "bg-pink-500/15",
    iconClass: "text-pink-600 dark:text-pink-400",
  },
  question: {
    kind: "lucide",
    icon: MessageCircleQuestionIcon,
    bgClass: "bg-violet-500/15",
    iconClass: "text-violet-600 dark:text-violet-400",
  },
  approval: {
    kind: "lucide",
    icon: MessageCircleQuestionIcon,
    bgClass: "bg-amber-500/15",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  search: {
    kind: "lucide",
    icon: GlobeIcon,
    bgClass: "bg-sky-500/15",
    iconClass: "text-sky-600 dark:text-sky-400",
  },
  web_search: {
    kind: "lucide",
    icon: GlobeIcon,
    bgClass: "bg-sky-500/15",
    iconClass: "text-sky-600 dark:text-sky-400",
  },
  handoff: {
    kind: "lucide",
    icon: SquareArrowOutUpRightIcon,
    bgClass: "bg-sky-500/15",
    iconClass: "text-sky-600 dark:text-sky-400",
  },
  retrieve_tools: {
    kind: "lucide",
    icon: ToolCaseIcon,
    bgClass: "bg-taupe-500/15",
    iconClass: "text-taupe-600 dark:text-taupe-400",
  },
  general: {
    kind: "lucide",
    icon: InfoIcon,
    bgClass: "bg-muted",
    iconClass: "text-muted-foreground",
  },
  unknown: {
    kind: "lucide",
    icon: WrenchIcon,
    bgClass: "bg-muted",
    iconClass: "text-muted-foreground",
  },
  hubspot: {
    kind: "image",
    src: "/icons/hubspot.svg",
    bgClass: "bg-orange-500/10",
    alt: "HubSpot",
  },
  notion: {
    kind: "image",
    src: "/icons/notion.svg",
    bgClass: "bg-neutral-500/15",
    alt: "Notion",
  },
  slack: {
    kind: "image",
    src: "/icons/slack.svg",
    bgClass: "bg-[#4A154B]/75",
    alt: "Slack",
  },
  drive: {
    kind: "image",
    src: "/icons/drive.svg",
    bgClass: "bg-blue-500/10",
    alt: "Google Drive",
  },
  tally: {
    kind: "image",
    src: "/icons/tally.svg",
    bgClass: "bg-neutral-500/15",
    alt: "Tally",
    // Monochrome black mark → white in dark mode without a second asset
    imgClass: "dark:invert",
  },
  platform: {
    kind: "lucide",
    icon: Building2Icon,
    bgClass: "bg-emerald-500/15",
    iconClass: "text-emerald-700 dark:text-emerald-400",
  },
};

/** Brand shell tint for connectors (shared by tool activity + citation UI). */
export function getBrandTintClass(category: string): string {
  const config = iconConfigs[normalizeCategory(category)];
  if (config?.kind === "image") return config.bgClass;
  if (config?.kind === "lucide") return config.bgClass;
  return "bg-muted";
}

/** Optional `<img>` classes for brand marks (e.g. dark:invert). */
export function getBrandImgClass(category: string): string | undefined {
  const config = iconConfigs[normalizeCategory(category)];
  if (config?.kind === "image") return config.imgClass;
  return undefined;
}

function normalizeCategory(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function IconShell({
  size,
  showBackground,
  bgClass,
  children,
  className,
}: {
  size: number;
  showBackground: boolean;
  bgClass: string;
  children: ReactNode;
  className?: string;
}) {
  if (!showBackground) return <>{children}</>;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md",
        bgClass,
        className,
      )}
      style={{ width: size + 8, height: size + 8 }}
    >
      {children}
    </span>
  );
}

/**
 * Render a tool-category icon (lucide or brand image).
 */
export function getToolCategoryIcon(
  category: string,
  props: ToolIconProps = {},
  iconUrl?: string | null,
): ReactNode {
  const { size = 16, className, showBackground = true } = props;
  const key = normalizeCategory(category);
  const config = iconConfigs[key];

  if (!config) {
    if (iconUrl) {
      return (
        <IconShell bgClass="bg-muted" showBackground={showBackground} size={size} className={className}>
          <img alt={`${category} icon`} className="object-contain" height={size} src={iconUrl} width={size} />
        </IconShell>
      );
    }
    const Fallback = WrenchIcon;
    return (
      <IconShell bgClass="bg-muted" showBackground={showBackground} size={size} className={className}>
        <Fallback className={cn("text-muted-foreground", className)} size={size} />
      </IconShell>
    );
  }

  if (config.kind === "image") {
    return (
      <IconShell bgClass={config.bgClass} showBackground={showBackground} size={size} className={className}>
        <img
          alt={config.alt}
          className={cn("object-contain", config.imgClass)}
          height={size}
          src={config.src}
          width={size}
        />
      </IconShell>
    );
  }

  const Icon = config.icon;
  return (
    <IconShell bgClass={config.bgClass} showBackground={showBackground} size={size} className={className}>
      <Icon className={cn(config.iconClass, className)} size={size} />
    </IconShell>
  );
}
