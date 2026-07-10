import { defineAgent } from "eve";
import { CHAT_MODEL } from "../shared/models.js";

export default defineAgent({
  model: CHAT_MODEL,
});
