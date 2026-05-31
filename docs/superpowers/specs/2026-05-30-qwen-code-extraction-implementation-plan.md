# Qwen-Code OpenAI Adapter — Step-by-Step Implementation Plan

**Companion to:** [2026-05-30-qwen-code-extraction-design.md](./2026-05-30-qwen-code-extraction-design.md)  
**Estimated Duration:** 10 working days  
**Team:** 1–2 engineers (1 primary, 1 reviewer/tester)

---

## Pre-Flight Checklist

Before writing code:

- [ ] Read the full [design spec](./2026-05-30-qwen-code-extraction-design.md) and [provider interface spec](./2026-05-30-provider-interface-design.md).
- [ ] Confirm `BaseLlmClient` interface is merged and stable in `packages/core/src/core/baseLlmClient.ts`.
- [ ] Confirm provider registry (`packages/core/src/providers/index.ts`) exists and can register new adapters.
- [ ] Run `npm ls openai` in the target repo. If absent, plan `npm install openai` as Step 0.
- [ ] Run the qwen-code test suite locally (`cd qwen-code && npm test -- openaiContentGenerator`) to establish a passing baseline.
- [ ] Snapshot the qwen-code `converter.test.ts` golden outputs into a scratch file for comparison during porting.

---

## Phase 1: Foundation (Days 1–2)

### Step 1.1 — Scaffold Directory Structure

**Files to create:**

```
packages/core/src/providers/openai/
├── index.ts                              # Public exports
├── OpenAIClient.ts                       # BaseLlmClient implementation
├── OpenAIContentGenerator.ts             # Thin wrapper (implements ContentGenerator if needed)
├── ContentGenerationPipeline.ts          # Orchestrator
├── GeminiOpenAIConverter.ts              # Bidirectional converter (stub)
├── requestConverter.ts                   # Gemini → OpenAI (stub)
├── responseConverter.ts                  # OpenAI → Gemini (stub)
├── streamingNormalizer.ts              # Cumulative-delta logic (stub)
├── StreamingToolCallParser.ts            # Tool-call accumulator (stub)
├── TaggedThinkingParser.ts             # <thinking> extractor (stub)
├── OpenAIErrorHandler.ts                 # Error translator (stub)
├── constants.ts                          # Timeouts, base URLs
├── types.ts                              # Internal types
└── provider/
    ├── index.ts                          # Barrel export
    ├── OpenAIProvider.ts               # Base interface
    ├── DefaultProvider.ts              # Generic OpenAI-compatible (stub)
    ├── DashScopeProvider.ts            # Alibaba Cloud (stub)
    ├── DeepSeekProvider.ts             # DeepSeek (stub)
    ├── OpenRouterProvider.ts           # OpenRouter (stub)
    └── MistralProvider.ts              # Mistral (stub)
```

**Action:** Create all files with `// TODO(Phase X): implement` stubs and valid TypeScript headers. Run `tsc --noEmit` to verify the directory compiles.

### Step 1.2 — Port `types.ts` and `constants.ts`

**Source files:**
- `qwen-code/packages/core/src/core/openaiContentGenerator/types.ts`
- `qwen-code/packages/core/src/core/openaiContentGenerator/constants.ts`

**Changes:**
- Rename `Qwen`-prefixed debug logger labels to `OpenAIAdapter`.
- Remove `userPromptId` from any type signatures.
- Ensure `StreamingTextDeltaState` interface is preserved exactly.

**Validation:**
```bash
npx tsc --noEmit packages/core/src/providers/openai/types.ts
```

### Step 1.3 — Port `OpenAIErrorHandler.ts`

**Source:** `qwen-code/packages/core/src/core/openaiContentGenerator/errorHandler.ts`

