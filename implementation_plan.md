# PoleStar-X Architecture & Implementation Plan

A comprehensive, sequential blueprint to design and build a high-performance, token-efficient, multi-agent terminal assistant (**"PoleStar-X"**) from scratch, harvesting the best architectural designs from **claude-code, pi, opencode, qwen-code, warp, Antigravity, A2A, and pi-memory**.

---

## Harvesting & Integration Matrix

We will harvest specialized components from each analyzed codebase to build the ultimate architecture:

```
┌────────────────────────────────────────────────────────┐
│                      POLESTAR-X                        │
├───────────────┬────────────────────────────────────────┤
│ Component     │ Harvested From / Inspiration           │
├───────────────┼────────────────────────────────────────┤
│ Core Loop     │ Pi / Claude-Code (Tax-free single loop)│
│ Memory Paging │ OpenCode (SQLite paged history)        │
│ Compaction    │ Claude-Code (Multi-layer surgical)     │
│ Prefetching   │ Qwen-Code (Async memory prefetch)      │
│ Orchestration │ WARP (Multi-agent spawn protocol)     │
│ Backgrounding │ Antigravity (Non-blocking tasks)       │
│ UI Artifacts  │ Antigravity (Persistent file sidebars) │
│ Slash Commands│ Antigravity (Interactive /grill-me)    │
│ Swarm Routing │ A2A Server / Agent SDKs (Jules/Claude) │
│ Git Isolation │ Git Worktree + Git Subtrees (Strict)   │
│ Resource Sync │ User-Disclosed Smart LLM / Agent Swarm │
│ Work Journal  │ pi-memory (First-class agent memory)   │
│ Personality   │ Eager & Proactive Human-Centric Agent  │
└───────────────┴────────────────────────────────────────┘
```

---

## Technical Feasibility: Language Strategy (Bun + TypeScript vs. Rust)

We analyzed the feasibility of writing the agentic loop in **Rust** versus **Bun + TypeScript**:

1. **Performance Bottleneck**: 
   - Over **99% of total turn latency** in agentic loops is caused by **LLM network roundtrips** (which range from 500ms to several seconds). The local execution overhead of the loop logic itself (parsing tools, formatting JSON) is negligible (a few milliseconds in JS vs. sub-milliseconds in Rust).
   - Therefore, a Rust-based loop will not offer a user-perceptible speed improvement over Bun for standard chat operations.
2. **Harvestability & Velocity**: 
   - Harvesting critical systems like React Ink CLI terminal rendering (`gemini-cli`), SQLite history paging (`opencode`), and complex AST tool schemas (`claude-code`) is instantaneous in **TypeScript**. Rewriting them in Rust would take months of complex systems engineering.
3. **The Hybrid Compromise (Recommended)**:
   - We will write the primary orchestration and agentic loop in **Bun + TypeScript** to maximize build speed and preserve rich CLI terminal rendering.
   - For performance-intensive bottlenecks (e.g. codebase indexing, vector embedding searches, or large directory watchers), we will compile highly optimized **Rust binaries/helpers** and invoke them seamlessly from Bun.

---

## Premium Features Harvested from Antigravity & A2A

We will harvest and adapt three of Antigravity's most premium systems to make **PoleStar-X** feel extremely modern, professional, and powerful:

### 1. Strict Git Worktree & Subtree Workspace Isolation
- **Git Worktree Branching**: When launching automated execution, PoleStar-X will strictly provision an isolated **Git Worktree** in a temporary directory. The Developer subagent operates in absolute containment, running code edits, builds, and test validations safely away from your primary directory.
- **Git Subtree Sync**: We enforce a **local git subtree** structure. If changes occur across isolated modules or external workspaces, PoleStar-X automatically utilizes git subtree commands to package, version, and merge updates back into the main repository branch cleanly, preserving historical lineage without merge conflicts.

### 2. Live-Updating Persistent Artifacts
- **Concept**: Separate transient chat text from persistent output documents (like specs, task logs, or walk-throughs).
- **Ink Rendering**: The React Ink-based terminal CLI will draw a **split-screen UI** (or collapsible terminal tab). The left side handles the active chat, and the right side displays the live-updating markdown **Artifact**.

