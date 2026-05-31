# Task: Port Qwen-Code OpenAI Adapter to Omni CLI

**Task ID:** T-2026-05-30-OPENAI-ADAPTER  
**Spec:** [2026-05-30-qwen-code-extraction-design.md](../specs/2026-05-30-qwen-code-extraction-design.md)  
**Plan:** [2026-05-30-qwen-code-extraction-implementation-plan.md](../specs/2026-05-30-qwen-code-extraction-implementation-plan.md)  
**Priority:** P0 — Blocks multi-provider support  
**Assignee:** TBD  
**Reviewer:** TBD  
**Estimated Duration:** 10 working days  
**Target Milestone:** Omni CLI v0.9.0

---

## Status

```
[░░░░░░░░░░] 0% — Not started
```

---

## Prerequisites

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | `BaseLlmClient` interface merged | ⬜ | See [provider-interface-design.md](../specs/2026-05-30-provider-interface-design.md) |
| 2 | Provider registry exists | ⬜ | `packages/core/src/providers/index.ts` |
| 3 | `openai` SDK installed | ⬜ | `npm install openai` or verify in `package.json` |
| 4 | Qwen-code repo cloned locally | ⬜ | For reference during porting |
| 5 | Qwen-code test baseline recorded | ⬜ | Run `npm test -- openaiContentGenerator` in qwen-code |

---

## Phase 1: Foundation (Days 1–2)

| # | Step | Assignee | Status | Est. | Actual | PR |
|---|------|----------|--------|------|--------|-----|
| 1.1 | Scaffold `packages/core/src/providers/openai/` directory + stub files | | ⬜ | 2h | | |
| 1.2 | Port `types.ts` and `constants.ts` | | ⬜ | 1h | | |
| 1.3 | Port `OpenAIErrorHandler.ts` + unit tests | | ⬜ | 3h | | |
| 1.4 | Port `OpenAICompatibleProvider` interface | | ⬜ | 1h | | |
| 1.5 | Port `DefaultProvider.ts` + unit tests | | ⬜ | 4h | | |
| 1.6 | Wire `OpenAIClient` into provider registry | | ⬜ | 2h | | |

**Phase 1 Definition of Done:**
- [ ] `npm run typecheck` passes with all new files.
- [ ] `OpenAIErrorHandler.test.ts` passes (timeout, redaction, abort suppression).
- [ ] `DefaultProvider.test.ts` passes (headers, token limits).
- [ ] Provider registry can instantiate `OpenAIClient` without runtime errors.

---

## Phase 2: Converter Core (Days 3–5)

| # | Step | Assignee | Status | Est. | Actual | PR |
|---|------|----------|--------|------|--------|-----|
| 2.1 | Port `convertGeminiToolsToOpenAI` + unit tests | | ⬜ | 4h | | |
| 2.2 | Port `convertGeminiRequestToOpenAI` + unit tests | | ⬜ | 6h | | |
| 2.3 | Port `convertOpenAIResponseToGemini` (non-streaming) + tests | | ⬜ | 3h | | |
| 2.4 | Port `convertOpenAIChunkToGemini` (streaming) + tests | | ⬜ | 8h | | |
| 2.5 | Port `StreamingToolCallParser` + unit tests | | ⬜ | 6h | | |
| 2.6 | Port `TaggedThinkingParser` + unit tests | | ⬜ | 1h | | |
| 2.7 | Port `ContentGenerationPipeline` + integration tests | | ⬜ | 8h | | |

**Phase 2 Definition of Done:**
- [ ] All request converter tests pass (tools, contents, system instructions, media, orphaned cleanup).
- [ ] All response converter tests pass (non-streaming, streaming, thinking, tool calls).
- [ ] Cumulative-delta normalization exhibits zero duplication on mock streams.
- [ ] `StreamingToolCallParser` handles index collisions correctly.
- [ ] `ContentGenerationPipeline` integration tests pass (standard stream, cumulative stream, chunk merge, stream error).

---

## Phase 3: Provider Specialization (Days 6–7)