**Actions:**
1. Copy the class into `OpenAIErrorHandler.ts`.
2. Replace `createDebugLogger('OPENAI_ERROR')` with `createDebugLogger('OPENAI_ADAPTER_ERROR')`.
3. Verify `redactProxyError()` utility exists in our repo (it's from `utils/runtimeFetchOptions.ts`). If missing, port that utility first.

**Unit test:** Write `OpenAIErrorHandler.test.ts` with mock errors for:
- `ETIMEDOUT`
- `ESOCKETTIMEDOUT`
- `AbortError` (should suppress logging)
- Generic 500 with proxy URL in message (should redact)

### Step 1.4 — Port `OpenAICompatibleProvider` Interface

**Source:** `qwen-code/packages/core/src/core/openaiContentGenerator/provider/types.ts`

**Actions:**
1. Copy interface into `provider/OpenAIProvider.ts`.
2. Remove `buildRequest`'s `userPromptId` parameter (our `BaseLlmClient` doesn't use it).
3. Ensure `OpenAIRequestContextOverrides` and `OpenAIResponseParsingOptions` types are included.

### Step 1.5 — Port `DefaultProvider.ts`

**Source:** `qwen-code/packages/core/src/core/openaiContentGenerator/provider/default.ts`

**Actions:**
1. Copy class into `provider/DefaultProvider.ts`.
2. Rename class to `DefaultOpenAIProvider`.
3. Change `User-Agent` header from `QwenCode/...` to `OmniCLI/...`.
4. Replace `QWEN_CODE_MAX_OUTPUT_TOKENS` env var read with `OMNI_MAX_OUTPUT_TOKENS`.
5. Keep `mirrorReasoningContentForQwen3()` but document it as generic reasoning-field normalization.
6. Verify `tokenLimit()` and `hasExplicitOutputLimit()` utilities exist in our repo. If not, port from `qwen-code/packages/core/src/core/tokenLimits.ts`.

**Unit test:** Write `DefaultProvider.test.ts`:
- Builds correct `User-Agent`.
- Applies `OMNI_MAX_OUTPUT_TOKENS` override.
- Caps user `max_tokens` at model limit for known models.
- Respects user `max_tokens` for unknown models.

### Step 1.6 — Wire into Provider Registry

**Target:** `packages/core/src/providers/index.ts`

**Actions:**
1. Add `OpenAIClient` to the registry map under key `'openai'`.
2. Ensure `createProvider(config)` function can instantiate `OpenAIClient` from a `ModelConfig` object.
3. Add a simple smoke test: instantiate `OpenAIClient` with a mock config and assert it is truthy.

**Checkpoint:** `npm run typecheck` must pass. No runtime tests required yet.

---

## Phase 2: Converter Core (Days 3–5)

### Step 2.1 — Port `convertGeminiToolsToOpenAI`

**Source:** `qwen-code/packages/core/src/core/openaiContentGenerator/converter.ts` (lines ~300–400)

**Target:** `requestConverter.ts` → `convertTools()`

**Actions:**
1. Extract the function and its helper `convertGeminiToolParametersToOpenAI()`.
2. Preserve both `parameters` (Gemini) and `parametersJsonSchema` (MCP) branches.
3. Preserve `convertSchema(parameters, schemaCompliance)` call.

**Unit test:** Write `requestConverter.test.ts`:
- Gemini-style tool with `parameters` → OpenAI `function.parameters`.
- MCP-style tool with `parametersJsonSchema` → OpenAI `function.parameters`.
- Schema compliance mode `'openapi_30'` strips unsupported fields.

### Step 2.2 — Port `convertGeminiRequestToOpenAI`

**Source:** `qwen-code/packages/core/src/core/openaiContentGenerator/converter.ts` (lines ~420–550)

**Target:** `requestConverter.ts` → `convertContents()` + `convertRequest()`

**Actions:**
1. Extract `addSystemInstructionMessage`, `processContents`, `extractTextFromContentUnion`, `convertPartToOpenAIContentPart`.
2. Handle all Gemini `Part` types:
   - `text` → `ChatCompletionContentPartText`
   - `inlineData` (base64) → `image_url` with `data:` URI
   - `fileData` (GCS URI) → `image_url` with public URL
   - `functionCall` → `assistant` message with `tool_calls`
   - `functionResponse` → `tool` message with `tool_call_id`
   - `executableCode` / `codeExecutionResult` → text placeholders (not supported by OpenAI)
3. Implement `cleanOrphanedToolCalls()` and `mergeConsecutiveAssistantMessages()` exactly as in qwen-code.
4. Implement `splitToolMedia` logic: if enabled, media parts in tool results are hoisted to a follow-up `user` message.

