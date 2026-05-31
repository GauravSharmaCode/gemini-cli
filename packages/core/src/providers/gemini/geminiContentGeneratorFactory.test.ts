/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGeminiContentGenerator } from './geminiContentGeneratorFactory.js';
import { AuthType } from '../../core/contentGenerator.js';
import { createCodeAssistContentGenerator } from '../../code_assist/codeAssist.js';
import { GoogleGenAI } from '@google/genai';
import type { Config } from '../../config/config.js';
import { resetVersionCache } from '../../utils/version.js';

vi.mock('../../code_assist/codeAssist.js');
vi.mock('@google/genai');

const mockConfig = {
  getModel: vi.fn().mockReturnValue('gemini-pro'),
  getProxy: vi.fn().mockReturnValue(undefined),
  getUsageStatisticsEnabled: vi.fn().mockReturnValue(true),
  getClientName: vi.fn().mockReturnValue(undefined),
} as unknown as Config;

describe('createGeminiContentGenerator', () => {
  beforeEach(() => {
    resetVersionCache();
    vi.clearAllMocks();
  });

  it('should create GoogleGenAI models for API key auth', async () => {
    const cgConfig = {
      authType: AuthType.USE_GEMINI,
      apiKey: 'test-api-key',
    };

    const mockModels = {};
    const mockGoogleGenAIInstance = { models: mockModels };
    vi.mocked(GoogleGenAI).mockImplementation(() => mockGoogleGenAIInstance as any);

    const result = await createGeminiContentGenerator(cgConfig, mockConfig);

    expect(GoogleGenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'test-api-key',
        vertexai: false,
      }),
    );
    expect(result).toBeDefined();
  });

  it('should create CodeAssist content generator for oauth', async () => {
    const cgConfig = {
      authType: AuthType.LOGIN_WITH_GOOGLE,
    };

    const mockCg = {};
    vi.mocked(createCodeAssistContentGenerator).mockResolvedValue(mockCg as any);

    const result = await createGeminiContentGenerator(cgConfig, mockConfig, 'session-abc');

    expect(createCodeAssistContentGenerator).toHaveBeenCalledWith(
      expect.any(Object),
      AuthType.LOGIN_WITH_GOOGLE,
      mockConfig,
      'session-abc',
    );
    expect(result).toBeDefined();
  });
});
