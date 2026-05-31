/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import OpenAI from 'openai';
import type { ContentGeneratorConfig } from '../../../core/contentGenerator.js';
import type { OpenAICompatibleProvider } from './OpenAIProvider.js';
import { DEFAULT_TIMEOUT, DEFAULT_MAX_RETRIES } from '../constants.js';

/**
 * Default provider for standard OpenAI-compatible APIs.
 */
export class DefaultOpenAIProvider implements OpenAICompatibleProvider {
  protected config: ContentGeneratorConfig;

  constructor(config: ContentGeneratorConfig) {
    this.config = config;
  }

  static isDefaultProvider(config: ContentGeneratorConfig): boolean {
    return true;
  }

  buildHeaders(): Record<string, string | undefined> {
    // TODO(Phase 1.5): Implement header building
    return { 'User-Agent': 'OmniCLI/unknown' };
  }

  buildClient(): OpenAI {
    // TODO(Phase 1.5): Implement OpenAI SDK client construction
    return new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      timeout: (this.config as any)?.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: (this.config as any)?.maxRetries ?? DEFAULT_MAX_RETRIES,
      defaultHeaders: this.buildHeaders(),
    });
  }

  buildRequest(request: any): any {
    // TODO(Phase 1.5): Implement request mutation
    return request;
  }
}
