/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ContentGenerator } from '../core/contentGenerator.js';
import type { ContentGeneratorConfig } from '../core/contentGenerator.js';
import type { Config } from '../config/config.js';

/**
 * Identifies a model provider backend.
 * A provider may support multiple authentication types (e.g., Gemini supports
 * API key, OAuth, Vertex AI, etc.).
 */
export enum ProviderType {
  /** Google Gemini models via the @google/genai SDK. */
  GEMINI = 'gemini',
  /** OpenAI-compatible APIs (OpenAI, Anthropic, Fireworks, Ollama, etc.). */
  OPENAI = 'openai',
  /** GitHub Copilot chat API. */
  COPILOT = 'copilot',
}

/**
 * Factory function that creates a raw ContentGenerator for a specific provider.
 * The returned generator should NOT include cross-cutting decorators
 * (LoggingContentGenerator, RecordingContentGenerator) — those are applied
 * by the caller.
 */
export type ContentGeneratorFactory = (
  cgConfig: ContentGeneratorConfig,
  config: Config,
  sessionId?: string,
) => Promise<ContentGenerator>;



/**
 * Infers a ProviderType from a model name string.
 * Returns undefined if the model name doesn't match any known pattern.
 */
export function inferProviderFromModel(model: string): ProviderType | undefined {
  const lower = model.toLowerCase();

  // Gemini models
  if (
    lower.startsWith('gemini') ||
    lower.startsWith('gemma') ||
    lower.startsWith('models/')
  ) {
    return ProviderType.GEMINI;
  }

  // OpenAI-compatible models
  if (
    lower.startsWith('gpt-') ||
    lower.startsWith('o1') ||
    lower.startsWith('o3') ||
    lower.startsWith('o4') ||
    lower.startsWith('chatgpt') ||
    lower.startsWith('claude') ||
    lower.startsWith('qwen') ||
    lower.startsWith('deepseek') ||
    lower.startsWith('llama') ||
    lower.startsWith('mistral') ||
    lower.startsWith('codestral')
  ) {
    return ProviderType.OPENAI;
  }

  // Copilot models
  if (lower.startsWith('copilot')) {
    return ProviderType.COPILOT;
  }

  return undefined;
}
