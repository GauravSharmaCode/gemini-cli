# Spec 4: Omni CLI Rebrand and UI Wiring

## Objective
Finalize the migration by executing a global rebrand to **OMNI CLI** and updating the terminal UI to allow users to dynamically configure and hot-swap between the newly integrated providers.

## Architecture

### 1. The Global Rebrand
- Perform a find-and-replace across the codebase.
- **Target:** `packages/core/src/prompts/` (System prompts, snippets).
- **Target:** Package descriptions, CLI welcome messages, and documentation headers.
- **Action:** Replace "Gemini CLI" with "OMNI CLI".

### 2. Configuration Management
We will introduce a structured configuration schema to manage multiple providers in the user's settings file (e.g., `~/.omni/settings.json`).

```json
{
  "providers": {
    "openai": [
      { "id": "gpt-4o", "apiKeyEnv": "OPENAI_API_KEY" }
    ],
    "copilot": [
      { "id": "copilot-chat" }
    ],
    "gemini": [
      { "id": "gemini-2.5-pro", "apiKeyEnv": "GEMINI_API_KEY" }
    ]
  },
  "defaultModel": "gpt-4o"
}
```

### 3. The `/model` Command Update
The existing `/model` command in `packages/cli` will be refactored.
- Instead of displaying a hardcoded list of Gemini models, it will read the configured providers from the settings.
- It will render a grouped, interactive dropdown using Ink's `SelectInput`.
- Selecting a new model updates the session state, instantly hot-swapping the `BaseLlmClient` adapter for the next turn.

### 4. Provider-Specific Prompts
Different models respond better to different prompt formats (e.g., XML tags vs. Markdown). We will introduce a "Prompt Compiler" concept.
- Extract the semantic intent of our system prompts into data objects.
- Each `BaseLlmClient` adapter will be responsible for compiling this semantic context into the optimal string format (XML, Markdown) for its specific model before sending the request.

## Testing Strategy
- Snapshot tests for the updated `/model` Ink UI component.
- E2E test verifying that switching models via the command successfully routes the next prompt to the correct mock adapter.