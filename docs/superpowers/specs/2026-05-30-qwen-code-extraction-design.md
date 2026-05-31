# Spec 2: Qwen-Code OpenAI Adapter Extraction

**Date:** 2026-05-30  
**Status:** Draft → Ready for Review  
**Related Specs:** [Provider Interface Design](./2026-05-30-provider-interface-design.md), [Copilot Extraction](./2026-05-30-copilot-extraction-design.md)  
**Source Repository:** `QwenLM/qwen-code` (commit `main` as of 2026-05-30)

---

## 1. Objective

Instantly unlock support for **OpenAI**, **Anthropic**, **Qwen (DashScope)**, **Fireworks**, **OpenRouter**, **DeepSeek**, **Mistral**, **Ollama**, and any other OpenAI-compatible endpoint by porting the production-hardened `OpenAIContentGenerator` subsystem from the `QwenLM/qwen-code` fork.

Unlike a naive `fetch()` wrapper, the qwen-code implementation contains battle-tested logic for:
- Cumulative-delta normalization (DashScope and other Chinese providers replay the entire buffer on every SSE chunk).
- Streaming tool-call reconstruction with index-collision handling.
- Reasoning/thinking content extraction (`reasoning_content`, `reasoning` fields).
- Schema compliance modes (`auto` vs `openapi_30`) for tool definitions.
- Provider-specific quirks (output token limits, cache control, custom headers, media splitting).

Our goal is to extract this subsystem, strip qwen-specific hacks, and adapt it to our `BaseLlmClient` interface so it becomes a first-class provider adapter in our universal provider architecture.

---

## 2. Source Inventory

The following files in `qwen-code/packages/core/src/core/openaiContentGenerator/` constitute the subsystem:

| File | Lines | Purpose |
|------|-------|---------|
| `openaiContentGenerator.ts` | ~180 | Implements `ContentGenerator` interface; entry point |
| `pipeline.ts` | ~280 | Orchestrates `buildRequest` → `chat.completions.create` → stream conversion |
| `converter.ts` | ~1,600 | Bidirectional translation between Gemini (`@google/genai`) and OpenAI formats |
| `types.ts` | ~80 | `PipelineConfig`, `RequestContext`, `StreamingTextDeltaState`, `ErrorHandler` |
| `constants.ts` | ~15 | Base URLs, defaults (`DEFAULT_TIMEOUT=120000`, `DEFAULT_MAX_RETRIES=3`) |
| `errorHandler.ts` | ~90 | `EnhancedErrorHandler` with timeout detection and redaction |
| `streamingToolCallParser.ts` | ~280 | Stateful parser for fragmented tool-call JSON across SSE chunks |
| `taggedThinkingParser.ts` | ~40 | Extracts `<thinking>` tags from text deltas |
| `requestCaptureContext.ts` | ~30 | Telemetry/log correlation helpers |
| `responseParsingOptions.ts` | ~20 | Per-provider parser feature flags |
| `provider/index.ts` | ~20 | Barrel export for 8 provider implementations |
| `provider/types.ts` | ~40 | `OpenAICompatibleProvider` interface |
| `provider/default.ts` | ~180 | `DefaultOpenAICompatibleProvider` (OpenAI, Fireworks, Ollama, etc.) |
| `provider/dashscope.ts` | ~200 | Alibaba Cloud DashScope-specific headers, metadata, cache control |
| `provider/deepseek.ts` | ~60 | DeepSeek hostname detection, reasoning field mapping |
| `provider/openrouter.ts` | ~80 | OpenRouter routing headers, `max_tokens` handling |
| `provider/mistral.ts` | ~50 | Mistral-specific validation |
| `provider/minimax.ts` | ~50 | MiniMax provider detection |
| `provider/mimo.ts` | ~50 | MiMo provider detection |
| `provider/modelscope.ts`| ~50 | ModelScope provider detection |

**Total:** ~2,900 LoC across 17 files.

---