### 3. Interactive Slash Commands (`/grill-me`)
- **Slash Input Parsing**: Build a command router in the terminal text input. Commands like `/grill-me`, `/goal`, and `/schedule` trigger specialized CLI states.
- **Terminal Radio Forms**: Instead of clogging the chat with long question lists, PoleStar-X will render interactive terminal menus inside the chat pane using React Ink's multi-select or radio components.

---

## Game-Changing Feature: First-Class `pi-memory` Integration

Instead of a transient session context that is summarized and eventually lost, **PoleStar-X integrates the `pi-memory` work-journal and search system directly into the core agent loop**. This provides PoleStar-X with a persistent, cross-session long-term memory layer that tracks daily work, architectural decisions, and recurrent bugs.

### 1. Active Context Bootstrapping (`MEMORY.md` Ingestion)
- At start time, PoleStar-X checks if `~/.memory/MEMORY.md` (the dynamic, auto-promoted long-term memory file curated by `pi-memory`) exists.
- It automatically parses `MEMORY.md` and injects its curated guidelines (e.g. style rules, past codebase insights, system specifications, and structural constraints) directly into PoleStar-X's core system prompt config.

### 2. Pre-Turn Contextual Retrieval (`pi-memory search`)
- When a user enters a prompt, the orchestrator automatically executes a silent background semantic query via `pi-memory search "<user_prompt>"` before launching the core LLM ReAct turn.
- If relevant past tickets, learning notes, or decision snippets are returned, the orchestrator appends them as a **Historical Memory block** at the beginning of the context history.

### 3. Automated Post-Execution Logging Hook (`pi-memory log`)
- When PoleStar-X completes an automation run or E2E ticket successfully:
  - It intercepts the execution outcome (the parsed task summary, structural changes, and verification tests).
  - It triggers a silent, headless call to `pi-memory log ticket` or `pi-memory log learning`.

---

## Dynamic Self-Extensibility & Hot-Plugging Provider Engine

As a pure **developer-first coding agent**, PoleStar-X must have the ability to extend itself dynamically at runtime. If the user provides a new external Agent SDK, API endpoint, or framework description, PoleStar-X can automatically generate, compile, and hot-plug a matching integration adapter for itself.

### 1. The Dynamic Provider Interface & Registry
- Define a strict TypeScript contract `Provider` (`id`, `name`, `capabilities`, `sendMessage()`, `executeTool()`).
- PoleStar-X reads compiled ESM provider plugins dynamically from `~/.polestar/providers/*.ts` or `*.js` using Bun's native, high-performance ESM dynamic imports (`await import(filePath)`).

### 2. Self-Generation & Compiling Loop
- **The Self-Extension Protocol**:
  1. The user provides a path to an Agent SDK library, a CLI executable, or a documentation API endpoint.
  2. PoleStar-X triggers its Developer subagent to analyze the SDK's entrypoints, functions, and models.
  3. The Developer agent automatically drafts a TypeScript provider file mapping the SDK's functionalities to the PoleStar-X `Provider` interface.
  4. The agent writes this draft to the `.polestar/providers/` directory.
  5. PoleStar-X triggers Bun's high-speed transpilation/typecheck on the generated provider.
  6. **Self-Healing Compilation**: If compilation, linting, or TypeScript verification fails, the Developer subagent self-heals by iterating on the compiler logs in a loop until the plugin passes typecheck.
  7. Upon successful compilation, PoleStar-X dynamically hot-loads and registers the provider into its active Agent Directory context, immediately allowing delegation.

### 3. Opportunistic Multi-Modal Tool Usage (Pragmatic Execution)
- **Do Not Wait for MCPs**: If a specific high-level tool (e.g. Jira, GitHub, Database operations) does not have an active or available MCP server registered, PoleStar-X must not stall or consider the task blocked.
- **Direct API & Bash Fallbacks**: If the agent has the necessary API tokens, endpoints, or CLI environment variables, it should immediately leverage the most direct execution path:
  - Eagerly execute raw HTTP API queries directly via `fetch` or `curl` bash pipelines.
  - Invoke standard system CLI tools directly in the shell.
  - Execute direct database queries/scripts instead of waiting for a schema mapper.
