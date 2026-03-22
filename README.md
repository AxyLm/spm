# SPM (Skill Package Manager)

[![npm version](https://img.shields.io/npm/v/spmjs?logo=npm)](https://www.npmjs.com/package/spmjs)
[![npm downloads](https://img.shields.io/npm/dm/spmjs?logo=npm)](https://www.npmjs.com/package/spmjs)
[![CI](https://img.shields.io/github/actions/workflow/status/AxyLm/spm/ci.yml?branch=main&label=ci&logo=githubactions)](https://github.com/AxyLm/spm/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/actions/workflow/status/AxyLm/spm/release.yml?label=release&logo=githubactions)](https://github.com/AxyLm/spm/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/AxyLm/spm/blob/main/package.json)

SPM is a local **Skill Package Manager** for the current project.

It focuses on:

- Resolving skill sources (GitHub, skills.sh)
- Cloning and extracting skill subdirectories
- Installing Skills under `.agents/skills/`
- Maintaining `skills.json`

---

## Why SPM

SPM treats Git repositories as the source of truth for Skills. It installs a Skill from a repo or subdirectory, locks the result to a commit, and places the installed files under `.agents/skills/<name>/` so teams can review, share, and update Skills with normal Git workflows.

For the full design direction, see the [proposal](https://github.com/AxyLm/spm/blob/main/PROPOSAL.md).

---

## Features

- Install skills from multiple sources:
  - GitHub repos and subdirectories
  - GitHub `tree` / `blob` URLs (including `SKILL.md`)
  - [skills.sh](https://skills.sh) skill pages
- Copy skill code into `.agents/skills/<name>/`
- Track installations in `skills.json`
- Implemented in TypeScript, built with **tsdown**, tested with **vitest**

---

## Install & Build

From the `spm/` directory:

```bash
cd spm
pnpm install --frozen-lockfile
```

Run without installing:

```bash
npx spmjs --help
npx spmjs install https://github.com/github/awesome-copilot/tree/main/skills/git-commit
```

Build the CLI:

```bash
pnpm build
```

Run the CLI:

```bash
node dist/cli.mjs --help
# or, if installed or linked globally:
spm --help
```

`package.json` declares:

```jsonc
"bin": {
  "spm": "./dist/cli.mjs"
}
```

The published package name is `spmjs`, and the installed executable is `spm`.

---

## CLI Commands

All commands are intended to run from the **project root** (where `skills.json` lives).

### `install`

Install a skill from a source string:

```bash
# 1) GitHub repo
spm install github/awesome-copilot

# 2) GitHub tree subdirectory
spm install https://github.com/github/awesome-copilot/tree/main/skills/git-commit

# 3) GitHub blob URL (parent directory is used as subdir)
spm install https://github.com/github/awesome-copilot/blob/main/skills/git-commit/SKILL.md

# 4) skills.sh
spm install https://skills.sh/github/awesome-copilot/git-commit

```

Install flow:

1. Parse the source into `repo`, `subdir`, `ref`
2. `git clone` the repository and extract the subdirectory
3. Copy the directory into `.agents/skills/<name>/`
4. Update `skills.json`

---

### `list`

```bash
spm list
```

Example output:

```text
Installed skills (1):

  git-commit  https://github.com/github/awesome-copilot (skills/git-commit)  @5847a7c
```

---

### `remove`

```bash
spm remove git-commit
```

What happens:

1. Read `skills.json`
2. Remove `.agents/skills/<name>/`
3. Update `skills.json` and remove the skill entry

---

### `update`

```bash
spm update git-commit
```

What happens:

1. Read `source` / `subdir` / `ref` from `skills.json`
2. Clone the repo again and extract the subdir
3. Replace `.agents/skills/<name>/`
4. Update `commit` in `skills.json`

---

## Project Layout

After installing skills, the project root looks like:

```text
project/
├─ skills.json
├─ .agents/
│  └─ skills/
│     └─ <name>/               # Installed skill directory
```

`skills.json` example:

```json
{
  "skills": {
    "git-commit": {
      "source": "https://github.com/github/awesome-copilot",
      "subdir": "skills/git-commit",
      "ref": "main",
      "commit": "5847a7c7e79bab3e400cf47800b83449d7aea2d4"
    }
  }
}
```

---

## Tech Stack

- **Language:** Node.js + TypeScript
- **Build:** tsdown (target `node20`, ESM output `dist/cli.mjs`)
- **Testing:** vitest (`src/parser.test.ts` covers GitHub / skills.sh URL parsing)
- **Runtime deps:**
  - `commander` – CLI argument parsing
  - `execa` – running `git`
  - `fs-extra` – filesystem utilities

---

## Contributing

Contribution guidelines are in [CONTRIBUTING.md](https://github.com/AxyLm/spm/blob/main/CONTRIBUTING.md). Release instructions are in [docs/RELEASING.md](https://github.com/AxyLm/spm/blob/main/docs/RELEASING.md).