**Unit test:** Write exhaustive `requestConverter.test.ts` cases:
- Simple text user message.
- System instruction as string, Part, and Content.
- Multi-turn with function call + function response.
- Orphaned tool call cleanup.
- Consecutive assistant message merge.
- Image inline data conversion.
- Tool-result media splitting (`splitToolMedia: true`).

### Step 2.3 — Port `convertOpenAIResponseToGemini` (Non-Streaming)

**Source:** `qwen-code/packages/core/src/core/openaiContentGenerator/converter.ts` (lines ~570–700)

**Target:** `responseConverter.ts` → `convertOpenAIResponseToGemini()`

**Actions:**
1. Map `choices[0].message` → Gemini `Candidate` with `Content` and `Part[]`.
2. Map `message.content` → `Part.text`.
3. Map `message.reasoning_content` / `message.reasoning` → `Part.text` with `thought: true`.
4. Map `message.tool_calls` → `Part.functionCall` array.
5. Map `usage` → `usageMetadata`.
6. Map `finish_reason` → `FinishReason`.

**Unit test:** Snapshot test against qwen-code `converter.test.ts` golden data.

### Step 2.4 — Port `convertOpenAIChunkToGemini` (Streaming)

**Source:** `qwen-code/packages/core/src/core/openaiContentGenerator/converter.ts` (lines ~700–900)

**Target:** `responseConverter.ts` → `convertOpenAIChunkToGemini()`

**Actions:**
1. Port `normalizeStreamingTextDelta()` into `streamingNormalizer.ts` as a pure function.
2. Preserve all thresholds: `CUMULATIVE_DELTA_EXACT_REPEAT_MIN_LENGTH = 64`, `CUMULATIVE_DETECTION_WINDOW_BYTES = 1024`.
3. Handle `delta.content` (text), `delta.reasoning_content` / `delta.reasoning` (thinking), `delta.tool_calls` (streaming tool calls).
4. Integrate `StreamingToolCallParser` for tool-call accumulation.
5. Return a `GenerateContentResponse` with a single `Candidate` and `content.parts`.

**Unit test:**
- Incremental stream: `"He"`, `"llo"`, `" world"` → three chunks with correct text.
- Cumulative stream: `"Hello"`, `"Hello world"`, `"Hello world!"` → three chunks with correct suffixes, no duplication.
- Exact-repeat suppression: chunk of 64+ identical bytes → cumulative mode, suppress.
- Thinking stream: interleaved `content` and `reasoning_content` deltas → separate `Part` objects.

### Step 2.5 — Port `StreamingToolCallParser`

**Source:** `qwen-code/packages/core/src/core/openaiContentGenerator/streamingToolCallParser.ts`

**Target:** `StreamingToolCallParser.ts`

**Actions:**
1. Port the class verbatim. Do **not** rewrite the algorithm.
2. Ensure `addChunk()` returns `ToolCallParseResult` with `complete`, `value`, `error`, `repaired`.
3. Preserve index-collision logic (`findNextAvailableIndex`, `findMostRecentIncompleteIndex`).

**Unit test:** Port qwen-code's existing tests (if any) and add new cases:
- Single tool call across 5 chunks → completes at depth 0.
- Two tool calls with same index but different IDs → collision resolved.
- Chunk without ID routed to incomplete call.
- Broken JSON auto-repair (unclosed string).

### Step 2.6 — Port `TaggedThinkingParser`

**Source:** `qwen-code/packages/core/src/core/openaiContentGenerator/taggedThinkingParser.ts`

**Target:** `TaggedThinkingParser.ts`

**Actions:**
1. Port verbatim. This is a small regex-based extractor.

**Unit test:**
- `<thinking>plan</thinking>text` → splits correctly.
- No tags → returns undefined.

### Step 2.7 — Port `ContentGenerationPipeline`

**Source:** `qwen-code/packages/core/src/core/openaiContentGenerator/pipeline.ts`

**Target:** `ContentGenerationPipeline.ts`

**Actions:**
1. Port `execute()` (non-streaming path).
2. Port `executeStream()` (streaming path).
3. Port `processStreamWithLogging()` with chunk merging logic.
4. Port `handleChunkMerging()` for finish+usage chunk merge.
5. Port `StreamContentError` detection (`finish_reason === 'error_finish'`).
6. Remove `userPromptId` parameter from all methods.