- This pragmatic fallback strategy mirrors human developer resourcefulness: finding the fastest path to resolution (APIs, raw bash commands, custom requests) rather than restricting itself to a predefined set of MCP actions.

---

## The Eager Personality & Persistent Human Knowledge Layer

**PoleStar-X is not just a passive code generator—it is a proactive, eager developer companion built around the human.** It maintains a persistent knowledge graph of **you**: how you think, how you structure code, what patterns you prefer, and how you work.

```
┌────────────────────────────────────────────────────────────────┐
│                          POLESTAR-X                            │
│                                                                │
│                     ┌────────────────────┐                     │
│                     │  The Developer's   │                     │
│                     │    Coding Style    │                     │
│                     └─────────┬──────────┘                     │
│                               │                                │
│                               ▼                                │
│                     ┌────────────────────┐                     │
│                     │ Persistent Human   │                     │
│                     │  Knowledge Graph   │                     │
│                     └─────────┬──────────┘                     │
│                               │                                │
│                               ▼                                │
│                     ┌────────────────────┐                     │
│                     │ Eager & Proactive  │                     │
│                     │  Prompt Generator  │                     │
│                     └────────────────────┘                     │
└────────────────────────────────────────────────────────────────┘
```

### 1. Persistent Human Knowledge Ingestion
- `pi-memory` stores not only code tickets, but behavioral notes, developer diaries, and design discussions:
  - **Coding Style**: Preferred syntax patterns (e.g. *"Gaurav prefers tabs over spaces in CSS", "Always writes highly declarative, functional TS"*).
  - **Verification Habits**: Preferred testing tooling (e.g. *"Gaurav always uses fast Vitest execution and stubEnv for testing, avoids direct process.env modifications"*).
  - **Workflow Preferences**: How the user organizes directories, comments files, and plans releases.
- This developer-centric profile is compiled and injected into every core prompt, making PoleStar-X write code that looks exactly like **your** code.

### 2. Eager & Proactive Personality Profile
- The core system prompt mandates an **eager, proactive, and self-starting developer personality**:
  - **Anticipatory Actions**: The agent doesn't wait for granular, step-by-step instructions. It anticipates downstream needs (e.g. when building a route, it eagerly scaffolds corresponding unit tests and API documentation without being asked).
  - **Style Matching**: When editing files, it actively cross-references your style guidelines in `MEMORY.md` to ensure any new code seamlessly matches your personal indentation, syntax structure, and architecture paradigms.
  - **Proactive Inquiries**: It proactively checks in on design patterns: *"I noticed you usually use functional piping for middleware in this repo. I will structure the new auth router in this same style."*
  - **Opportunistic Multi-Modal Pragmatism**: The agent does not stall if a high-level MCP tool is missing. If it possesses the required credentials, environment variables, or CLI tools, it eagerly utilizes direct REST API endpoints (via `fetch`/`curl`) or bash scripts to complete the task immediately.



---

## Sequential Implementation Plan

### Phase 1: Clean-Slate Scaffold & Config
1. **Initialize Project**: Scaffold a fresh Bun workspace.
2. **Schema-Bound Config Engine**: Build `settings.json` Zod validation and implement `update_settings.ts` for safe self-modification.
3. **Startup Interactive Interview**: Build the terminal auto-discovery logic and React Ink radio forms to interview the user about model/provider setups (and toggle `pi-memory` availability).

### Phase 2: Dynamic Agent Directory & Local LLM Integration
1. **Registered Resource Parser**: Build the settings reader that parses explicitly configured cloud keys, cloud agents, local LLMs, and active `pi-memory` setups.
2. **Skill Mapping Engine**: Compile the active resource profiles (strengths, costs, endpoints) and inject this dynamic capability directory into the system prompt.
3. **Local/Cloud Routing Client**: Implement standard adapters to query Ollama locally or execute remote agents in headless mode.
4. **Self-Extensibility Adapter Generator & Hot-Loader**: Build the dynamic ESM importer (`import()`) for `~/.polestar/providers/*.ts`, and the automated code-generation/self-healing compilation loop to bootstrap providers from arbitrary Agent SDKs.