## 3. Target Architecture

### 3.1 Integration Point

The adapter will implement the `BaseLlmClient` interface defined in [Provider Interface Design](./2026-05-30-provider-interface-design.md). It lives alongside the Copilot adapter:

```
packages/core/src/providers/
├── index.ts                              # Provider registry
├── openai/
│   ├── OpenAIClient.ts                   # Implements BaseLlmClient
│   ├── OpenAIContentGenerator.ts         # Thin wrapper (from qwen-code entry point)
│   ├── ContentGenerationPipeline.ts      # Orchestrator (from pipeline.ts)
│   ├── GeminiOpenAIConverter.ts          # Bidirectional converter (from converter.ts)
│   ├── StreamingToolCallParser.ts        # Tool-call accumulator (from streamingToolCallParser.ts)
│   ├── TaggedThinkingParser.ts         # <thinking> extractor (from taggedThinkingParser.ts)
│   ├── OpenAIErrorHandler.ts             # Error translator (from errorHandler.ts)
│   ├── constants.ts                    # Timeouts, base URLs
│   ├── types.ts                        # Internal types
│   └── provider/
│       ├── index.ts
│       ├── OpenAIProvider.ts             # Base interface
│       ├── DefaultProvider.ts            # Generic OpenAI-compatible
│       ├── DashScopeProvider.ts          # Alibaba Cloud
│       ├── DeepSeekProvider.ts           # DeepSeek
│       ├── OpenRouterProvider.ts         # OpenRouter
│       ├── MistralProvider.ts            # Mistral
│       └── ... (additional as needed)
```

### 3.2 Why Keep the Internal Gemini Format?

Our `BaseLlmClient` uses `@google/genai` types (`GenerateContentParameters`, `Content`, `Part`, `Tool`, `FunctionDeclaration`) as the **internal lingua franca**. This is intentional:

1. **Context compression** (`modelRouterService.ts`) already understands Gemini `Part` semantics (text, inlineData, fileData, functionCall, functionResponse).
2. **Tool definitions** throughout the CLI are authored in Gemini `FunctionDeclaration` format.
3. **The qwen-code converter already does this.** We are not inventing a mapping; we are porting a proven one.

The adapter is a **network-edge translator**: Gemini in → OpenAI wire format out → OpenAI SSE stream in → Gemini response chunks out.

---

## 4. Component Breakdown

### 4.1 `OpenAIClient.ts` — `BaseLlmClient` Implementation

```typescript
export class OpenAIClient implements BaseLlmClient {
  private pipeline: ContentGenerationPipeline;

  constructor(config: OpenAIClientConfig) {
    const provider = createProvider(config);
    this.pipeline = new ContentGenerationPipeline({
      provider,
      contentGeneratorConfig: config,
      errorHandler: new OpenAIErrorHandler(),
    });
  }

  async generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse> {
    return this.pipeline.execute(request);
  }

  async *generateContentStream(
    request: GenerateContentParameters,
  ): AsyncGenerator<GenerateContentResponse> {
    yield* this.pipeline.executeStream(request);
  }

  async countTokens(request: CountTokensParameters): Promise<number> {
    // Prefer character-based estimator; fallback to JSON.length/4
    const estimator = new RequestTokenEstimator();
    return (await estimator.calculateTokens(request)).totalTokens;
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
```

**Key design decision:** We omit the `userPromptId` parameter that qwen-code carries through every call. Our `BaseLlmClient` interface does not expose it; internal logging correlation will use `AbortSignal` + request start time instead.

### 4.2 `GeminiOpenAIConverter.ts` — The Translation Engine

This is the largest and riskiest file to port (~1,600 LoC). We decompose it into **pure, stateless functions** to improve testability:

#### 4.2.1 Request Path (Gemini → OpenAI)

