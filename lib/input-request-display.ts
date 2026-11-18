import type { EveToolPart } from "eve/react";
import type { Interaction } from "eve/react";

type InputRequest = Interaction["request"];

function resolveOptionLabel(
  request: InputRequest | undefined,
  optionId: string | undefined,
  text: string | undefined,
): string | undefined {
  const selectedOption = request?.options?.find((option) => option.id === optionId);
  return selectedOption?.label ?? text ?? optionId;
}

/** True while the runtime is waiting for a person to answer this call. */
export function isInputRequestPending(part: EveToolPart): boolean {
  return part.interaction?.status === "open";
}

/**
 * Label shown after an approval or question is answered.
 * The deciding answer lives on the interaction; a declined call has no option label.
 */
export function getInputRequestResponseLabel(part: EveToolPart): string | undefined {
  const interaction = part.interaction;
  const request = interaction?.request;
  const answer = interaction?.answer;

  if (answer) {
    return resolveOptionLabel(request, answer.optionId, answer.text ?? answer.optionId);
  }

  if (interaction?.outcome === "declined" || part.state === "rejected") {
    return "Declined";
  }

  if (interaction?.status === "settled" || part.state === "completed") {
    return "Answered";
  }

  return undefined;
}
