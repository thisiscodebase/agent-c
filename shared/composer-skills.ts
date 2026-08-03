/**
 * Product skills exposed in the chat composer `/` picker.
 * `id` must match the Eve skill name under `agent/skills/`.
 * Cursor/dev packs (shadcn, migrate-*) are intentionally omitted.
 *
 * `icon` keys are resolved to Lucide icons in `lib/composer-skill-icons.tsx`.
 */
export type ComposerSkillIcon = "file-pen-line";

export type ComposerSkill = {
  id: string;
  label: string;
  description: string;
  icon: ComposerSkillIcon;
  /** Plain text expanded into the outbound message when the mention is sent. */
  prompt: string;
};

export const COMPOSER_SKILLS: readonly ComposerSkill[] = [
  {
    id: "bid-writing",
    label: "Bid Writer",
    description:
      "Draft or improve UK public tender, PQQ, ITT, or grant responses",
    icon: "file-pen-line",
    prompt: "Use the bid-writing skill.",
  },
] as const;

export function filterComposerSkills(query: string): ComposerSkill[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...COMPOSER_SKILLS];
  return COMPOSER_SKILLS.filter(
    (skill) =>
      skill.id.toLowerCase().includes(q) ||
      skill.label.toLowerCase().includes(q) ||
      skill.description.toLowerCase().includes(q),
  );
}

export function getComposerSkill(id: string): ComposerSkill | undefined {
  return COMPOSER_SKILLS.find((skill) => skill.id === id);
}
