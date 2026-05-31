# Spec 2: Qwen-Code Adapter Extraction

## Objective
Instantly unlock support for OpenAI, Anthropic, Qwen, Fireworks, and local Ollama models by porting the `OpenAIContentConverter` logic from the `QwenLM/qwen-code` fork.

## Architecture

### 1. Porting the Logic
We will extract the logic from `qwen-code/packages/core/src/core/openaiContentGenerator/`. We will create a new provider adapter in our codebase:
`packages/core/src/providers/openai/OpenAIContentGenerator.ts`

### 2. The Clean Up
The Qwen-Code converter contains significant technical debt aimed at supporting specific Chinese LLM endpoints (e.g., the 1,600-line `converter.ts` with "cumulative delta" hacks). We will:
- Strip out the provider-specific hacks.
- Implement a clean, strict translation layer that maps our internal `GenerateContentParameters` to the standard OpenAI `chat.completions` REST API format.
- Ensure the streaming parser correctly yields standard `GenerateContentResponse` chunks.

### 3. Tool Translation
A critical part of the converter will be translating our internal tool schemas (currently formatted as Gemini `FunctionDeclarations`) into the standard OpenAI `tools` JSON schema array. 
- When the model returns a `tool_calls` array, the adapter must translate it back into our internal `FunctionCall` objects so the existing MCP execution loop can handle it natively.

### 4. Configuration Integration
We will define the configuration schema for the OpenAI provider, allowing users to specify the `baseUrl` and `apiKey` in their settings.

## Data Flow
`Core Loop` -> `GenerateContentParameters` -> `OpenAIContentGenerator` -> `OpenAI JSON Payload` -> `Network` -> `OpenAI SSE Stream` -> `OpenAIContentGenerator` -> `GenerateContentResponse Chunks` -> `CLI UI`.

## Testing Strategy
- Unit tests for the schema translation (ensuring Gemini schemas map to OpenAI schemas flawlessly).
- Integration tests mocking the OpenAI API endpoint to ensure streams are parsed correctly without dropping tokens.