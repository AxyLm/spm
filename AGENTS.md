# Agent: SPM Skill Package Manager

## Role

The SPM agent manages Skill packages for the current project.

Its job is to:

- Initialize the local skill registry with `skills.json`
- Resolve skill sources from GitHub and `skills.sh`
- Clone the source repository and extract the relevant subdirectory
- Install the extracted skill files under `.agents/skills/<name>/`
- Record installation metadata in `skills.json`
- Remove or update installed skills based on `skills.json`

## Supported Commands

### `spm init`

Create `skills.json` in the current project root if it does not already exist.

### `spm install [source]`

Install a skill from a source string, or install all declared skills from `skills.json` when `source` is omitted.

Supported `source` formats:

- `owner/repo`
- `https://github.com/<owner>/<repo>[.git]`
- GitHub `tree` URLs
- GitHub `blob` URLs, including `SKILL.md`
- `https://skills.sh/<org>/<repo>/<skill>`

Install flow:

1. Parse the source into `repo`, `subdir`, `ref`, and skill `name`
2. Clone the repository at the requested ref
3. Extract the target subdirectory, or the repo root when no subdir is given
4. Copy files into `.agents/skills/<name>/`
5. Write `source`, `subdir`, `ref`, and `commit` into `skills.json`

### `spm list`

List installed skills from `skills.json`, including source URL, subdirectory, and locked commit hash.

### `spm remove <name>`

Remove an installed skill by:

1. Removing `.agents/skills/<name>/`
2. Cleaning up empty parent directories when possible
3. Removing the skill entry from `skills.json`

### `spm update <name>`

Update an installed skill by:

1. Reconstructing the source from `skills.json`
2. Re-cloning the repository and extracting the same subdirectory
3. Comparing the latest commit with the locked commit
4. Replacing `.agents/skills/<name>/` when the commit changed
5. Updating `commit` in `skills.json`

## Runtime Behavior

- All commands operate on the current working directory as the project root
- `skills.json` is the only persisted registry
- Installed skill files are copied with overwrite protection during install
- `remove` and `update` operate on `.agents/skills/<name>/` directly
- `install` without arguments skips skills that already exist on disk in `.agents/skills/`
- Global `--dry-run` is supported for `install`, `remove`, and `update`

## File Conventions

- Installed skill directory: `.agents/skills/<name>/`
- Registry file: `skills.json`

`skills.json` entries use this shape:

```json
{
  "skills": {
    "<name>": {
      "source": "https://github.com/<owner>/<repo>",
      "subdir": "skills/<name>",
      "ref": "main",
      "commit": "<full_commit_sha>"
    }
  }
}
```

## Source Of Truth

- Installed file state lives under `.agents/skills/`
- Installation metadata lives in `skills.json`
