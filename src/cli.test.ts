import { describe, it, expect, beforeEach } from "vitest";
import { execa } from "execa";
import path from "path";
import fs from "fs-extra";

const CLI_PATH = path.join(__dirname, "../dist/cli.mjs");
const CACHE_ROOT = path.join(__dirname, "../.cache/cli-tests");

async function runCli(args: string[], cwd: string) {
  return execa("node", [CLI_PATH, ...args], {
    cwd,
    reject: false,
    timeout: 2000,
  });
}

async function writeFakeInstalledSkill(projectRoot: string, name = "demo-skill") {
  await fs.ensureDir(projectRoot);

  await fs.writeJson(
    path.join(projectRoot, "skills.json"),
    {
      skills: {
        [name]: {
          source: "https://github.com/example/repo",
          subdir: "",
          ref: "main",
          commit: "deadbeef",
        },
      },
    },
    { spaces: 2 }
  );

  await fs.outputFile(
    path.join(projectRoot, ".agents", "skills", name, "SKILL.md"),
    "content"
  );
}

describe("spm CLI", () => {
  beforeEach(async () => {
    await fs.emptyDir(CACHE_ROOT);
  });

  it("supports install alias i", async () => {
    const { stdout } = await execa("node", [CLI_PATH, "i", "--help"]);
    expect(stdout).toMatch(/Usage: spm install\|i/);
  });

  it("shows top-level help on unknown command", async () => {
    const { stdout } = await execa("node", [CLI_PATH, "xxx"], {
      reject: false,
    });
    expect(stdout).toMatch(/Usage: spm \[options] \[command]/);
    expect(stdout).toMatch(/install\|i \[source]/);
    expect(stdout).not.toMatch(/agents/);
  });

  it("runs init and list in an empty project", async () => {
    const projectRoot = path.join(CACHE_ROOT, "project");
    await fs.ensureDir(projectRoot);

    const initResult = await runCli(["init"], projectRoot);
    expect(initResult.stdout).toMatch(/Created skills.json|already exists/);
    expect(await fs.pathExists(path.join(projectRoot, "skills.json"))).toBe(
      true
    );

    const listResult = await runCli(["list"], projectRoot);
    expect(listResult.stdout.trim()).toBe("No skills installed.");
  });

  it("init is idempotent when skills.json already exists", async () => {
    const projectRoot = path.join(CACHE_ROOT, "init-idempotent");
    await fs.ensureDir(projectRoot);

    await runCli(["init"], projectRoot);
    const firstContent = await fs.readFile(
      path.join(projectRoot, "skills.json"),
      "utf8"
    );

    const second = await runCli(["init"], projectRoot);
    expect(second.stdout.trim()).toBe(
      "skills.json already exists, nothing to do."
    );

    const secondContent = await fs.readFile(
      path.join(projectRoot, "skills.json"),
      "utf8"
    );
    expect(secondContent).toBe(firstContent);
  });

  it("install without skills.json suggests running init", async () => {
    const projectRoot = path.join(CACHE_ROOT, "no-skills-json");
    await fs.ensureDir(projectRoot);

    const { stdout } = await runCli(["install"], projectRoot);

    expect(stdout).toMatch(/No skills.json found in current directory./);
    expect(stdout).toMatch(/Run `spm init` first/);
  });

  it("install with skills.json but no declared skills reports empty", async () => {
    const projectRoot = path.join(CACHE_ROOT, "install-empty-skills");
    await fs.ensureDir(projectRoot);

    await fs.writeJson(
      path.join(projectRoot, "skills.json"),
      { skills: {} },
      { spaces: 2 }
    );

    const { stdout } = await runCli(["install"], projectRoot);

    expect(stdout.trim()).toBe("No skills declared in skills.json.");
  });

  it("install with no args respects disk install state", async () => {
    const projectRoot = path.join(CACHE_ROOT, "install-from-skills-json");
    await fs.ensureDir(projectRoot);

    await fs.writeJson(
      path.join(projectRoot, "skills.json"),
      {
        skills: {
          "demo-skill": {
            source: "https://github.com/example/repo",
            subdir: "",
            ref: "main",
            commit: "deadbeef",
          },
        },
      },
      { spaces: 2 }
    );

    // 先模拟一次磁盘安装状态
    await fs.ensureDir(
      path.join(projectRoot, ".agents", "skills", "demo-skill")
    );

    const result = await runCli(["install"], projectRoot);

    expect(result.stdout).toMatch(
      /Installing 1 skill\(s\) declared in skills.json:/
    );
    expect(result.stdout).toMatch(/> demo-skill/);
    expect(result.stdout).toMatch(
      /Skill "demo-skill" is already installed. Use "spm update demo-skill" to update./
    );
    expect(
      await fs.pathExists(
        path.join(projectRoot, "skills", "demo-skill")
      )
    ).toBe(false);
    expect(
      await fs.pathExists(
        path.join(projectRoot, ".skills", "manifests", "demo-skill.json")
      )
    ).toBe(false);
  });

  it("global --dry-run is passed to install", async () => {
    const projectRoot = path.join(CACHE_ROOT, "install-dry-run");
    await fs.ensureDir(projectRoot);

    await fs.writeJson(
      path.join(projectRoot, "skills.json"),
      {
        skills: {
          "awesome-copilot": {
            source: "https://github.com/github/awesome-copilot",
            subdir: "",
            ref: "main",
            commit: "deadbeef",
          },
        },
      },
      { spaces: 2 }
    );

    const { stdout } = await runCli(
      ["--dry-run", "install", "awesome-copilot"],
      projectRoot
    );

    // Only verify that the command runs and does not write to skills directory
    expect(stdout).not.toMatch(/Error/i);
    expect(
      await fs.pathExists(
        path.join(projectRoot, ".agents", "skills", "awesome-copilot")
      )
    ).toBe(false);
    expect(
      await fs.pathExists(
        path.join(projectRoot, "skills", "awesome-copilot")
      )
    ).toBe(false);
    expect(
      await fs.pathExists(
        path.join(projectRoot, ".skills", "manifests", "awesome-copilot.json")
      )
    ).toBe(false);
  });

  it("install with explicit GitHub source clones and records skill (opt-in)", async () => {
    if (!process.env.SPM_E2E_GITHUB) {
      // Optional: enable via SPM_E2E_GITHUB=1 npx vitest src/cli.test.ts
      return;
    }

    const projectRoot = path.join(CACHE_ROOT, "install-e2e-github");
    await fs.ensureDir(projectRoot);

    // Prepare empty skills.json so install works
    await fs.writeJson(
      path.join(projectRoot, "skills.json"),
      { skills: {} },
      { spaces: 2 }
    );

    const { stdout, stderr, exitCode } = await runCli(
      ["install", "https://github.com/github/awesome-copilot"],
      projectRoot
    );

    expect(exitCode).toBe(0);
    expect(stderr).toBe("");

    // skills.json contains the entry
    const skillsJson = await fs.readJson(
      path.join(projectRoot, "skills.json"),
      "utf8"
    ) as any;

    expect(skillsJson.skills["awesome-copilot"]).toBeDefined();
    expect(skillsJson.skills["awesome-copilot"].source).toBe(
      "https://github.com/github/awesome-copilot"
    );
    expect(typeof skillsJson.skills["awesome-copilot"].commit).toBe("string");
    expect(skillsJson.skills["awesome-copilot"].commit.length).toBeGreaterThan(0);

    expect(
      await fs.pathExists(
        path.join(projectRoot, ".agents", "skills", "awesome-copilot")
      )
    ).toBe(true);
    expect(
      await fs.pathExists(
        path.join(projectRoot, "skills", "awesome-copilot")
      )
    ).toBe(false);
    expect(
      await fs.pathExists(
        path.join(projectRoot, ".skills", "manifests", "awesome-copilot.json")
      )
    ).toBe(false);

    expect(stdout).not.toMatch(/Cannot parse skill source/);
  });

  it("remove unknown skill prints error", async () => {
    const projectRoot = path.join(CACHE_ROOT, "remove-unknown");
    await fs.ensureDir(projectRoot);

    await fs.writeJson(
      path.join(projectRoot, "skills.json"),
      { skills: {} },
      { spaces: 2 }
    );

    const { stderr, exitCode } = await runCli(
      ["remove", "missing-skill"],
      projectRoot
    );

    expect(exitCode).toBe(1);
    expect(stderr.trim()).toBe('Skill "missing-skill" is not installed.');
  });

  it("remove deletes installed skill directory without files metadata", async () => {
    const projectRoot = path.join(CACHE_ROOT, "remove-without-files");
    await writeFakeInstalledSkill(projectRoot, "demo-skill");

    const result = await runCli(["remove", "demo-skill"], projectRoot);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Removing skill "demo-skill".../);
    expect(result.stdout).toMatch(/Removed "demo-skill"./);
    expect(
      await fs.pathExists(
        path.join(projectRoot, ".agents", "skills", "demo-skill")
      )
    ).toBe(false);

    const skillsJson = await fs.readJson(path.join(projectRoot, "skills.json"));
    expect(skillsJson).toEqual({ skills: {} });
  });

  it("update unknown skill prints error", async () => {
    const projectRoot = path.join(CACHE_ROOT, "update-unknown");
    await fs.ensureDir(projectRoot);

    await fs.writeJson(
      path.join(projectRoot, "skills.json"),
      { skills: {} },
      { spaces: 2 }
    );

    const { stderr, exitCode } = await runCli(
      ["update", "missing-skill"],
      projectRoot
    );

    expect(exitCode).toBe(1);
    expect(stderr.trim()).toBe('Skill "missing-skill" is not installed.');
  });

  it("list prints installed skills with source and commit", async () => {
    const projectRoot = path.join(CACHE_ROOT, "list-with-skills");
    await writeFakeInstalledSkill(projectRoot, "demo-skill");

    const { stdout } = await runCli(["list"], projectRoot);

    expect(stdout).toMatch(/Installed skills \(1\):/);
    expect(stdout).toMatch(
      /demo-skill {2}https:\/\/github.com\/example\/repo {2}@deadbee/
    );
  });

  it("treats agents as an unknown command", async () => {
    const projectRoot = path.join(CACHE_ROOT, "agents-removed");
    await fs.ensureDir(projectRoot);

    const result = await runCli(["agents"], projectRoot);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Usage: spm \[options] \[command]/);
    expect(result.stdout).not.toMatch(/Per-agent configuration has been removed/);
  });
});
