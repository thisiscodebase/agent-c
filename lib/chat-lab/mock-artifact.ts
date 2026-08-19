import type { Artifact } from "./types.ts";

export const MOCK_ARTIFACT_ID = "mock-artifact-1";

const MOCK_CONTENT = `# Acme Case Study

Acme expanded mentorship coverage across three cohorts this quarter.

## Outcomes

- 42 sessions booked
- NPS held at 72
- Two new mentors onboarded

## Next steps

Keep pairing velocity above six sessions per week.
`;

/** Seed document for the artifact scenario (offline detail panel). */
export function createMockArtifact(
  overrides?: Partial<Artifact>,
): Artifact {
  const now = Date.UTC(2026, 0, 15, 12, 0, 0);

  return {
    id: MOCK_ARTIFACT_ID,
    type: "case_study",
    title: "Acme mentorship case study",
    status: "draft",
    colour: "peach",
    size: new TextEncoder().encode(MOCK_CONTENT).byteLength,
    metadata: { mock: true },
    threadId: "mock-thread",
    createdAt: now,
    updatedAt: now,
    contentMarkdown: MOCK_CONTENT,
    authorName: "Chat Lab",
    ...overrides,
  };
}
