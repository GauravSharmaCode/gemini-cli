/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ContentGenerator, ContentGeneratorConfig } from '../../core/contentGenerator.js';
import type { Config } from '../../config/config.js';
import { ContentGenerationPipeline } from './ContentGenerationPipeline.js';

/**
 * Factory function that creates an OpenAI-compatible content generator.
 */
export async function createOpenAIContentGenerator(
  config: ContentGeneratorConfig,
  _gcConfig: Config,
  _sessionId?: string,
): Promise<ContentGenerator> {
  const pipeline = new ContentGenerationPipeline(config);
  return {
    generateContent: (req) => pipeline.execute(req),
    generateContentStream: async (req) => pipeline.executeStream(req),
    countTokens: async (req) => ({ totalTokens: Math.ceil(JSON.stringify(req.contents).length / 4) }),
    embedContent: async () => { throw new Error('Embeddings not supported for OpenAI yet'); },
    estimateTokens: (text) => Math.ceil(text.length / 4),
  };
}
