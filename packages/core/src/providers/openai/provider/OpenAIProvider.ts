/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type OpenAI from 'openai';

/**
 * Abstract interface for OpenAI-compatible provider implementations.
 */
export interface OpenAICompatibleProvider {
  buildHeaders(): Record<string, string | undefined>;
  buildClient(): OpenAI;
  buildRequest(
    request: OpenAI.Chat.ChatCompletionCreateParams,
  ): OpenAI.Chat.ChatCompletionCreateParams;
  getDefaultGenerationConfig?(): Record<string, unknown>;
  getResponseParsingOptions?(): Record<string, unknown>;
  getRequestContextOverrides?(): Record<string, unknown>;
}
