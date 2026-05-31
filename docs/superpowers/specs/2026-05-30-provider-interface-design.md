# Spec 1: Universal Provider Interface

## Objective
Decouple `gemini-cli-core` from the hardcoded `@google/genai` dependency by introducing a universal `BaseLlmClient` interface. This allows the CLI to dynamically route context to different model providers while retaining our highly efficient context compression loop.

## Architecture

### 1. The `BaseLlmClient` Interface
We will refine the existing `BaseLlmClient` (currently in `packages/core/src/core/baseLlmClient.ts`) to be strictly model-agnostic.

```typescript
export interface BaseLlmClient {
  /** Generates a single complete response. */
  generateContent(request: GenerateContentParameters, config: ModelConfig): Promise<GenerateContentResponse>;
  
  /** Generates a streaming response. */
  generateContentStream(request: GenerateContentParameters, config: ModelConfig): AsyncGenerator<GenerateContentResponse>;
  
  /** 
   * CRITICAL: Provider-specific token counting.
   * This ensures the context compressor remains perfectly accurate for the target model.
   */
  countTokens(request: CountTokensParameters): Promise<number>;
  
  /** Synchronous fallback for rapid compression loops. */
  estimateTokens(text: string): number;
}
```

### 2. Provider Registry
We will introduce a provider registry (`packages/core/src/providers/index.ts`) that maps configuration types to specific `BaseLlmClient` implementations.

### 3. Modifying `modelRouterService.ts`
The router will be updated to:
1. Read the user's active configuration (e.g., from `~/.omni/settings.json`).
2. Identify the requested provider type (e.g., `gemini`, `openai`, `copilot`).
3. Instantiate the correct `BaseLlmClient` implementation from the registry.
4. Pass the compressed context to the selected client.

## Data Structures
We will **retain** the existing Google GenAI types (`GenerateContentParameters`, `Content`, `Part`) as our internal native format. The newly implemented Provider Adapters will be responsible for translating these types into their respective API formats at the network edge. This eliminates the risk of token bloat during context compression.

## Error Handling
The interface must enforce uniform error throwing. Provider-specific network errors, rate limits, or authentication failures must be caught by the adapter and translated into standard CLI errors so the UI can render them consistently.

## Testing Strategy
- Unit tests for the provider registry ensuring correct adapter instantiation.
- Mock tests for the router to verify it passes the correct config to the adapter.