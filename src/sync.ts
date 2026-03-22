import fs from "fs-extra";
import path from "path";

const AGENTS_SKILLS_ROOT = path.join(".agents", "skills");

export interface SyncResult {
  /** Number of files written */
  count: number;
}

/**
 * Sync a skill directory into .agents/skills/<skillName>.
 */
export async function syncSkillFiles(
  skillDir: string,
  projectRoot: string,
  skillName: string
): Promise<SyncResult> {
  let count = 0;
  const entries = await walkDir(skillDir);

  for (const relPath of entries) {
    const srcFile = path.join(skillDir, relPath);
    const destRelPath = path.join(AGENTS_SKILLS_ROOT, skillName, relPath);
    const destFile = path.join(projectRoot, destRelPath);

    await fs.ensureDir(path.dirname(destFile));
    await fs.copy(srcFile, destFile, { overwrite: false });

    count += 1;
  }

  return { count };
}

/**
 * Remove an installed skill directory under .agents/skills/<skillName>.
 */
export async function removeInstalledSkill(
  projectRoot: string,
  skillName: string
): Promise<void> {
  const absPath = path.join(projectRoot, AGENTS_SKILLS_ROOT, skillName);
  await fs.remove(absPath);

  // Clean up empty directories
  const absDir = path.join(projectRoot, AGENTS_SKILLS_ROOT);
  if (await fs.pathExists(absDir)) {
    await removeEmptyDirs(absDir);
  }
}

/** Recursively list all files under a directory, returning relative paths */
async function walkDir(dir: string, base = ""): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = path.join(base, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkDir(path.join(dir, entry.name), rel)));
    } else {
      results.push(rel);
    }
  }
  return results;
}

/** Remove empty directories recursively (bottom-up) */
async function removeEmptyDirs(dir: string): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await removeEmptyDirs(path.join(dir, entry.name));
    }
  }
  // Re-read after cleaning children
  const remaining = await fs.readdir(dir);
  if (remaining.length === 0) {
    await fs.remove(dir);
  }
}
