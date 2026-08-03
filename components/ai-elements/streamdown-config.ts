import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import type { PluginConfig } from "streamdown";

// @streamdown/code pins shiki@3 while this app (and streamdown's types)
// resolve shiki@4 — BundledLanguage diverges and fails assignability.
export const streamdownPlugins = {
  cjk,
  code,
  math,
  mermaid,
} as PluginConfig;

export const streamdownAnimation = { animation: "blurIn" } as const;