### Phase 3: Isolated Workspace & Task Manager
1. **Strict Worktree Provisioner**: Implement Git Worktree spawning in temporary folders.
2. **Git Subtree Controller**: Build the shell wrappers to track and sync local git subtrees.
3. **Non-Blocking Task Manager**: Spawns asynchronous child processes and manages background CLI notifications.

### Phase 4: Tax-Free Core ReAct Loop & Memory Paging
1. **Pre-Turn Memory Search**: Implement the `pi-memory` pre-search hook that injects semantic matches into the start of LLM turn prompts.
2. **System Prompt Memory Ingestion**: Build the auto-reader for `MEMORY.md` guidelines.
3. **Tax-Free ReAct Loop**: Build the single `while (true)` execution loop, utilizing LLM finish reasons to control dynamic execution.
4. **SQLite Database Sync**: Implement history paging.
5. **Surgical Compaction**: Build the multi-layer compaction engine (collapsing terminal traces and massive files).

### Phase 5: UI & Lifecycle Logging
1. **Ink Artifact Panel**: Draw a split-screen panel in React Ink to render live-updating, persistent markdown artifacts located in `.polestar/artifacts/`.
2. **Post-Turn Auto-Logging Hook**: Implement the automated execution tracking hook that posts metadata to `pi-memory log` when tasks are successfully verified.
3. **Self-Healing Run Loop**: Implement automatic test failure loopbacks between Developer and Tester subagents.

---

## Synthesized System Prompt Foundation

PoleStar-X will harvest the absolute best practices from the system prompts of Claude Code, OpenCode, Gemini-CLI, and Codex:

### 1. Persona & Tone (Harvested from Claude Code & OpenCode)
- **Extreme Conciseness**: One-word answers for direct questions. Focus text output on decisions requiring input, high-level status updates, and blockers.
- **Eager but Disciplined**: Proactive about doing the right thing (like scaffolding tests for new features), but strict about not surprising the user with destructive actions without asking.
- **High-Signal Output**: Explain actions before taking them (especially destructive ones), but avoid conversational filler or repetitive reasoning.

### 2. Execution Mandates (Harvested from Claude Code & Gemini)
- **Validate Before Completion**: A task is not done until the code is proven to work. Automatically run lint, type-check, and tests before claiming success. Never fake or suppress failing test results.
- **Diagnose Before Pivoting**: If an approach fails, diagnose the root cause rather than blindly switching tactics or abandoning the effort entirely.
- **Context Efficiency**: Maximize parallel tool calls (e.g., parallel reads/greps) to preserve context and reduce turns. Minimize search bounds.
- **Topic Updates**: For long-running execution, utilize `update_topic` hooks to keep the user informed in the UI without cluttering the chat history.

### 3. Safety & Isolation Constraints (Zero-Blast-Radius Standard)
- **Absolute Destructive Confirmation Safeguard**: Under no circumstances must PoleStar-X execute any destructive, unrecoverable, or high-risk operations without explicit interactive human consent. The agent must recognize that low-level power (like raw bash access) comes with strict, unyielding responsibilities. Explicit user confirmation is strictly mandatory before performing:
  - Destructive filesystem commands (e.g. `rm -rf`, wiping directories, or deleting untracked files).
  - Destructive Git operations (e.g. force-pushing `git push -f`, hard resets `git reset --hard`, or deleting remote branches).
  - Service/Database purges (e.g. wiping SQL databases, resetting local keys, or clearing long-term caches).
- **Git Worktree Isolation Enforcement**: Strictly restrict automated experiments to the temporary Git Worktree sandbox. Do not run untested scripts, builds, or commands inside the primary workspace folder.
- **Workspace Conventions**: Strictly adhere to the project's existing architectural patterns, formatting, and libraries. Do not introduce foreign abstractions unless fundamentally required and approved.


## User Review Required
> [!IMPORTANT]
> The architectural blueprint and system prompt synthesis for PoleStar-X are now complete! Please review the design above (particularly the **First-Class pi-memory Integration** and the **Synthesized System Prompt Foundation**). Do you approve of this blueprint to move forward with implementation?
