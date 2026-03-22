import fs from "fs-extra";
import path from "path";

export interface SkillEntry {
  source: string;
  subdir: string;
  ref: string;
  commit: string;
}

export interface SkillsJson {
  skills: Record<string, SkillEntry>;
}

const SKILLS_JSON = "skills.json";

// --- skills.json ---

export async function readSkillsJson(projectRoot: string): Promise<SkillsJson> {
  const p = path.join(projectRoot, SKILLS_JSON);
  if (await fs.pathExists(p)) {
    return fs.readJson(p);
  }
  return { skills: {} };
}

export async function writeSkillsJson(
  projectRoot: string,
  data: SkillsJson
): Promise<void> {
  const p = path.join(projectRoot, SKILLS_JSON);
  await fs.writeJson(p, data, { spaces: 2 });
}