| # | Step | Assignee | Status | Est. | Actual | PR |
|---|------|----------|--------|------|--------|-----|
| 3.1 | Port `DashScopeProvider.ts` + unit tests | | ⬜ | 3h | | |
| 3.2 | Port `DeepSeekProvider.ts` + unit tests | | ⬜ | 2h | | |
| 3.3 | Port `OpenRouterProvider.ts` + unit tests | | ⬜ | 2h | | |
| 3.4 | Port `MistralProvider.ts` + unit tests | | ⬜ | 1h | | |
| 3.5 | Implement provider auto-detection heuristic | | ⬜ | 2h | | |
| 3.6 | Add OpenAI provider config schema + validation | | ⬜ | 4h | | |

**Phase 3 Definition of Done:**
- [ ] Each provider has unit tests for header construction and request mutation.
- [ ] Auto-detection selects correct provider for known base URLs.
- [ ] Explicit `providerType` override works.
- [ ] Config validation rejects missing `apiKey` with helpful error.

---

## Phase 4: Integration & Polish (Days 8–10)

| # | Step | Assignee | Status | Est. | Actual | PR |
|---|------|----------|--------|------|--------|-----|
| 4.1 | Hook `countTokens` into context compression (`modelRouterService.ts`) | | ⬜ | 3h | | |
| 4.2 | End-to-end CLI smoke test (simple prompt) | | ⬜ | 2h | | |
| 4.3 | Tool calling E2E test | | ⬜ | 3h | | |
| 4.4 | Cumulative delta torture test (100-chunk mock) | | ⬜ | 2h | | |
| 4.5 | Abort & memory leak test | | ⬜ | 2h | | |
| 4.6 | Performance baseline (`normalizeStreamingTextDelta`) | | ⬜ | 1h | | |
| 4.7 | Regression test: Gemini native path | | ⬜ | 2h | | |
| 4.8 | Write `providers/openai/README.md` + user docs | | ⬜ | 3h | | |
| 4.9 | Final code review + lint/typecheck/build gate | | ⬜ | 2h | | |

**Phase 4 Definition of Done:**
- [ ] Long conversation (>50 turns) with fake OpenAI provider completes without truncation.
- [ ] Tool call round-trip works end-to-end (request → execute → response).
- [ ] Cumulative stream torture test passes with zero duplication.
- [ ] Abort at any chunk boundary terminates cleanly.
- [ ] Gemini native path shows zero regressions in `npm run test`.
- [ ] New code test coverage ≥85%.
- [ ] `npm run lint` passes zero warnings.
- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes.
- [ ] Documentation merged.

---

## Blockers

| # | Description | Raised | Resolved | Impact |
|---|-------------|--------|----------|--------|
| B1 | `BaseLlmClient` interface not yet merged | | | Blocks all work |
| B2 | `openai` SDK version conflict with existing dependencies | | | May need resolution override |
| B3 | `redactProxyError()` utility missing from target repo | | | Blocks error handler port |
| B4 | `tokenLimit()` utility missing from target repo | | | Blocks default provider port |

---

## Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|------|-----------|--------|------------|-------|
| R1 | Cumulative-delta logic drifts, causing duplication | Medium | High | Golden test fixtures from qwen-code; property tests | |
| R2 | Tool-call index collision misses edge case | Medium | High | Port parser verbatim; do not rewrite | |
| R3 | MCP schema translation produces invalid OpenAI JSON Schema | Low | High | Validate all MCP schemas against OpenAI subset | |
| R4 | `max_tokens` default truncates long responses | Low | Medium | 8K default + retry at model limit | |
| R5 | Provider auto-detection misclassifies custom URL | Low | Low | Allow explicit `providerType` override | |
| R6 | Binary size increase from `openai` SDK | Medium | Low | Tree-shake; evaluate peer dep | |

---

## Test Inventory

### New Unit Test Files to Create

