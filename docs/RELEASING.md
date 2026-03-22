# Releasing `spm`

This project publishes through GitHub Actions.

## Requirements

- npm publish access for the package
- `NPM_TOKEN` configured in the repository secrets
- permission to push tags to the repository
- pnpm `9.15.9`

## Release Workflow

Preferred flow:

1. Make sure `main` is green.
2. Open the `Release` workflow in GitHub Actions.
3. Run it manually with a `patch`, `minor`, or `major` version bump.

The workflow will:

- check out `main`
- bump `package.json` and `pnpm-lock.yaml`
- run the release checks
- publish the package to npm
- commit the version bump
- create the matching Git tag
- push the version bump and matching Git tag
- create the GitHub Release

Recommended local preflight:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Manual tag-driven release is still supported if needed:

```bash
git checkout main
git pull --ff-only origin main
# update package.json and pnpm-lock.yaml first
git tag v<version>
git push origin main --tags
```

Example:

```bash
git tag v0.1.0
git push origin main --tags
```

## What The Release Workflow Does

The GitHub Actions workflow in [.github/workflows/release.yml](../.github/workflows/release.yml):

1. runs on manual dispatch or tags matching `v*`
2. installs dependencies with `pnpm install --frozen-lockfile`
3. when manually triggered, bumps the version in `package.json` and `pnpm-lock.yaml`
4. when triggered from a tag push, verifies that the Git tag matches `package.json`
5. when triggered from a tag push, verifies that the tagged commit is contained in `origin/main`
6. runs `lint`, `typecheck`, `test`, and `build` through pnpm
7. when manually triggered, commits the version bump and creates the matching tag locally
8. publishes the package to npm through pnpm, and only adds provenance when the source repository is public
9. when manually triggered, pushes the version bump commit and matching tag after npm publish succeeds
10. creates a GitHub Release with generated notes

## Failure Modes

Common release failures:

- the manual workflow publishes successfully but cannot push because `main` moved forward or branch rules reject the push
- tag does not match `package.json`
- tag points to a commit that is not on `main`
- `NPM_TOKEN` is missing or invalid
- package version already exists on npm
- npm provenance is requested from a private GitHub repository
- CI checks fail during the release job

If npm publish fails during the manual workflow, no version bump commit or tag is pushed.
If npm publish succeeds but the later push fails, fix the git-side problem and publish a new version instead of trying to reuse the same npm package version.
