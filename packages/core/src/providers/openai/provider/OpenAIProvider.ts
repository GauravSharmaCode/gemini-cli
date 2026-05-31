/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type OpenAI from 'openai';

/**
 * Abstract interface for OpenAI-compatible provider implementations.
 * Each provider may override headers, request building, and parsing options.
 */
export interface OpenAICompatibleProvider {
  /**
   * Builds provider-specific HTTP headers (User-Agent, auth, custom headers).
   */
  buildHeaders(): Record<string, string | undefined>;

  /**
   * Builds and returns the configured OpenAI SDK client.
   */
  buildClient(): OpenAI;

  /**
   * Mutates the OpenAI ChatCompletionCreateParams just before sending.
   * Allows provider-specific request modifications (extra_body, token limits, etc.).
   */
  buildRequest(
    request: OpenAI.Chat.ChatCompletionCreateParams,
  ): OpenAI.Chat.ChatCompletionCreateParams;

  /**
   * Returns the provider's default generation config (temperature, model limits, etc.).
   */
  getDefaultGenerationConfig?(): Record<string, unknown>;

  /**
   * Returns provider-specific response parsing options (stream format variations, etc.).
   */
  getResponseParsingOptions?(): Record<string, unknown>;

  /**
   * Returns provider-specific request context overrides (e.g., splitToolMedia).
   */
  getRequestContextOverrides?(): Record<string, unknown>;
}
