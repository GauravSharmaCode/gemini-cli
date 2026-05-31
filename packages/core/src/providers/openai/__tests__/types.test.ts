/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import type { OpenAIClientConfig } from '../types.js';

describe('OpenAI Provider Types', () => {
  it('should have OpenAIClientConfig interface', () => {
    const config: OpenAIClientConfig = {
      model: 'gpt-4o',
      apiKey: 'sk-test',
      baseUrl: 'https://api.openai.com/v1',
      authType: undefined,
    };
    expect(config.model).toBe('gpt-4o');
  });
});
