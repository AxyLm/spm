import { execa } from "execa";
import fs from "fs-extra";
import path from "path";
import os from "os";
import type { ParsedSkillSource } from "./parser.js";

/**
 * Clone a repo (shallow), checkout the ref, and extract the subdir.
 * Returns the path to the extracted skill directory (a temp location).
 */
export async function cloneAndExtract(
  source: ParsedSkillSource
): Promise<{ skillDir: string; commit: string; cleanup: () => Promise<void> }> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "spm-"));

  try {
    // Shallow clone — try specified ref first, fall back to default branch
    try {
      await execa("git", [
        "clone",
        "--depth=1",
        "--branch",
        source.ref,
        source.repoUrl,
        tmpDir,
      ]);
    } catch {
      // ref not found — clone without --branch to get default branch
      await fs.remove(tmpDir);
      await fs.mkdirp(tmpDir);
      await execa("git", [
        "clone",
        "--depth=1",
        source.repoUrl,
        tmpDir,
      ]);
    }

    // Get the commit hash
    const { stdout: commit } = await execa("git", ["rev-parse", "HEAD"], {
      cwd: tmpDir,
    });

    // Determine skill source path
    const skillSrc = source.subdir
      ? path.join(tmpDir, source.subdir)
      : tmpDir;

    if (!(await fs.pathExists(skillSrc))) {
      throw new Error(
        `Subdirectory "${source.subdir}" not found in ${source.repo}`
      );
    }

    return {
      skillDir: skillSrc,
      commit: commit.trim(),
      cleanup: async () => {
        await fs.remove(tmpDir);
      },
    };
  } catch (err) {
    await fs.remove(tmpDir);
    throw err;
  }
}
