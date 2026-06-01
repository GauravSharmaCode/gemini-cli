# PoleStar-X bootstrap baseline

Green baseline after merging pi `main` into this repository.

## Prerequisites

- Node.js >= 22.19.0
- npm (workspaces)

## Install and build

```bash
npm install
npm run build
```

## Inherited test matrix

```bash
npm test
```

On a fresh Windows dev machine, many upstream integration tests fail without provider API keys or due to symlink-related autocomplete tests in `packages/tui`. The fork baseline for PoleStar development is:

- `npm run build` — passes
- `npm run test -w @polestar-x/cli` — passes (PoleStar unit tests)
- `npx tsx packages/polestar/src/cli.ts --help` — shows `polestar` branding

Record full upstream results when running in CI with credentials configured.

Package-level (optional):

```bash
npm run test -w @earendil-works/pi-ai
npm run test -w @earendil-works/pi-agent-core
npm run test -w @earendil-works/pi-coding-agent
```

## Smoke checks

```bash
npx tsx packages/coding-agent/src/cli.ts --help
npx tsx packages/polestar/src/cli.ts --help
```

Expected: both print CLI help; `polestar` uses app name `polestar` and config directory `.polestar`.

## PoleStar product layer

New code lives under `packages/polestar/`. Upstream packages remain under `packages/agent`, `packages/ai`, `packages/coding-agent`, and `packages/tui` until harness rename milestones complete.
