import { describe, it, expect } from "vitest";
import { parseSkillUrl } from "./parser";

describe("parseSkillUrl - GitHub", () => {
  it("parses GitHub tree URL for awesome-copilot", () => {
    const r = parseSkillUrl(
      "https://github.com/github/awesome-copilot/tree/main/skills/git-commit"
    );
    expect(r.repo).toBe("github/awesome-copilot");
    expect(r.repoUrl).toBe(
      "https://github.com/github/awesome-copilot.git"
    );
    expect(r.subdir).toBe("skills/git-commit");
    expect(r.ref).toBe("main");
    expect(r.name).toBe("git-commit");
  });

  it("parses GitHub blob URL and uses parent dir as subdir", () => {
    const r = parseSkillUrl(
      "https://github.com/github/awesome-copilot/blob/main/skills/git-commit/SKILL.md"
    );
    expect(r.repo).toBe("github/awesome-copilot");
    expect(r.subdir).toBe("skills/git-commit");
    expect(r.ref).toBe("main");
  });

  it("parses GitHub repo URL", () => {
    const r = parseSkillUrl("https://github.com/anthropics/claude-code.git");
    expect(r.repo).toBe("anthropics/claude-code");
    expect(r.subdir).toBe("");
    expect(r.name).toBe("claude-code");
  });

  it("parses short owner/repo", () => {
    const r = parseSkillUrl("github/awesome-copilot");
    expect(r.repo).toBe("github/awesome-copilot");
    expect(r.subdir).toBe("");
  });

  it("parses short owner/repo tree path", () => {
    const r = parseSkillUrl(
      "github/awesome-copilot/tree/main/skills/git-commit"
    );
    expect(r.repo).toBe("github/awesome-copilot");
    expect(r.subdir).toBe("skills/git-commit");
  });
});

describe("parseSkillUrl - skills.sh", () => {
  it("parses skills.sh URL into GitHub repo + skills subdir", () => {
    const r = parseSkillUrl(
      "https://skills.sh/github/awesome-copilot/git-commit"
    );
    expect(r.repo).toBe("github/awesome-copilot");
    expect(r.subdir).toBe("skills/git-commit");
    expect(r.ref).toBe("main");
    expect(r.name).toBe("git-commit");
  });
});

describe("parseSkillUrl - errors", () => {
  it("throws on unsupported input", () => {
    expect(() => parseSkillUrl("not-a-valid-source"))
      .toThrowError(/Cannot parse skill source/);
  });

  it("throws on SkillsMP URLs", () => {
    expect(() =>
      parseSkillUrl(
        "https://skillsmp.com/skills/openclaw-openclaw-extensions-acpx-skills-acp-router-skill-md"
      )
    ).toThrowError(/Cannot parse skill source/);
  });
});
