# Contributing

Thanks for contributing to `spm`.

## Before You Start

- Use Node.js `>=20.19.6`
- Install dependencies with `pnpm install --frozen-lockfile`
- Run the local quality checks before opening a PR

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Development Workflow

1. Create a branch for your change.
2. Make the smallest coherent change that solves one problem.
3. Add or update tests when behavior changes.
4. Run the local checks.
5. Open a pull request with a clear summary and test notes.

## Pull Request Expectations

Please include:

- What changed
- Why it changed
- Any compatibility or migration impact
- How you tested it

Small, focused PRs are preferred over broad refactors.

## Issue Reporting

Use the issue templates for:

- Bug reports
- Feature requests

Include reproduction steps whenever possible. For CLI bugs, include:

- operating system
- Node.js version
- the command you ran
- the exact output or error message

## Release Process

Release instructions live in [docs/RELEASING.md](./docs/RELEASING.md).
