# Spec 3: OpenCode GitHub Copilot Extraction

## Objective
Provide native support for GitHub Copilot as a model provider by extracting and adapting the Copilot authentication and communication logic from the `anomalyco/opencode` repository.

## Architecture

### 1. Analysis of OpenCode
We will analyze the `opencode` repository to isolate the specific files and modules responsible for:
- Initiating the GitHub OAuth device flow (if applicable) or reading the local Copilot token.
- Refreshing the Copilot session token.
- Formatting the request headers and payload expected by the Copilot API.

### 2. Creating the Copilot Adapter
We will create a new provider adapter:
`packages/core/src/providers/copilot/CopilotContentGenerator.ts`

This adapter will implement the `BaseLlmClient` interface.

### 3. Authentication Flow
The adapter must handle the authentication lifecycle securely. If the user is not authenticated with Copilot, the adapter should throw a specific error that the CLI can catch to trigger an interactive login flow, mirroring how we handle Gemini API key prompts.

### 4. Payload Translation
The Copilot API generally expects a format similar to OpenAI, but with specific headers (e.g., `Editor-Version`, `Editor-Plugin-Version`, and specific Authorization headers). The adapter will map our internal `GenerateContentParameters` to the Copilot format, ensuring all required headers are injected.

## Tool Support
We need to determine if the standard GitHub Copilot chat API supports tool calling (function calling) in the same way OpenAI does. If tool calling is not supported or is restricted, the adapter must explicitly strip tool definitions from the request and we must notify the user that autonomous execution is degraded for this provider.

## Testing Strategy
- Unit tests verifying the construction of the correct HTTP headers and token management logic.
- Mocking the Copilot endpoint to ensure the authentication handshake and token refresh loops function correctly.