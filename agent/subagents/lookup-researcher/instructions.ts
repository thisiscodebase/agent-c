import { defineDynamic, defineInstructions } from "eve/instructions";
import { getResearcherInstructions } from "../../lib/lookup-instructions.js";

export default defineDynamic(() =>
  defineInstructions({ content: getResearcherInstructions() }),
);
