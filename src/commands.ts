import fs from "fs-extra";
import path from "path";
import { parseSkillUrl } from "./parser.js";
import { cloneAndExtract } from "./git.js";
import { syncSkillFiles, removeInstalledSkill } from "./sync.js";
import {
  readSkillsJson,
  writeSkillsJson,
  SkillsJson,
} from "./store.js";

function getProjectRoot(): string {
  return process.cwd();
}

interface CommandOptions {
  dryRun?: boolean;
}

async function makeInstallState(root: string): Promise<{ installedSkills: Set<string> }> {
  const installedSkills = new Set<string>();

  // .agents/skills/<name>
  try {
    const skillsDir = path.join(root, ".agents", "skills");
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        installedSkills.add(e.name);
      }
    }
  } catch {
    // no .agents/skills dir, ignore
  }

  return { installedSkills };
}

async function installAllFromSkillsJson(
  skillsJson: SkillsJson,
  root: string,
  opts: CommandOptions
): Promise<void> {
  const names = Object.keys(skillsJson.skills);

  if (names.length === 0) {
    console.log("No skills declared in skills.json.");
    return;
  }

  const state = await makeInstallState(root);

  console.log(`Installing ${names.length} skill(s) declared in skills.json:`);

  for (const name of names) {
    const entry = skillsJson.skills[name];

    console.log(`\n> ${name}`);

    if (state.installedSkills.has(name)) {
      console.log(
        `Skill "${name}" is already installed. Use "spm update ${name}" to update.`
      );
      continue;
    }

    const sourceSpec = entry.subdir
      ? `${entry.source.replace("https://github.com/", "")}/tree/${entry.ref}/${entry.subdir}`
      : entry.source;

    await installOne(sourceSpec, skillsJson, root, opts, name);
  }
}

async function installOne(
  spec: string,
  skillsJson: SkillsJson,
  root: string,
  opts: CommandOptions,
  explicitName?: string
): Promise<void> {
  const { dryRun } = opts;

  let sourceSpec = spec;
  const looksLikeUrl = /^https?:\/\//.test(spec);

  if (!looksLikeUrl && skillsJson.skills[spec]) {
    const entry = skillsJson.skills[spec];
    sourceSpec = entry.subdir
      ? `${entry.source.replace("https://github.com/", "")}/tree/${entry.ref}/${entry.subdir}`
      : entry.source;
  }

  const source = parseSkillUrl(sourceSpec);
  const skillName = explicitName ?? source.name;

  console.log(`Installing skill "${skillName}" from ${source.repo}...`);

  // 注意：这里不再根据 skillsJson.skills[skillName] 判定“已安装”，
  // installAllFromSkillsJson 会使用 makeInstallState 预先处理磁盘状态。

  if (dryRun) {
    console.log("[DRY RUN] Would perform the following actions:");
    console.log(
      `  - Clone repo: https://github.com/${source.repo} (ref: ${source.ref})`
    );
    console.log(
      `  - Extract subdirectory: ${source.subdir || "(repository root)"}`
    );
    console.log(`  - Copy to: .agents/skills/${skillName}`);
    console.log(
      "  - Update skills.json"
    );
    return;
  }

  const { skillDir, commit, cleanup } = await cloneAndExtract(source);

  try {
    const { count } = await syncSkillFiles(skillDir, root, skillName);

    skillsJson.skills[skillName] = {
      source: `https://github.com/${source.repo}`,
      subdir: source.subdir,
      ref: source.ref,
      commit,
    };
    await writeSkillsJson(root, skillsJson);

    console.log(`Installed "${skillName}" (${commit.slice(0, 7)})`);
    if (count > 0) {
      console.log(`Synced ${count} file(s).`);
    }
  } finally {
    await cleanup();
  }
}

// ─── install ────────────────────────────────────────────────────────

export async function install(
  spec: string | undefined,
  opts: CommandOptions = {}
): Promise<void> {
  const root = getProjectRoot();
  const skillsJsonPath = path.join(root, "skills.json");

  if (!(await fs.pathExists(skillsJsonPath))) {
    console.log("No skills.json found in current directory.");
    console.log("Run `spm init` first to initialize the project.");
    return;
  }

  const skillsJson = await readSkillsJson(root);

  if (!spec) {
    await installAllFromSkillsJson(skillsJson, root, opts);
    return;
  }

  await installOne(spec, skillsJson, root, opts);
}

