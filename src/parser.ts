/**
 * URL parser for skill sources.
 *
 * Supported formats:
 *   - owner/repo
 *   - owner/repo/tree/ref/path/to/skill
 *   - https://github.com/owner/repo[.git]
 *   - https://github.com/owner/repo/tree/ref/path/to/skill
 *   - https://github.com/owner/repo/blob/ref/path/to/file
 *   - https://skills.sh/org/repo/skill-name
 */

export interface ParsedSkillSource {
  repo: string; // "owner/repo"
  repoUrl: string; // "https://github.com/owner/repo.git"
  subdir: string; // "skills/react-best-practices" or ""
  ref: string; // "main" or specified branch/tag
  name: string; // last segment of subdir or repo name
}

const SKILLSH_RE =
  /^https?:\/\/skills\.sh\/([^/]+)\/([^/]+)\/([^/]+)\/?$/;

const GITHUB_TREE_RE =
  /^https?:\/\/github\.com\/([^/]+\/[^/]+)\/(?:tree|blob)\/([^/]+)\/(.+)$/;

const GITHUB_REPO_URL_RE =
  /^https?:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/;

const SHORT_WITH_TREE_RE =
  /^([^/]+\/[^/]+)\/(?:tree|blob)\/([^/]+)\/(.+)$/;

const SHORT_REPO_RE =
  /^([^/]+\/[^/]+)$/;

export function parseSkillUrl(input: string): ParsedSkillSource {
  let repo: string;
  let subdir = "";
  let ref = "main";

  // 0. skills.sh
  let m = SKILLSH_RE.exec(input);
  if (m) {
    const org = m[1];
    const repoName = m[2];
    const skillName = m[3];
    repo = `${org}/${repoName}`;
    subdir = `skills/${skillName}`;
    return build(repo, subdir, ref);
  }

  // 1. Full GitHub URL with tree/blob path
  m = GITHUB_TREE_RE.exec(input);
  if (m) {
    repo = m[1];
    ref = m[2];
    subdir = m[3].replace(/\/+$/, "");
    // If URL points to a file (has extension), use parent dir as subdir
    if (/\.[a-zA-Z0-9]+$/.test(subdir)) {
      const parts = subdir.split("/");
      parts.pop();
      subdir = parts.join("/");
    }
    return build(repo, subdir, ref);
  }

  // 2. Full GitHub repo URL (with or without .git)
  m = GITHUB_REPO_URL_RE.exec(input);
  if (m) {
    repo = m[1];
    return build(repo, subdir, ref);
  }

  // 3. Short form with tree/blob: owner/repo/tree/ref/path
  m = SHORT_WITH_TREE_RE.exec(input);
  if (m) {
    repo = m[1];
    ref = m[2];
    subdir = m[3].replace(/\/+$/, "");
    return build(repo, subdir, ref);
  }

  // 4. Short form: owner/repo
  m = SHORT_REPO_RE.exec(input);
  if (m) {
    repo = m[1];
    return build(repo, subdir, ref);
  }

  throw new Error(`Cannot parse skill source: ${input}`);
}
function build(repo: string, subdir: string, ref: string): ParsedSkillSource {
  const repoUrl = `https://github.com/${repo}.git`;
  const name = subdir ? subdir.split("/").pop()! : repo.split("/").pop()!;
  return { repo, repoUrl, subdir, ref, name };
}
