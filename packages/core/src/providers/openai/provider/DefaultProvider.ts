/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import OpenAI from 'openai';
import type { OpenAIClientConfig } from '../types.js';
import type { OpenAICompatibleProvider } from './OpenAIProvider.js';
import { DEFAULT_TIMEOUT, DEFAULT_MAX_RETRIES } from '../constants.js';

/**
 * Default provider for standard OpenAI-compatible APIs.
 * Handles OpenAI, Fireworks, Ollama, vLLM, and other generic endpoints.
 */
export class DefaultOpenAIProvider implements OpenAICompatibleProvider {
  protected config: OpenAIClientConfig;

  constructor(config: OpenAIClientConfig) {
    this.config = config;
  }

  /**
   * Static detection: returns true if this provider should be used.
   * For the default provider, this is always a fallback (return true).
   */
  static isDefaultProvider(config: OpenAIClientConfig): boolean {
    // Default provider is the fallback — always available
    return true;
  }

  buildHeaders(): Record<string, string | undefined> {
    // TODO(Phase 1.5): Implement header building with OmniCLI User-Agent
    return {
      'User-Agent': 'OmniCLI/unknown',
    };
  }

  buildClient(): OpenAI {
    // TODO(Phase 1.5): Implement OpenAI SDK client construction with proxy support
    return new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: this.config.maxRetries ?? DEFAULT_MAX_RETRIES,
      defaultHeaders: this.buildHeaders(),
    });
  }

  buildRequest(
    request: any, // OpenAI.Chat.ChatCompletionCreateParams
  ): any {
    // TODO(Phase 1.5): Implement request mutation (output token limits, extra_body, etc.)
    return request;
  }
}