// ─── remove ─────────────────────────────────────────────────────────

export async function remove(name: string, opts: CommandOptions = {}): Promise<void> {
  const root = getProjectRoot();
  const { dryRun } = opts;
  const skillsJson = await readSkillsJson(root);

  if (!skillsJson.skills[name]) {
    console.error(`Skill "${name}" is not installed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`Removing skill "${name}"...`);

  if (dryRun) {
    console.log(`[DRY RUN] Would remove skill "${name}"`);
    console.log(`  - Remove directory: .agents/skills/${name}`);
    console.log("  - Update skills.json (remove entry)");
    return;
  }

  // Remove installed skill directory
  await removeInstalledSkill(root, name);

  // Update skills.json
  delete skillsJson.skills[name];
  await writeSkillsJson(root, skillsJson);

  console.log(`Removed "${name}".`);
}

// ─── update ─────────────────────────────────────────────────────────

export async function update(name: string, opts: CommandOptions = {}): Promise<void> {
  const root = getProjectRoot();
  const { dryRun } = opts;
  const skillsJson = await readSkillsJson(root);
  const entry = skillsJson.skills[name];

  if (!entry) {
    console.error(`Skill "${name}" is not installed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`Updating skill "${name}"...`);

  const source = parseSkillUrl(
    entry.subdir
      ? `${entry.source.replace("https://github.com/", "")}/tree/${entry.ref}/${entry.subdir}`
      : entry.source
  );

  if (dryRun) {
    console.log(`[DRY RUN] Updating skill "${name}"...`);
    console.log(`  - Current commit: ${entry.commit}`);
    console.log(`  - Repo: ${source.repo} (ref: ${source.ref})`);
    console.log(
      `  - Subdirectory: ${source.subdir || "(repository root)"}`
    );

    const { commit, cleanup } = await cloneAndExtract(source);
    try {
      if (commit === entry.commit) {
        console.log(
          `  - Already up to date (${commit.slice(0, 7)}), no file changes.`
        );
      } else {
        console.log(`  - New commit: ${commit.slice(0, 7)}`);
        console.log("  - Would perform:");
        console.log(`      • Remove .agents/skills/${name}`);
        console.log("      • Re-sync .agents/skills/<name>");
        console.log("      • Update skills.json");
      }
    } finally {
      await cleanup();
    }
    return;
  }

  // Clone fresh
  const { skillDir, commit, cleanup } = await cloneAndExtract(source);

  try {
    if (commit === entry.commit) {
      console.log(`"${name}" is already up to date (${commit.slice(0, 7)}).`);
      return;
    }

    // Remove old installed directory before re-syncing.
    await removeInstalledSkill(root, name);

    // Re-sync
    const { count } = await syncSkillFiles(skillDir, root, name);

    // Update skills.json
    skillsJson.skills[name] = { ...entry, commit };
    await writeSkillsJson(root, skillsJson);

    console.log(`Updated "${name}" to ${commit.slice(0, 7)}.`);
    if (count > 0) {
      console.log(`Synced ${count} file(s).`);
    }
  } finally {
    await cleanup();
  }
}

// ─── init ───────────────────────────────────────────────────────────

export async function init(): Promise<void> {
  const root = getProjectRoot();
  const skillsJsonPath = path.join(root, "skills.json");

  if (await fs.pathExists(skillsJsonPath)) {
    console.log("skills.json already exists, nothing to do.");
  } else {
    await writeSkillsJson(root, { skills: {} });
    console.log("Created skills.json");
  }
}

// ─── list ───────────────────────────────────────────────────────────

export async function list(): Promise<void> {
  const root = getProjectRoot();
  const skillsJson = await readSkillsJson(root);
  const names = Object.keys(skillsJson.skills);

  if (names.length === 0) {
    console.log("No skills installed.");
    return;
  }

  console.log(`Installed skills (${names.length}):\n`);
  for (const name of names) {
    const s = skillsJson.skills[name];
    const sub = s.subdir ? ` (${s.subdir})` : "";
    console.log(`  ${name}  ${s.source}${sub}  @${s.commit.slice(0, 7)}`);
  }
}