**Integration test:** Mock OpenAI SDK client:
- Non-streaming: mock `chat.completions.create` returning a full `ChatCompletion`, verify `GenerateContentResponse`.
- Streaming: mock returning an `AsyncIterable<ChatCompletionChunk>`, verify yielded chunks match expected Gemini format.
- Chunk merge: mock sending finish chunk then usage chunk, verify single merged yield.
- Stream error: mock sending `error_finish`, verify `StreamContentError` thrown.

**Checkpoint:** All Phase 2 unit and integration tests must pass.

---

## Phase 3: Provider Specialization (Days 6–7)

### Step 3.1 — Port `DashScopeProvider.ts`

**Source:** `qwen-code/packages/core/src/core/openaiContentGenerator/provider/dashscope.ts`

**Actions:**
1. Copy class into `provider/DashScopeProvider.ts`.
2. Rename to `DashScopeProvider`.
3. Remove non-streaming `X-DashScope-SSE` logic (we only stream).
4. Keep metadata header injection for session tracking.
5. Keep `enableCacheControl` path for `cache_control` headers.

**Unit test:**
- `isDashScopeProvider(config)` returns true for DashScope base URLs.
- Headers include expected metadata.

### Step 3.2 — Port `DeepSeekProvider.ts`

**Source:** `qwen-code/packages/core/src/core/openaiContentGenerator/provider/deepseek.ts`

**Actions:**
1. Copy class into `provider/DeepSeekProvider.ts`.
2. Keep `isDeepSeekHostname()` detection.
3. Keep reasoning effort mapping.

**Unit test:**
- Hostname detection works for `api.deepseek.com`.
- `buildRequest` injects `reasoning_effort` when configured.

### Step 3.3 — Port `OpenRouterProvider.ts`

**Source:** `qwen-code/packages/core/src/core/openaiContentGenerator/provider/openrouter.ts`

**Actions:**
1. Copy class into `provider/OpenRouterProvider.ts`.
2. Keep `HTTP-Referer` and `X-Title` headers.
3. Keep `max_tokens` special handling.

### Step 3.4 — Port `MistralProvider.ts`

**Source:** `qwen-code/packages/core/src/core/openaiContentGenerator/provider/mistral.ts`

**Actions:**
1. Copy class into `provider/MistralProvider.ts`.

### Step 3.5 — Implement Provider Auto-Detection

**Target:** `providers/openai/index.ts` → `createProvider(config)`

**Logic:**
```typescript
export function createProvider(config: OpenAIClientConfig): OpenAICompatibleProvider {
  if (config.baseUrl?.includes('dashscope.aliyuncs.com')) {
    return new DashScopeProvider(config);
  }
  if (config.baseUrl?.includes('deepseek.com')) {
    return new DeepSeekProvider(config);
  }
  if (config.baseUrl?.includes('openrouter.ai')) {
    return new OpenRouterProvider(config);
  }
  if (config.providerType) {
    switch (config.providerType) {
      case 'dashscope': return new DashScopeProvider(config);
      case 'deepseek': return new DeepSeekProvider(config);
      case 'openrouter': return new OpenRouterProvider(config);
      case 'mistral': return new MistralProvider(config);
    }
  }
  return new DefaultProvider(config);
}
```

**Unit test:**
- Each URL pattern selects the correct provider.
- Explicit `providerType` overrides URL heuristic.
- Unknown URL defaults to `DefaultProvider`.

### Step 3.6 — Configuration Schema & Validation

**Target:** `packages/core/src/config/settingsSchema.ts` (or equivalent)

**Actions:**
1. Add `modelProviders.openai[]` array schema with fields:
   - `id`, `name`, `baseUrl`, `description`, `envKey`
   - `generationConfig.extra_body`
   - `generationConfig.enable_thinking`
   - `samplingParams`
   - `schemaCompliance`
   - `splitToolMedia`
2. Add `security.auth.selectedType: 'openai'` enum value.
3. Add validation: if `selectedType === 'openai'`, ensure at least one provider is configured and has an API key resolved.