| Function | Responsibility |
|----------|--------------|
| `convertTools(geminiTools: ToolListUnion): OpenAI.Chat.ChatCompletionTool[]` | Maps `FunctionDeclaration` → `ChatCompletionTool`. Handles both Gemini `parameters` and MCP `parametersJsonSchema`. |
| `convertContents(contents: ContentListUnion, options?): ChatCompletionMessageParam[]` | Recursively walks Gemini `Content`/`Part` tree and emits OpenAI message roles (`system`, `user`, `assistant`, `tool`). |
| `convertSystemInstruction(inst: string \| Part \| Content): string` | Extracts plain text from Gemini system instruction format. |
| `convertRequest(params: GenerateContentParameters): ChatCompletionCreateParams` | Assembles `model`, `messages`, `tools`, `tool_choice`, `temperature`, `max_tokens`, `stream`, `response_format`. |

**Critical mappings:**

- **Tool schema translation:** Gemini uses `type: 'integer' | 'number' | 'string' | 'boolean' | 'array' | 'object'` with `properties`/`required`. OpenAI Chat Completions expects JSON Schema. The qwen-code converter normalizes case, coerces stringified numeric constraints (`minimum`, `maximum`, `minLength`, etc.) to actual numbers, and optionally runs `convertSchema(schema, complianceMode)` for strict OpenAPI 3.0 compliance.
- **Media parts:** Gemini `inlineData` (base64) becomes OpenAI `image_url` with `data:` URI. Gemini `fileData` (GCS URI) becomes `image_url` with public URL. Unsupported modalities (video, audio) become text placeholders unless the provider explicitly supports them.
- **Function call / function response pairing:** OpenAI requires strict `assistant` (with `tool_calls`) → `tool` (with `tool_call_id`) alternation. The converter merges consecutive assistant messages and cleans orphaned tool calls.
- **Tool-result media splitting:** When `splitToolMedia: true` (set by strict providers like LM Studio), media parts inside a `functionResponse` are hoisted into a follow-up `user` message containing only the media, while the `tool` message retains the text payload. This avoids HTTP 400 on strict servers.

#### 4.2.2 Response Path (OpenAI → Gemini)

| Function | Responsibility |
|----------|--------------|
| `convertOpenAIResponseToGemini(completion: ChatCompletion): GenerateContentResponse` | Non-streaming full-response conversion. |
| `convertOpenAIChunkToGemini(chunk: ChatCompletionChunk, context: RequestContext): GenerateContentResponse` | Per-SSE-chunk conversion; the hot path. |

**Chunk-level behaviors:**

1. **Text delta normalization:** `normalizeStreamingTextDelta(rawDelta, state)` handles the infamous *cumulative delta* problem. Some providers (DashScope, certain Alibaba Cloud endpoints) replay the entire accumulated string in every `delta.content` instead of incremental suffixes. The state machine tracks `emittedText`, `emittedLength`, and `cumulativeMode` to deduplicate without suppressing legitimate short repeats.

2. **Reasoning extraction:** Qwen3 models emit reasoning via `delta.reasoning_content` or `delta.reasoning`. These are collected into Gemini `Part` objects with `thought: true` metadata so the UI can render them in a thinking block.

3. **Tool-call streaming accumulation:** Each chunk may contain a partial `tool_calls[]` entry. The converter delegates to `StreamingToolCallParser`, which reconstructs fragmented JSON argument strings, resolves index collisions, and yields a complete `functionCall` part only when JSON depth returns to 0.

4. **Finish reason mapping:** OpenAI `finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter'` maps to Gemini `FinishReason.STOP | MAX_TOKENS | OTHER`.

5. **Usage metadata:** OpenAI `usage: { prompt_tokens, completion_tokens, total_tokens }` maps to Gemini `usageMetadata`. DashScope `cached_tokens` (top-level) is normalized into `prompt_tokens_details.cached_tokens`.

6. **Chunk merging:** Some providers send `finish_reason` and `usageMetadata` in **separate** SSE chunks. The pipeline buffers a finish chunk and merges it with a trailing usage chunk before yielding, preventing the UI from seeing a premature "done" signal.

