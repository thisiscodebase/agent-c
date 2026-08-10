"use client";

import { HELP_GUIDE_MARKDOWN, HELP_GUIDE_TITLE } from "#shared/help-guide";
import { ArtifactMarkdown } from "~/components/artifacts/artifact-markdown";

/** Full-page paper doc for the help / FAQ guide (same chrome language as Docs). */
export function HelpGuideView() {
  return (
    <article className="h-full overflow-y-auto" data-paper="peach">
      <div className="mx-auto w-full max-w-2xl px-6 pt-10 pb-24 text-sm sm:px-10">
        <p className="text-xs text-muted-foreground">Guide · FAQs</p>
        <h1 className="mt-3 mb-8 font-artifact-title text-4xl leading-[1.1] font-normal tracking-tight text-balance italic sm:text-5xl">
          {HELP_GUIDE_TITLE}
        </h1>
        <ArtifactMarkdown>{HELP_GUIDE_MARKDOWN}</ArtifactMarkdown>
      </div>
    </article>
  );
}
