import { readFile } from "node:fs/promises";
import path from "node:path";
import { getComposerSkill } from "#shared/composer-skills";

export type ComposerSkillDetail = {
  id: string;
  label: string;
  description: string;
  bodyMarkdown: string;
};

function stripYamlFrontmatter(raw: string): string {
  if (!raw.startsWith("---")) return raw.trim();
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return raw.trim();
  return raw.slice(end + 4).replace(/^\s+/, "");
}

/**
 * Load a product skill's SKILL.md for the composer detail panel.
 * Only skills listed in `COMPOSER_SKILLS` are exposed.
 */
export async function loadComposerSkillDetail(
  id: string,
): Promise<ComposerSkillDetail | null> {
  const meta = getComposerSkill(id);
  if (!meta) return null;

  const skillPath = path.join(
    process.cwd(),
    "agent",
    "skills",
    id,
    "SKILL.md",
  );

  try {
    const raw = await readFile(skillPath, "utf8");
    return {
      id: meta.id,
      label: meta.label,
      description: meta.description,
      bodyMarkdown: stripYamlFrontmatter(raw),
    };
  } catch {
    return {
      id: meta.id,
      label: meta.label,
      description: meta.description,
      bodyMarkdown: `_${meta.description}_\n\nFull skill instructions are not available in this environment.`,
    };
  }
}
