# OpenAI Provider

Adapter for OpenAI-compatible APIs including OpenAI, Anthropic, Qwen (DashScope), Fireworks, Ollama, OpenRouter, DeepSeek, Mistral, and more.

## Status

**Phase 1: Foundation** — Scaffolding and entry points  
**Phase 2: Converter Core** — Request/response translation and streaming  
**Phase 3: Provider Specialization** — Provider-specific implementations  
**Phase 4: Integration** — End-to-end testing and polish

## Architecture

- `openaiContentGeneratorFactory.ts` — Factory function for creating content generators
- `types.ts` — Type definitions
- `constants.ts` — Timeouts, base URLs, thresholds
- `GeminiOpenAIConverter.ts` — Bidirectional format conversion
- `StreamingToolCallParser.ts` — Stateful tool-call reconstruction
- `TaggedThinkingParser.ts` — Reasoning/thinking content extraction
- `ContentGenerationPipeline.ts` — Request orchestration
- `OpenAIErrorHandler.ts` — Error classification
- `provider/DefaultProvider.ts` — Generic OpenAI-compatible implementation

See [design spec](../../specs/2026-05-30-qwen-code-extraction-design.md) for full details.
