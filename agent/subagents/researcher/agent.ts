import { defineDynamic } from "eve";
import {
  LOOKUP_SUBAGENT_DESCRIPTIONS,
  resolveLookupSubagent,
} from "../../lib/lookup-subagent.js";

export default defineDynamic({
  events: {
    "session.started": (_event, ctx) =>
      resolveLookupSubagent(ctx, LOOKUP_SUBAGENT_DESCRIPTIONS.researcher),
  },
});