| File | Lines (est.) | Coverage Target | Phase |
|------|-------------|-----------------|-------|
| `OpenAIErrorHandler.test.ts` | ~120 | 100% branches | 1 |
| `DefaultProvider.test.ts` | ~150 | 100% branches | 1 |
| `requestConverter.test.ts` | ~400 | All Part types, tool shapes, media | 2 |
| `responseConverter.test.ts` | ~300 | Streaming + non-streaming | 2 |
| `streamingNormalizer.test.ts` | ~200 | Cumulative, incremental, hybrid | 2 |
| `StreamingToolCallParser.test.ts` | ~250 | Collision, fragmentation, repair | 2 |
| `TaggedThinkingParser.test.ts` | ~50 | Tag extraction | 2 |
| `ContentGenerationPipeline.test.ts` | ~300 | Mock stream integration | 2 |
| `DashScopeProvider.test.ts` | ~80 | Headers, cache control | 3 |
| `DeepSeekProvider.test.ts` | ~60 | Hostname, reasoning | 3 |
| `OpenRouterProvider.test.ts` | ~60 | Headers, max_tokens | 3 |
| `MistralProvider.test.ts` | ~40 | Detection | 3 |
| `providerAutoDetection.test.ts` | ~80 | URL heuristic, override | 3 |
| `openaiConfigValidation.test.ts` | ~100 | Schema validation | 3 |

**Total estimated new test LoC:** ~2,190

---

## Files to Create

```
packages/core/src/providers/openai/
├── index.ts
├── OpenAIClient.ts
├── OpenAIContentGenerator.ts
├── ContentGenerationPipeline.ts
├── GeminiOpenAIConverter.ts
├── requestConverter.ts
├── responseConverter.ts
├── streamingNormalizer.ts
├── StreamingToolCallParser.ts
├── TaggedThinkingParser.ts
├── OpenAIErrorHandler.ts
├── constants.ts
├── types.ts
├── README.md
└── provider/
    ├── index.ts
    ├── OpenAIProvider.ts
    ├── DefaultProvider.ts
    ├── DashScopeProvider.ts
    ├── DeepSeekProvider.ts
    ├── OpenRouterProvider.ts
    └── MistralProvider.ts

packages/core/src/providers/openai/__tests__/
├── OpenAIErrorHandler.test.ts
├── DefaultProvider.test.ts
├── requestConverter.test.ts
├── responseConverter.test.ts
├── streamingNormalizer.test.ts
├── StreamingToolCallParser.test.ts
├── TaggedThinkingParser.test.ts
├── ContentGenerationPipeline.test.ts
├── DashScopeProvider.test.ts
├── DeepSeekProvider.test.ts
├── OpenRouterProvider.test.ts
├── MistralProvider.test.ts
├── providerAutoDetection.test.ts
└── openaiConfigValidation.test.ts
```

---

## Files to Modify

| File | Reason | Phase |
|------|--------|-------|
| `packages/core/src/providers/index.ts` | Register `OpenAIClient` | 1 |
| `packages/core/src/core/modelRouterService.ts` | Route `countTokens` to adapter | 4 |
| `packages/core/src/config/settingsSchema.ts` | Add OpenAI provider schema | 3 |
| `packages/core/src/config/config.ts` | Add `getOpenAIProviders()` accessor | 3 |
| `package.json` | Add `openai` dependency (if missing) | 0 |
| `README.md` (top-level) | Document multi-provider setup | 4 |

---

## Acceptance Criteria

- [ ] User can set `security.auth.selectedType: 'openai'` in `~/.omni/settings.json` and the CLI starts without errors.
- [ ] User can configure multiple OpenAI-compatible providers (OpenAI, DashScope, Fireworks, Ollama, OpenRouter) and switch between them.
- [ ] Streaming responses render correctly for standard incremental providers (OpenAI, Fireworks).
- [ ] Streaming responses render correctly for cumulative providers (DashScope) with zero text duplication.
- [ ] Tool calling works end-to-end: function calls are emitted, executed by MCP loop, and responses fed back as `tool` messages.
- [ ] Reasoning/thinking content is extracted and displayed in the UI.
- [ ] Abort (Ctrl-C) terminates the stream immediately with no unhandled rejections.
- [ ] Gemini native path shows zero regressions.
- [ ] Test coverage for new code ≥85%.
- [ ] All lint, typecheck, and build gates pass.

---

## Notes / Scratchpad

<!-- Use this section for running notes during implementation -->

- 