**Unit test:**
- Valid config passes validation.
- Missing `apiKey` throws `MissingApiKeyError`.
- Missing `baseUrl` for Anthropic throws `MissingBaseUrlError` (if Anthropic adapter shares this path).

---

## Phase 4: Integration & Polish (Days 8–10)

### Step 4.1 — Hook `countTokens` into Context Compression

**Target:** `packages/core/src/core/modelRouterService.ts`

**Actions:**
1. When the active provider is `OpenAIClient`, route `countTokens()` calls to the adapter instead of the native Gemini tokenizer.
2. Ensure `estimateTokens()` (fast sync fallback) is used by the compression hot loop.

**Validation:**
- Run a long conversation (>50 turns) with `FAKE_LLM=openai` and verify no truncation errors.
- Compare `countTokens` output to actual OpenAI `usage.prompt_tokens` from a real call; drift should be <5%.

### Step 4.2 — End-to-End CLI Smoke Test

**Actions:**
1. Configure `~/.omni/settings.json` with a fake/mock OpenAI provider.
2. Run `omni` in a test project.
3. Send a simple prompt: `"What does this project do?"`
4. Verify:
   - Request reaches the mock server with correct `messages` payload.
   - Response renders correctly in the TUI.
   - No TypeError or undefined dereference in the adapter path.

### Step 4.3 — Tool Calling E2E Test

**Actions:**
1. Run `omni` with a mock server that returns a `tool_calls` chunk.
2. Verify:
   - Tool call is parsed into a `FunctionCall` part.
   - MCP execution loop receives the correct name and arguments.
   - Function response is sent back in the next request as a `tool` message.

### Step 4.4 — Cumulative Delta Torture Test

**Actions:**
1. Create a mock server that emits cumulative-style chunks (replay full buffer each time).
2. Run a 100-chunk stream with random text lengths (10–500 chars per chunk).
3. Assert final assembled text equals the final chunk's content with zero duplication.

### Step 4.5 — Abort & Memory Leak Test

**Actions:**
1. Start a long stream.
2. Fire `AbortSignal` at random chunk boundaries (chunk 3, 7, 15, 50).
3. Verify:
   - Stream terminates immediately.
   - `StreamingToolCallParser` state is garbage-collectible (no closures holding references).
   - No unhandled promise rejections.

### Step 4.6 — Performance Baseline

**Actions:**
1. Benchmark `normalizeStreamingTextDelta` with a 100KB cumulative stream.
2. Assert processing time <10ms per chunk (should be O(1) after cumulative mode is established).
3. Assert memory usage does not grow with stream length (text buffer is capped at window size).

### Step 4.7 — Regression Test: Gemini Native Path

**Actions:**
1. Run the full existing test suite with `FAKE_LLM=gemini`.
2. Verify zero regressions in Gemini-native path.
3. Verify provider registry correctly falls back to Gemini when `selectedType !== 'openai'`.

### Step 4.8 — Documentation

**Actions:**
1. Write `packages/core/src/providers/openai/README.md` with:
   - Supported providers list.
   - Configuration examples for OpenAI, DashScope, Ollama, OpenRouter.
   - Known limitations (modality support, tool schema differences).
2. Update top-level `README.md` or docs site with "Using OpenAI-compatible providers" section.

### Step 4.9 — Final Code Review Checklist

- [ ] Every qwen-code file has a corresponding port in our repo.
- [ ] No `TODO(Phase X)` comments remain.
- [ ] No `QwenCode` strings remain (except in source attribution comments).
- [ ] All new files have Apache-2.0 license headers.
- [ ] Test coverage for new code ≥85%.
- [ ] `npm run lint` passes with zero warnings.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes (full suite).
- [ ] `npm run build` produces no errors.

---

## Daily Standup Questions

Each day, answer:
1. What step did I complete yesterday?
2. What step am I working on today?
3. What blockers or risks have emerged?

---

## Rollback Plan

If a critical bug is found in production after merge:

1. **Immediate:** Users can revert to Gemini by setting `security.auth.selectedType: 'gemini'` in `~/.omni/settings.json`.
2. **Short-term:** Toggle the provider registry to skip `openai` key instantiation (feature flag in `providers/index.ts`).
3. **Long-term:** Revert the PR and re-open the implementation task.
