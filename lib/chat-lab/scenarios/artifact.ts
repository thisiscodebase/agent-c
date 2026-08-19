import { createMockArtifact, MOCK_ARTIFACT_ID } from "../mock-artifact.ts";
import { beginTurn, endTurn } from "../dsl.ts";
import type { ChatLabScenario } from "../types.ts";

const userMessage = "Write up the Acme mentorship work as a case study.";
const artifact = createMockArtifact();

export const artifactScenario: ChatLabScenario = {
  id: "artifact",
  label: "Artifact",
  description: "create_artifact pending card → cover card (panel works offline)",
  userMessage,
  artifactIds: [MOCK_ARTIFACT_ID],
  events: endTurn(
    beginTurn(userMessage)
      .streamReasoning(
        "## Writing document\nI’ll turn the session notes into a short case study: outcomes, coverage risk, and next steps. Saving it as a draft you can open from the card.",
      )
      .artifactCall({
        id: artifact.id,
        title: artifact.title,
        type: artifact.type,
        status: artifact.status,
        colour: artifact.colour,
        contentMarkdown: artifact.contentMarkdown,
      })
      .nextStep()
      .streamText(
        `Saved a draft case study covering Acme’s mentorship outcomes, the March coverage risk, and what to do next.

Open the card to review the body — it’s still a draft, so nothing has been shared yet.`,
      ),
  ),
};