### 4.3 `StreamingToolCallParser.ts`

This class is **stateful per stream** and must be instantiated fresh for every `generateContentStream` call.

```typescript
export class StreamingToolCallParser {
  private buffers = new Map<number, string>();
  private depths = new Map<number, number>();
  private inStrings = new Map<number, boolean>();
  private escapes = new Map<number, boolean>();
  private toolCallMeta = new Map<number, { id?: string; name?: string }>();
  private idToIndexMap = new Map<string, number>();
  private nextAvailableIndex = 0;

  addChunk(index: number, chunk: string, id?: string, name?: string): ToolCallParseResult;
}
```

**Algorithm invariants:**
- If a chunk arrives with a new `id` at an already-occupied index, and the existing buffer is complete JSON, allocate a new index via `findNextAvailableIndex()`.
- If a chunk arrives without an `id`, route it to the most recent incomplete tool call.
- JSON structural state (brace depth, string boundary, escape flag) is tracked per index so we know exactly when the object is complete.
- On completion, `JSON.parse` is attempted; if it fails, a repair heuristic auto-closes unclosed strings and retries once.

### 4.4 Provider Pluggability

Each provider implements the `OpenAICompatibleProvider` interface:

```typescript
export interface OpenAICompatibleProvider {
  buildHeaders(): Record<string, string | undefined>;
  buildClient(): OpenAI;                   // Returns configured `openai` SDK instance
  buildRequest(
    request: ChatCompletionCreateParams,
    userPromptId: string,
  ): ChatCompletionCreateParams;         // Final request mutation hook
  getDefaultGenerationConfig(): GenerateContentConfig;
  getResponseParsingOptions?(): OpenAIResponseParsingOptions;
  getRequestContextOverrides?(): OpenAIRequestContextOverrides;
}
```

**DefaultProvider** handles generic OpenAI-compatible endpoints (OpenAI, Fireworks, Ollama, vLLM, etc.). It:
- Builds a `User-Agent: OmniCLI/<version>` header.
- Configures proxy support via `buildRuntimeFetchOptions()`.
- Applies output token limits (`CAPPED_DEFAULT_MAX_TOKENS = 8192`) unless the user explicitly set `max_tokens` or `samplingParams`.
- Mirrors `reasoning_content` → `reasoning` for Qwen3 models to satisfy provider expectations.

**DashScopeProvider** adds:
- `X-DashScope-SSE: disable` for non-streaming (not applicable to us; we always stream).
- `enable_thinking` passthrough in `extra_body`.
- Cache-control header injection for prompt caching.
- Session metadata headers for billing correlation.

**DeepSeekProvider** adds:
- Hostname detection (`api.deepseek.com`).
- Reasoning effort mapping (`low`/`medium`/`high` → `reasoning_effort`).

**OpenRouterProvider** adds:
- `HTTP-Referer` and `X-Title` headers.
- Route-fallthrough preferences.

### 4.5 Error Handling

`OpenAIErrorHandler` implements the `ErrorHandler` interface:

- **Redaction:** Proxy credentials are stripped from error messages before logging via `redactProxyError()`.
- **Timeout classification:** Inspects `error.code`, `error.type`, and `error.message` for timeout indicators (`ETIMEDOUT`, `ESOCKETTIMEDOUT`, `deadline exceeded`). Appends troubleshooting tips.
- **Stream content errors:** Some providers return throttling/errors as SSE chunks with `finish_reason="error_finish"`. The pipeline detects this and throws `StreamContentError` before the converter sees it.
- **Suppression:** User-initiated `AbortError` (Ctrl-C) is suppressed from logs; all other errors are emitted.

---

## 5. Configuration Schema

