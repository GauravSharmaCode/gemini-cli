# PoleStar-X

PoleStar-X is a **sovereign, self-configuring terminal coding agent** — a hard fork of [pi](https://github.com/earendil-works/pi) that you own outright. No vendor can revoke your harness or rug-pull your CLI.

## Thesis

> Pi's power with zero manual setup — an agent that configures itself.

See the full design: [docs/superpowers/specs/2026-05-31-polestar-x-design.md](superpowers/specs/2026-05-31-polestar-x-design.md).

## Quick start (developers)

```bash
npm install
npm run build
npm test
npx tsx packages/polestar/src/cli.ts --help
```

## Binaries

| Command | Role |
| --- | --- |
| `pi` | Inherited upstream CLI (baseline compatibility) |
| `polestar` | PoleStar-branded entry (`.polestar` config dir, `polestar` app name) |

## Baseline verification

Documented in [docs/BOOTSTRAP.md](BOOTSTRAP.md).
