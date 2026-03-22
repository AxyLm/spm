# Proposal: Git-First Skill Distribution for SPM

## Summary

`spm` already has a working installation model for Skills:

- Resolve a Skill from a Git source
- Clone the repository and extract the relevant subdirectory
- Install the Skill under `.agents/skills/<name>/`
- Record local state in `skills.json`

This proposal formalizes that model into a Git-first distribution protocol for Skills:

- Git repositories are the source of truth
- `selector` defines the update channel
- `commit` defines the locked installation result
- Discovery sites are optional lookup layers, not part of the distribution contract
- `spm` is responsible for resolving, locking, syncing, and updating Skills locally

The goal is not to invent a new central package registry. The goal is to make Skill installation reproducible, shareable, and simple by using Git as the distribution primitive.

## Background

The current `spm` implementation already supports:

- Multiple input forms: `owner/repo`, GitHub `tree/blob` URLs, and `skills.sh`
- A Git-based fetch flow: clone first, then extract a subdirectory
- A local installation model: keep Skill contents under `.agents/skills/<name>/`
- A local state model: store source and commit data in `skills.json`

That means the project is already operating in a Git-native way. What is missing is a clear distribution model and a stable internal representation for installed Skills.

Current gaps:

1. There is no explicit canonical source format for a Skill.
2. `skills.json` mixes source metadata, lock information, and sync state.
3. The update flow is commit comparison by re-cloning, but the concepts of channel, pin, and outdated state are not explicit.
4. Discovery endpoints and distribution semantics are not clearly separated.
5. Team-sharing works in practice, but the workflow is still implicit.

## Reference Documents

The following external documents are useful background for the Skill format itself and for client compatibility work:

- [Agent Skills Overview](https://agentskills.io/home) - high-level overview of the open Agent Skills format
- [What are skills?](https://agentskills.io/what-are-skills) - explains the core folder layout, `SKILL.md`, and progressive disclosure
- [Specification](https://agentskills.io/specification) - the format reference for `SKILL.md`, optional directories, and validation rules
- [Adding skills support](https://agentskills.io/client-implementation/adding-skills-support) - implementation guidance for tools that want to support Skills

These references describe the Skill format and ecosystem context. They do not change the core proposal here: `spm` should remain Git-first, and discovery sites should remain optional lookup layers rather than part of the lock contract.

## Goals

This proposal aims to:

1. Define a Git-first distribution model for Skills.
2. Keep `spm` simple and avoid introducing a centralized package registry.
3. Make installations reproducible and safe to share in a repository.
4. Preserve current source input compatibility while normalizing internally.
5. Keep discovery services useful without making them part of the lock format.

## Non-Goals

This proposal does not attempt to:

1. Create a new central registry for Skills.
2. Publish tarballs, bundles, or mirror artifacts.
3. Solve enterprise artifact hosting beyond standard Git access.
4. Replace other CLI distribution channels.
5. Define how an agent runtime executes a Skill after installation.

## Why Git-First

Git-first fits the current shape of Skills and the current implementation of `spm`:

- Skills usually live inside repositories, often as directories in a mono-repo.
- Skills often need to ship `SKILL.md`, templates, scripts, and reference material together.
- A commit SHA is a precise boundary for review and reproduction.
- Users already share Skills as repository URLs, directory URLs, and GitHub pages.

There are tradeoffs:

- There is no built-in semver ecosystem around raw Git directories.
- Branches and tags are looser than versioned packages.
- Installing a subdirectory still requires cloning the repository.

For `spm`, those tradeoffs are acceptable. The immediate priority is a minimal, reproducible distribution model with low operational complexity.

## Proposed Model

### 1. Canonical Source Spec

Regardless of how a user refers to a Skill:

- `owner/repo`
- `https://github.com/owner/repo`
- `https://github.com/owner/repo/tree/main/skills/foo`
- `https://skills.sh/org/repo/foo`

`spm` should normalize it to a single internal source spec:

```json
{
  "type": "git",
  "repo": "https://github.com/owner/repo.git",
  "subdir": "skills/foo",
  "selector": "main",
  "commit": "2a4b6c8d..."
}
```

Field meanings:

- `repo`: the cloneable Git URL
- `subdir`: the Skill root inside the repository; empty means the repository root is the Skill
- `selector`: the requested ref, such as a branch, tag, or revision; this is the update channel
- `commit`: the resolved commit SHA; this is the lock result

Core rules:

- `selector` is used when updating
- `commit` is used when reproducing an installation
- external URLs are only input formats, not the canonical model

### 2. Discovery Layer vs Distribution Layer

This proposal separates two concerns:

- Discovery layer: `skills.sh`, README files, GitHub pages
- Distribution layer: Git URL + subdirectory + selector + commit

In practice:

- a user may discover a Skill from any catalog or website
- `spm` should always lock the installation to a Git source spec

This keeps distribution decentralized and prevents catalog services from becoming part of the installation contract.

### 3. Skill Repository Convention

This proposal recommends a minimal repository convention:

1. A Skill root must contain `SKILL.md`
2. A Skill may include `assets/`, `scripts/`, and `references/`
3. The default Skill name is the last segment of `subdir`
4. A repository may contain multiple Skills, preferably under `skills/<name>/`
5. A repository root may also be a Skill

Example:

```text
repo/
├─ skills/
│  ├─ react-best-practices/
│  │  ├─ SKILL.md
│  │  ├─ scripts/
│  │  └─ references/
│  └─ release-notes/
│     └─ SKILL.md
└─ README.md
```

This convention matches the current parsing and extraction model in `spm`.

### 4. Local Installation Model

The local installation layout remains:

```text
project/
├─ .agents/
│  └─ skills/
│     └─ <name>/
├─ skills.json
```

Reasons:

- `.agents/skills/<name>/` preserves the full Skill for inspection and local edits
- `.agents/skills/<name>/` gives `spm` a single stable installation target
- no manifest sidecar is required for remove or update operations

This proposal does not change the installation target. It makes the source and lock semantics explicit.

## Metadata Changes

`skills.json` should gradually evolve into an installation manifest plus lock file. A recommended structure:

```json
{
  "version": 1,
  "skills": {
    "react-best-practices": {
      "source": {
        "type": "git",
        "repo": "https://github.com/vercel-labs/agent-skills.git",
        "subdir": "skills/react-best-practices",
        "selector": "main",
        "commit": "5847a7c7e79bab3e400cf47800b83449d7aea2d4"
      }
    }
  }
}
```

Compared to the current structure, the proposed changes are:

1. Move source information under `source`
2. Separate `selector` from `commit`
3. Add a top-level schema `version`

## CLI Semantics

The existing command surface can stay intact while semantics become clearer.

### `spm install <source>`

Behavior:

1. Parse the user input into a canonical source spec
2. Clone and resolve the current `commit`
3. Copy the Skill directory
4. Install it under `.agents/skills/<name>/`
5. Write `selector` and `commit` to `skills.json`

Result:

- installations are always locked to a concrete commit
- using a branch as input still produces a stable local state

### `spm update <name>`

Behavior:

1. Read `source.selector` from `skills.json`
2. Resolve the latest commit for that selector
3. If the commit changed, replace the installed directory under `.agents/skills/<name>`

This makes update mean "move forward on the original channel", not "re-run install from scratch without context".

### `spm list`

The output should eventually display:

- canonical repo
- subdir
- selector
- locked commit

Example:

```text
react-best-practices
  repo: https://github.com/vercel-labs/agent-skills.git
  subdir: skills/react-best-practices
  selector: main
  commit: 5847a7c
```

### Future Commands

Recommended follow-up commands:

- `spm outdated`: check whether the selector resolves to a new commit
- `spm lock`: refresh lock data without syncing files
- `spm add`: a semantic alias for `install`

These are not required for the initial proposal, but they complete the Git-first workflow.

## Team Workflow

A repository-friendly team workflow should look like this:

1. A contributor runs `spm install <source>`
2. The project commits `skills.json`
3. The project may also commit `.agents/skills/<name>/`
4. Other contributors pull the repository and use the installed Skill state
5. When an upgrade is needed, a contributor runs `spm update <name>` and commits the new lock

There are two viable repository strategies.

### Option A: Commit Vendorized Skill Content

Commit `.agents/skills/<name>/` into the repository.

Pros:

- fully reviewable
- works offline
- no fetch is required to inspect the installed Skill

Cons:

- repository size grows over time

### Option B: Commit Only Lock Data

Commit `skills.json` only.

Pros:

- lighter repository footprint

Cons:

- future inspection or reinstall may require refetching the Git source

For the current stage of `spm`, Option A should remain the default-friendly path, while Option B should remain possible for teams that prefer a lighter checkout.

## Backward Compatibility

This proposal is intentionally incremental:

1. Keep `install`, `remove`, `update`, and `list`
2. Keep existing input formats
3. Keep `.agents/skills` as the installation target

The change is mainly in how `spm` interprets and stores installed Skill state:

- normalize all inputs into a canonical Git source spec
- version the schema
- make `selector` and `commit` explicit

This proposal is meant to formalize the current direction, not replace it.

## Security and Trust Model

Git-first distribution implies a commit-level trust model:

1. users trust the repository they install from
2. updating a branch or tag means accepting a new resolved commit
3. installed `.agents/skills/<name>/` files should remain reviewable artifacts

Recommended follow-up safeguards:

- `spm update --dry-run`
- `spm diff <name>`
- validate that a Skill root contains `SKILL.md`
- optional allowlists for Git hosts

These are not required for the core proposal, but they are important for safe adoption.

## Implementation Plan

The work can be staged in three phases.

### Phase 1: Formalize Current Behavior

Goal: turn the existing implementation into an explicit contract.

Tasks:

1. Add a schema version to `skills.json`
2. Normalize the stored structure into `source`
3. Validate `SKILL.md` during install
4. Improve `list` to show selector and commit
5. Document discovery vs distribution clearly

### Phase 2: Complete the Locking Story

Goal: make Git-based installs feel like a proper lockfile workflow.

Tasks:

1. Add `spm outdated`
2. Add `spm diff` or `update --dry-run`
3. Define selector resolution rules for branches, tags, and direct revisions

### Phase 3: Ecosystem Integration

Goal: make external catalogs and internal indexes easier to support.

Tasks:

1. Define a mapping interface from catalogs to canonical source specs
2. Keep catalog metadata out of the lock schema
3. Support organization-curated Skill indexes

## Open Questions

1. Should `skills.json` continue to hold both source metadata and lock data, or should lock data move into a separate file?
2. Should `spm` support generic Git providers beyond GitHub?
3. Should `SKILL.md` be mandatory for every installable Skill?
4. How should name conflicts be handled when multiple Skills in different repositories share the same directory name?
5. Should the README recommend committing `.agents/skills/<name>/` by default?

## Recommendation

This proposal should be adopted as the direction for `spm`:

> `spm` is a Skill package manager that uses Git as the source of truth, commits as lock boundaries, and local sync as the consumption model.

In concrete terms:

1. Keep the current Git clone and local installation architecture
2. Normalize all inputs into a canonical Git source spec
3. Treat `selector` and `commit` as the core of the install model
4. Treat catalogs as discovery layers, not distribution layers
5. Evolve the metadata and CLI incrementally instead of introducing a central registry

The central design choice is simple:

**do not abstract Skills away from repositories; define repositories as the distribution primitive for Skills.**
