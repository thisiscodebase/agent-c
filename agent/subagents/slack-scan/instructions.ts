import { defineDynamic, defineInstructions } from "eve/instructions";
import { getSlackScanInstructions } from "../../lib/lookup-instructions.js";

export default defineDynamic({
  events: {
    "session.started": () =>
      defineInstructions({ markdown: getSlackScanInstructions() }),
  },
});
