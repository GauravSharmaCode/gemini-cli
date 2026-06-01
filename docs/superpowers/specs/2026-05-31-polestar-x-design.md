# PoleStar-X — Design Spec

- **Date:** 2026-05-31
- **Status:** Approved for implementation planning
- **Author:** Gaurav (design), drafted collaboratively
- **Supersedes:** `implementation_plan.md` (kept as the originating artifact; this spec is the decided evolution of it)

---

## 1. Vision & Thesis

**PoleStar-X is a sovereign, self-configuring terminal coding agent.** It is a real product — not a plugin, not a thin wrapper — that a developer owns outright and that no vendor can ever take away.

The triggering context: Google is retiring Gemini CLI (June 18, 2026) and funnelling users into the closed, server-harnessed Antigravity CLI. The lesson is explicit: **a coding tool you do not control is a rug waiting to be pulled.** PoleStar-X exists so that the agent, its harness, its providers, and its memory are fully owned and un-revocable.

### The one-line thesis

> PoleStar-X is **pi's power with zero manual setup — an agent that configures itself**, sitting between rigid enterprise tools (Cursor / Antigravity / Claude Code) and barebones pi.

Where enterprise tools are polished but closed and rigid, and pi is powerful but demands heavy manual configuration, PoleStar-X is the **opinionated, batteries-included, self-configuring** middle ground — and it is fully open and owned.

---

## 2. Positioning


| Axis          | Rigid enterprise tools (Cursor / Antigravity / Claude Code) | Barebones pi                             | **PoleStar-X**                            |
| ------------- | ----------------------------------------------------------- | ---------------------------------------- | ----------------------------------------- |
| Ownership     | Closed / revocable                                          | Open (MIT)                               | **Owned fork (un-revocable)**             |
| Setup effort  | Low, but locked-in                                          | High, fully manual                       | **Low, self-configuring**                 |
| Model choice  | Curated, opaque                                             | Flat list of 40+, manual pick every time | **Smart routing, automatic**              |
| Memory        | Session or vendor-cloud                                     | Session only                             | **First-class cross-session (pi-memory)** |
| Extensibility | Vendor-gated                                                | Powerful but manual                      | **Agent extends itself**                  |


---

## 3. Strategic Foundation: Fork pi (the Cursor↔VSCode model)

PoleStar-X is a **hard fork of pi** — its own repository, rebranded, with pi's MIT license and copyright preserved. This is exactly how **Cursor forked VSCode**: take a solid open-source base, own it outright, and build a differentiated product on top. Microsoft cannot revoke VSCode from Cursor; the pi maintainers cannot revoke pi's harness from PoleStar-X.

### 3.1 Why fork (not depend, not extend)

- **Dependency = rug risk.** Importing `@earendil-works/*` from npm means they can be unpublished or changed. Forking removes that risk entirely.
- **Extension = ceiling.** A plugin on top of pi's app cannot own the prompts, the loop behavior, the UX, or the routing. PoleStar-X needs to own the entire experience layer to differentiate.
- **Fork = ownership + a solid harness on day one.** pi's harness is ranked #1 for token efficiency (no continuation tax, strong compaction) in our architecture comparison. We start solid and improve from there.

### 3.2 What we fork vs. build

- **Fork & own (the foundation):**
  - pi's **agent harness / core loop** (from `pi-agent-core`) — the solid, no-tax ReAct loop, session management, hooks, compaction primitives.
  - pi's **unified provider/AI layer** (from `pi-ai`) — Anthropic, OpenAI (completions/responses/codex), Google Generative AI, Google Vertex, Mistral, Azure, Bedrock, Cloudflare, Copilot, OpenRouter, plus OAuth. This is the answer to "provider hell"; we will not re-derive it.
- **Build new (the PoleStar product layer):** eager guardrailed prompts, smart model router, self-configuration engine, pi-memory integration, self-healing dev/test loop, multi-agent orchestration, persistent artifacts.

### 3.3 Improve-don't-inherit (the anti-qwen principle)

qwen-code copied gemini-cli's core verbatim and inherited its weaknesses (notably the `checkNextSpeaker` continuation tax). **PoleStar-X must never do this.** Anything we take is taken to be *improved*. Forking the harness means we may rework its internals freely — we are not bound to upstream decisions.

### 3.4 Attribution & licensing

- Preserve pi's `LICENSE` (MIT) and original copyright (Mario Zechner) in the repo.
- Maintain a top-level `**NOTICE.md`** ("Attribution Ledger", §12) listing every project we fork from or adopt code/ideas from, with links and licenses.
- **Norm we follow (validated against pi itself, which credits no one):** *inspiration and patterns* are taken freely and need no credit; *copied source code* keeps its license and is listed in `NOTICE.md`. We choose to be generous with attribution in the README even for inspiration, as a matter of principle.
- **Multi-source, no single lean.** We take from pi (harness), Claude Code (prompts, commands, UI patterns), gemini-cli / opencode / codex (specific improvements) — always improving, never parasitic on any single core.

---

## 4. Architecture Overview

