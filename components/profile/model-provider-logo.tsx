import { cn } from "~/lib/utils";

type ModelLogo = {
  src: string;
  alt: string;
  /** White/light logos need invert in light mode to show on pale backgrounds. */
  invertInLightMode?: boolean;
};

const PROVIDER_LOGOS: Record<string, ModelLogo> = {
  anthropic: { src: "/icons/claude.svg", alt: "Anthropic" },
  claude: { src: "/icons/claude.svg", alt: "Claude" },
  google: { src: "/icons/google.svg", alt: "Google" },
  gemini: { src: "/icons/google.svg", alt: "Google" },
  openai: { src: "/icons/openai.svg", alt: "OpenAI", invertInLightMode: true },
  xai: { src: "/icons/grok.svg", alt: "Grok", invertInLightMode: true },
  grok: { src: "/icons/grok.svg", alt: "Grok", invertInLightMode: true },
  cursor: { src: "/icons/cursor.svg", alt: "Cursor", invertInLightMode: true },
};

export function modelProviderFromId(modelId: string): string {
  const slash = modelId.indexOf("/");
  if (slash > 0) {
    return modelId.slice(0, slash).toLowerCase();
  }
  return modelId.toLowerCase();
}

export function logoForModelId(modelId: string): ModelLogo | null {
  const provider = modelProviderFromId(modelId);
  return PROVIDER_LOGOS[provider] ?? null;
}

/** Progress-bar / accent fill matching the model provider brand. */
export function modelBrandAccentClass(modelId: string): string {
  switch (modelProviderFromId(modelId)) {
    case "anthropic":
    case "claude":
      return "bg-[#D97757]";
    case "openai":
      return "bg-neutral-950 dark:bg-white";
    case "google":
    case "gemini":
      return "bg-[#4285F4]";
    case "xai":
    case "grok":
    case "cursor":
      return "bg-[#F54E00]";
    default:
      return "bg-foreground/35";
  }
}

export function ModelProviderLogo({
  modelId,
  label,
  className,
}: {
  modelId: string;
  label: string;
  className?: string;
}) {
  const logo = logoForModelId(modelId);

  if (!logo) {
    return (
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center text-sm font-semibold",
          className,
        )}
      >
        {label.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      alt={logo.alt}
      className={cn(
        "size-10 shrink-0 object-contain",
        logo.invertInLightMode && "invert dark:invert-0",
        className,
      )}
      src={logo.src}
    />
  );
}
