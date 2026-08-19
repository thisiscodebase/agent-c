import type { ChatStatus } from "ai";
import type { EveAgentReducerEvent, EveMessage } from "eve/react";

export type ChatLabCheckpointKind =
  | "submitted"
  | "reasoning"
  | "tool"
  | "hitl"
  | "text"
  | "complete"
  | "error";

export type ChatLabCheckpoint = {
  kind: ChatLabCheckpointKind;
  /** Event index after which this checkpoint is reached (exclusive upper bound for seek). */
  index: number;
  label: string;
};

/** Minimal artifact shape for seeding React Query (mirrors shared Artifact). */
export type ChatLabArtifact = {
  id: string;
  type: "case_study" | "report" | "summary" | "note";
  title: string;
  status: "draft" | "review" | "published";
  colour: "white" | "peach" | "green" | "lilac";
  size: number;
  metadata: Record<string, unknown>;
  threadId?: string;
  createdAt: number;
  updatedAt: number;
  contentMarkdown: string;
  authorName: string;
};

/** @deprecated Prefer ChatLabArtifact — kept for local mock helpers. */
export type Artifact = ChatLabArtifact;

export type ChatLabScenario = {
  id: string;
  label: string;
  description: string;
  /** Default user line shown when launching without typing. */
  userMessage: string;
  events: readonly EveAgentReducerEvent[];
  /** Artifact ids that should be seeded into React Query when this scenario runs. */
  artifactIds?: readonly string[];
  /**
   * Extra events appended after HITL Approve (excluding client.input.responded,
   * which the controller injects from the user's choice).
   */
  afterHitlApprove?: readonly EveAgentReducerEvent[];
  /** Extra events appended after HITL Deny. */
  afterHitlDeny?: readonly EveAgentReducerEvent[];
};

export type ChatLabSnapshot = {
  messages: readonly EveMessage[];
  status: ChatStatus;
  events: readonly EveAgentReducerEvent[];
  index: number;
  currentEventType: string | null;
  checkpoints: readonly ChatLabCheckpoint[];
  waitingForHitl: boolean;
};

export type ChatLabSpeed = 0.25 | 0.5 | 1 | 2 | 4;
