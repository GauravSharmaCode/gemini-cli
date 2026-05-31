/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ContentGenerator } from '../../core/contentGenerator.js';
import type { ContentGeneratorConfig } from '../../core/contentGenerator.js';
import type { Config } from '../../config/config.js';

/**
 * Factory function that creates an OpenAI-compatible content generator.
 * Supports OpenAI, Anthropic, Qwen (DashScope), Fireworks, Ollama, and other OpenAI-compatible APIs.
 */
export async function createOpenAIContentGenerator(
  config: ContentGeneratorConfig,
  gcConfig: Config,
  sessionId?: string,
): Promise<ContentGenerator> {
  // TODO(Phase 1.2): Implement factory
  throw new Error('createOpenAIContentGenerator: Not yet implemented');
}