Users configure OpenAI-compatible providers in `~/.omni/settings.json` (mirroring qwen-code's `settings.json` format for easy migration):

```json
{
  "modelProviders": {
    "openai": [
      {
        "id": "gpt-4o",
        "name": "GPT-4o",
        "baseUrl": "https://api.openai.com/v1",
        "description": "OpenAI GPT-4o",
        "envKey": "OPENAI_API_KEY"
      },
      {
        "id": "qwen3.6-plus",
        "name": "Qwen3.6-Plus (DashScope)",
        "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "description": "Qwen3-Coder via Alibaba Cloud",
        "envKey": "DASHSCOPE_API_KEY",
        "generationConfig": {
          "extra_body": { "enable_thinking": true }
        }
      },
      {
        "id": "llama3.1-405b",
        "name": "Llama 3.1 405B (Fireworks)",
        "baseUrl": "https://api.fireworks.ai/inference/v1",
        "envKey": "FIREWORKS_API_KEY"
      },
      {
        "id": "claude-sonnet-4",
        "name": "Claude Sonnet 4 (OpenRouter)",
        "baseUrl": "https://openrouter.ai/api/v1",
        "envKey": "OPENROUTER_API_KEY"
      }
    ]
  },
  "env": {
    "OPENAI_API_KEY": "sk-...",
    "DASHSCOPE_API_KEY": "sk-..."
  },
  "security": {
    "auth": { "selectedType": "openai" }
  },
  "model": { "name": "gpt-4o" }
}
```

**Provider auto-detection:** If `baseUrl` is omitted, the registry defaults to `https://api.openai.com/v1`. If `baseUrl` contains `dashscope.aliyuncs.com`, the adapter automatically selects `DashScopeProvider` to enable cumulative-delta normalization and cache-control headers.

---

## 6. Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Omni CLI Core Loop                              │
│  (Context compression, tool scheduling, MCP execution already complete)   │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │ GenerateContentParameters (Gemini format)
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OpenAIClient (BaseLlmClient)                         │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌───────────────────┐  │
│  │  convertRequest()   │  │ StreamingToolCall   │  │  ErrorHandler     │  │
│  │  (Gemini → OpenAI)  │──│ Parser (per-stream) │──│ (redact + classify)│  │
│  └─────────────────────┘  └─────────────────────┘  └───────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │ ChatCompletionCreateParams
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Provider.buildClient() → OpenAI SDK                    │
│                      Provider.buildRequest() → mutate headers/extra_body    │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │ HTTP + SSE
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OpenAI-Compatible API                           │
│                        (Remote provider endpoint)                            │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │ SSE chunks (incremental or cumulative)
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ContentGenerationPipeline                            │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌───────────────────┐  │
│  │ normalizeStreaming  │  │ convertOpenAIChunk  │  │  Chunk Merging    │  │
│  │ TextDelta()         │──│ ToGemini()          │──│ (finish+usage)   │  │
│  └─────────────────────┘  └─────────────────────┘  └───────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │ GenerateContentResponse chunks (Gemini format)
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLI UI / Consumer                               │
│         (Renders text, thinking blocks, tool calls, usage stats)            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Testing Strategy

### 7.1 Unit Tests (Highest Priority)

| Suite | Target | Coverage Goal |
|-------|--------|---------------|
| `GeminiOpenAIConverter.test.ts` | `convertTools`, `convertContents`, `convertRequest`, `convertOpenAIChunkToGemini` | 100% branch on type-switching logic |
| `StreamingToolCallParser.test.ts` | `addChunk` with collision, fragmentation, repair | All edge cases from qwen-code |
| `normalizeStreamingTextDelta.test.ts` | Cumulative vs incremental detection | Exact-repeat threshold, cap behavior, hybrid transition |
| `OpenAIErrorHandler.test.ts` | Timeout classification, redaction, suppression | Mock errors with all known codes |
| `Provider.test.ts` | `DefaultProvider`, `DashScopeProvider`, `DeepSeekProvider` | Header construction, token-limit application |

**Test fixtures:** We will snapshot the qwen-code `converter.test.ts` and `pipeline.concurrent.test.ts` inputs/outputs as golden data. Any deviation in our ported converter must be explicitly justified.

### 7.2 Integration Tests

Mock an OpenAI-compatible HTTP server using `msw` (already in devDependencies). Scenarios:

1. **Standard incremental stream:** Verbatim chunk passthrough.
2. **Cumulative stream (DashScope-style):** Every chunk contains full accumulated text; verify no duplication in final output.
3. **Tool-call stream:** Interleaved text + partial `tool_calls` chunks; verify complete `functionCall` parts are yielded exactly once.
4. **Finish+usage split chunks:** Finish reason arrives before usage; verify merged yield.
5. **Error-as-SSE:** `finish_reason="error_finish"` with throttling message; verify `StreamContentError` is thrown.
6. **Abort mid-stream:** `AbortSignal` fired after 3 chunks; verify parser state is discarded and no memory leak.

### 7.3 Compatibility Matrix

Run a lightweight smoke test against real endpoints (manual / nightly CI only, not in PR gates):

| Provider | Endpoint | Validates |
|----------|----------|-----------|
| OpenAI | `gpt-4o-mini` | Standard spec compliance |
| DashScope | `qwen3.6-plus` | Cumulative delta, thinking content |
| DeepSeek | `deepseek-chat` | Reasoning effort, Chinese tokenization |
| Ollama | `qwen3:32b` @ localhost | Local baseURL, no auth |
| OpenRouter | `anthropic/claude-sonnet-4` | Routing headers |

---

## 8. Cleanup & De-Qwenification Plan

The qwen-code codebase contains provider-specific hacks that must be stripped or generalized for our universal adapter.

| Qwen-Specific Hack | Location | Action |
|--------------------|----------|--------|
| `mirrorReasoningContentToReasoning` for Qwen3 | `provider/default.ts` | Keep but gate behind `model.includes('qwen3')`; document as generic reasoning-field normalization. |
| DashScope `enable_thinking` in `extra_body` | `provider/dashscope.ts` | Keep; it's actually a clean passthrough mechanism usable by any provider. |
| `QWEN_CODE_MAX_OUTPUT_TOKENS` env var | `provider/default.ts` | Rename to `OMNI_MAX_OUTPUT_TOKENS` or read from our config layer. |
| `X-DashScope-SSE` header | `provider/dashscope.ts` | Remove non-streaming path only; we only support streaming. |
| Qwen OAuth references | `contentGenerator.ts` | Already absent in our port; we use `BaseLlmClient` registry. |
| `userAgent: QwenCode/...` | `provider/default.ts` | Change to `OmniCLI/...` |
| Chinese-language comments | `converter.ts` | Remove or translate to English. |
| 1,600-line monolithic `converter.ts` | `converter.ts` | Decompose into `requestConverter.ts`, `responseConverter.ts`, `streamingNormalizer.ts`. |
| `qwen-oauth` authType branching | `createContentGenerator` | Remove entirely; OAuth is out of scope for this adapter. |

---

## 9. Implementation Phases

### Phase 1: Foundation (Days 1–2)
1. Scaffold directory structure under `packages/core/src/providers/openai/`.
2. Port `types.ts`, `constants.ts`, `OpenAIErrorHandler.ts` verbatim (minimal changes).
3. Port `OpenAICompatibleProvider` interface and `DefaultProvider`.
4. Wire `OpenAIClient` into the provider registry (`packages/core/src/providers/index.ts`).
5. Basic smoke test: `generateContent` against a mocked OpenAI endpoint.

### Phase 2: Converter Core (Days 3–5)
1. Port `convertGeminiToolsToOpenAI` and `convertGeminiRequestToOpenAI`.
2. Port `convertOpenAIResponseToGemini` and `convertOpenAIChunkToGemini`.
3. Port `StreamingToolCallParser` with full test coverage.
4. Port `normalizeStreamingTextDelta` with cumulative-mode test fixtures.
5. Integration test: full request → mock stream → response loop.

### Phase 3: Provider Specialization (Days 6–7)
1. Port `DashScopeProvider`, `DeepSeekProvider`, `OpenRouterProvider`.
2. Implement auto-detection heuristic in `createProvider(config)`.
3. Add configuration schema validation for `~/.omni/settings.json`.
4. Document provider-specific feature flags (`splitToolMedia`, `schemaCompliance`, `enableCacheControl`).

### Phase 4: Integration & Polish (Days 8–10)
1. Hook into `modelRouterService.ts` so context compression routes to `OpenAIClient.countTokens()`.
2. Ensure `BaseLlmClient.estimateTokens()` is used by the fast compression loop.
3. Run the full CLI integration test suite with `FAKE_LLM=openai` mock.
4. Performance check: cumulative-delta normalization must not exceed O(window) memory per stream.
5. Final code review against qwen-code source for parity.

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Cumulative-delta logic drifts from qwen-code, causing text duplication | Medium | High | Keep exact qwen-code test fixtures; property-test with randomized cumulative chunk sequences. |
| Tool-call index collision handling misses an edge case | Medium | High | Port qwen-code's `streamingToolCallParser.ts` verbatim; do not rewrite. |
| Schema translation produces invalid OpenAI tool schemas for MCP tools | Low | High | Unit-test with all registered MCP server schemas; validate against OpenAI's JSON Schema subset. |
| `max_tokens` default logic truncates legitimate long responses | Low | Medium | Default to 8K with one clean retry at model limit (same as qwen-code). Log when retry occurs. |
| Provider auto-detection misclassifies a custom base URL | Low | Low | Allow explicit `providerType` override in config; default to `DefaultProvider` when uncertain. |
| Binary size increase from `openai` SDK dependency | Medium | Low | `openai` is already a peer-dep candidate; tree-shake unused endpoints. |

---

## 11. Success Criteria

- [ ] `generateContentStream` produces identical token sequences to qwen-code when fed the same mock SSE chunks.
- [ ] All 8 provider types pass at least one mocked integration test.
- [ ] MCP tool schemas round-trip through `convertTools` without validation errors on real OpenAI endpoints.
- [ ] Cumulative-delta normalization exhibits zero visible duplication on DashScope-style streams.
- [ ] Context compression (`countTokens`) stays within ±5% of actual provider token counts for English and CJK text.
- [ ] No regression in Gemini-native path latency or correctness.

---

## 12. Appendix: File Mapping Reference

| Qwen-Code Source | Omni Target | Port Type |
|------------------|-------------|-----------|
| `openaiContentGenerator.ts` | `providers/openai/OpenAIClient.ts` | Adapt (implement `BaseLlmClient`) |
| `pipeline.ts` | `providers/openai/ContentGenerationPipeline.ts` | Port with `userPromptId` removal |
| `converter.ts` | `providers/openai/GeminiOpenAIConverter.ts` + `requestConverter.ts` + `responseConverter.ts` | Decompose and port |
| `streamingToolCallParser.ts` | `providers/openai/StreamingToolCallParser.ts` | Port verbatim |
| `taggedThinkingParser.ts` | `providers/openai/TaggedThinkingParser.ts` | Port verbatim |
| `errorHandler.ts` | `providers/openai/OpenAIErrorHandler.ts` | Port with redaction rules |
| `provider/default.ts` | `providers/openai/provider/DefaultProvider.ts` | Port with User-Agent rename |
| `provider/dashscope.ts` | `providers/openai/provider/DashScopeProvider.ts` | Port with SSE header cleanup |
| `provider/deepseek.ts` | `providers/openai/provider/DeepSeekProvider.ts` | Port |
| `provider/openrouter.ts` | `providers/openai/provider/OpenRouterProvider.ts` | Port |
| `provider/mistral.ts` | `providers/openai/provider/MistralProvider.ts` | Port |
| `provider/types.ts` | `providers/openai/provider/OpenAIProvider.ts` | Port as interface |