```
polestar-x/                       # the fork: pi's harness, rebranded + improved
  LICENSE                         # pi's MIT preserved + PoleStar-X copyright
  NOTICE.md                       # attribution ledger (pi, Claude Code, gemini-cli, opencode, ...)
  README.md                       # branding (owned by Gaurav) + attributions
  packages/
    harness/                      # forked + improved pi-agent-core (the solid harness)
    ai/                           # forked pi-ai (providers / OAuth) — owned
    polestar/                     # NEW product layer (the differentiation)
      prompts/                    # eager + guardrailed system prompt + Claude-Code-adopted prompts
      commands/                   # slash commands (Claude-Code-adopted + new)
      ui/                         # UI layer (common across agents; Claude-Code-adopted)
      router/                     # smart model routing (kills model-choice hell)
      tools/                      # opinionated tool suite + self-config tools
      self-heal/                  # test / diagnose / retry loop
      memory/                     # pi-memory integration (github.com/GauravSharmaCode/pi-memory)
      orchestration/              # multi-agent spawn + artifacts + worktree isolation
  docs/superpowers/specs/         # this spec and successors
```

- **Language/runtime:** Bun + TypeScript (matches pi; preserves React-Ink terminal rendering and instant harvestability). Rust helpers reserved only for genuine hotspots (indexing, embeddings) — deferred, not in early phases.
- **Boundary discipline:** the `harness` and `ai` packages stay close to upstream pi structure early (so the fork boots and passes pi's own tests), then diverge deliberately as we improve them. All net-new product value lives under `packages/polestar/`.

---

## 5. Adopted from Claude Code: prompts, commands, UI layer

Per decision, PoleStar-X adopts Claude Code's **prompts, commands, and UI layer** as the basis for its experience layer (the UI layer is largely common across all these agents, so adoption is low-risk and high-value).

- **Prompts:** Claude Code's system-prompt structure and tone (concise, eager-but-disciplined, high-signal, validate-before-completion) form the base of the PoleStar eager guardrailed prompt (§6.1, §8).
- **Commands:** Claude Code's slash-command surface and conventions seed `packages/polestar/commands/`, extended with PoleStar-specific commands (e.g. routing, memory, self-config).
- **UI layer:** Claude Code's terminal UX patterns inform `packages/polestar/ui/`, rendered on the forked Ink/TUI stack.
- **Attribution:** all adopted material is listed in `NOTICE.md`; copied text/code keeps its license. We improve, not transcribe.

---

## 6. Product Differentiators (the PoleStar layer)

### 6.1 Eager guardrailed system prompt

A synthesized, opinionated system prompt (base adopted from Claude Code; §8) that makes the agent **eager and proactive but disciplined**, fronted by hard safety rails (§7). Editable/forkable `system.md`. Injected at the start of each turn through the harness's `before_agent_start` hook, prepended to preserve dynamic sections (tools, skills, project context).

### 6.2 Smart model router (kills model-choice hell)

The core fix for "provider hell." Today pi exposes a flat list of 40+ models and forces a manual pick every turn. PoleStar-X **routes automatically**:

- Classify each task (heuristics first; optionally a fast/cheap model call) by difficulty, privacy sensitivity, and cost tolerance.
- Map to the right model: strong-reasoning model for planning/architecture, fast/cheap model for simple edits, **local model for anything privacy-sensitive** (secrets, `.env`), etc.
- **Fallback chains** on rate-limit/error so a dying or throttled provider never blocks work — directly embodying sovereignty.
- Implemented over the forked harness via per-turn model selection; ships with opinionated default routing rules that the user can override.

### 6.3 Self-configuration engine

The literal "configures itself" capability:

- **Skills:** the agent can scaffold a new `SKILL.md`, register it, and use it within the same session.
- **Rules:** the agent maintains its own `AGENTS.md` / `RULES.md` (already ingested by the harness's context loader).
- **Tools:** the agent can enable/disable its own active tools.
- Driven by an opinionated tool suite plus the eager prompt that instructs the agent to extend itself when a capability is missing.

### 6.4 First-class pi-memory

Cross-session work-journal + semantic retrieval, **plugged in** from the existing project (`github.com/GauravSharmaCode/pi-memory`) — not rebuilt:

- **Pre-turn retrieval:** silent semantic search injected as a "Historical Memory" block, under a hard timeout so it can never add latency tax.
- **MEMORY.md ingestion:** curated long-term guidelines injected into the system prompt.
- **Auto-logging:** structured logging of completed work (opt-in; tools + `/remember` are the primary path to avoid noise).
- Transport: CLI or MCP, behind one swappable backend interface.

### 6.5 Self-healing dev/test loop

Woven through execution: on lint/type/test failure, the agent **diagnoses root cause and retries** rather than blindly pivoting (Developer↔Tester loop). Includes the self-healing path for generated provider adapters (compile/typecheck → iterate on errors until green).

### 6.6 Orchestration, artifacts & worktree isolation

The premium layer (later phases):

- **Multi-agent orchestration:** spawn/route subagents for parallel/background work.
- **Persistent artifacts:** split-screen Ink panel rendering live-updating markdown artifacts separate from transient chat.
- **Strict git worktree isolation:** automated execution runs in an isolated worktree sandbox; nothing untested touches the primary workspace.

---

## 7. Safety & Guardrails (Zero-Blast-Radius standard)

Eagerness is always fronted by hard rails:

- **Destructive-action consent:** explicit interactive confirmation required before destructive filesystem ops (`rm -rf`, wiping dirs), destructive git (`push -f`, `reset --hard`, deleting remote branches), or service/DB purges.
- **Worktree containment:** automated experiments are confined to the temporary worktree sandbox.
- **Workspace conventions:** adhere strictly to the project's existing patterns, formatting, and libraries; no foreign abstractions without approval.
- **Validate before "done":** never claim success without running lint/type/tests; never fake or suppress failing results.

---

## 8. System Prompt Foundation

Base adopted from Claude Code, synthesized with the best of OpenCode and Codex:

1. **Persona & tone:** extreme conciseness, eager but disciplined, high-signal output, explain destructive actions before taking them, no filler.
2. **Execution mandates:** validate before completion; diagnose before pivoting; maximize parallel tool calls; minimize search bounds; use topic/status updates for long runs.
3. **Self-configuration ethos:** when a needed capability is missing, the agent may extend its own config (skills/rules/tools) rather than stall.
4. **Safety rails:** §7, stated as non-negotiable.

The prompt lives in `packages/polestar/prompts/system.md`, is forkable, and supports a user override file.

---

## 9. Bring-up Order (phased — sequencing, not scope-cut)

The full product still ships; this is the order it comes online.

1. **Fork boots & green.** Fork pi into `polestar-x`, rebrand, preserve LICENSE, build, and pass pi's existing test suite unchanged. Establishes the solid harness baseline.
2. **Harden/improve harness.** Targeted improvements to the forked harness (anti-qwen): remove/avoid any inherited weaknesses, confirm no continuation tax, solidify compaction and sessions.
3. **Eager guardrailed system prompt** (adopt Claude Code base + safety rails).
4. **Smart model router** (default routing rules + fallback chains + privacy-aware local routing).
5. **Self-config tools + pi-memory** plug-in.
6. **Self-healing dev/test loop.**
7. **Orchestration + artifacts + worktree isolation.**

Each phase ends with passing tests and a runnable agent.

---

## 10. Testing & Verification Strategy

- **Inherited tests first:** the fork must pass pi's existing test suites before any divergence (proves a clean baseline).
- **Unit tests** for every new product unit (router classification/fallback, prompt composition idempotency, self-config tools, memory backend behind a fake).
- **Integration tests** for hook-driven behavior (prompt injection, pre-turn memory injection with timeout/degradation, per-turn model selection).
- **No-tax guard:** an explicit test asserting memory/routing add no blocking latency on timeout/error.
- **Verification-before-completion** enforced in the agent itself and in our own CI.

---

## 11. Decisions Made / Open Questions

### Decisions (locked)

- PoleStar-X is a **hard fork of pi** (Cursor↔VSCode model), own repo, MIT + attribution preserved. Not a dependency, not an extension.
- **Bun + TypeScript**; Rust deferred to genuine hotspots.
- Adopt **Claude Code's prompts, commands, UI layer**; improve, don't transcribe.
- **pi-memory is plugged in, not rebuilt** (existing GitHub project).
- **Improve-don't-inherit** (anti-qwen) is a binding principle.
- **Auto-logging defaults off**; tools + `/remember` are primary.
- Branding is owned by Gaurav (prepared separately).

### Open questions (resolve during planning)

- Fork mechanism: full-history fork vs. squashed import (both preserve license; pick during planning).
- Router task-classification: pure heuristics for v1 vs. a tiny fast-model classifier — measure before committing.
- Which Claude Code command/UI elements are adopted verbatim vs. reworked first.
- pi-memory transport default (CLI vs MCP) per environment.

---

## 12. Attribution Ledger (to live in `NOTICE.md`)


| Project                  | License         | What PoleStar-X takes                                                             | Treatment                                       |
| ------------------------ | --------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- |
| pi (`earendil-works/pi`) | MIT             | Agent harness/core loop, unified provider/AI layer, TUI primitives                | **Forked & owned**, license preserved, improved |
| Claude Code              | (per its terms) | System prompt structure/tone, slash-command conventions, UI patterns              | Adopted as inspiration; improved; listed        |
| gemini-cli               | Apache-2.0      | Any genuinely better core/UX pieces (e.g. Ink rendering, MCP plumbing) if adopted | Inspiration / attributed code; improved         |
| opencode                 | (per its terms) | Compaction/prompt-brevity ideas if adopted                                        | Inspiration; listed                             |
| codex                    | (per its terms) | Prompt/execution-mandate ideas if adopted                                         | Inspiration; listed                             |


> Every project listed is credited in `README.md` and `NOTICE.md`. Copied source keeps its license header. We take to improve — never to inherit weaknesses.

