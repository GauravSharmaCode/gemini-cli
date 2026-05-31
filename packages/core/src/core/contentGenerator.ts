/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  type CountTokensResponse,
  type GenerateContentResponse,
  type GenerateContentParameters,
  type CountTokensParameters,
  type EmbedContentResponse,
  type EmbedContentParameters,
} from '@google/genai';
import type { Config } from '../config/config.js';
import { loadApiKey } from './apiKeyCredentialStorage.js';

import type { UserTierId, GeminiUserTier } from '../code_assist/types.js';
import { FakeContentGenerator } from './fakeContentGenerator.js';
import { LoggingContentGenerator } from './loggingContentGenerator.js';
import { RecordingContentGenerator } from './recordingContentGenerator.js';
import type { LlmRole } from '../telemetry/llmRole.js';

import { defaultProviderRegistry, ProviderType } from '../providers/index.js';
import { createGeminiContentGenerator } from '../providers/gemini/index.js';

/**
 * Interface abstracting the core functionalities for generating content and counting tokens.
 */
export interface ContentGenerator {
  generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
    role: LlmRole,
  ): Promise<GenerateContentResponse>;

  generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
    role: LlmRole,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;

  embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;

  /** Optional provider-specific sync token estimation. */
  estimateTokens?(text: string): number;

  userTier?: UserTierId;

  userTierName?: string;

  paidTier?: GeminiUserTier;
}

export enum AuthType {
  LOGIN_WITH_GOOGLE = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key',
  USE_VERTEX_AI = 'vertex-ai',
  LEGACY_CLOUD_SHELL = 'cloud-shell',
  COMPUTE_ADC = 'compute-default-credentials',
  GATEWAY = 'gateway',
  GITHUB_COPILOT = 'github-copilot',
}

/**
 * Detects the best authentication type based on environment variables.
 *
 * Checks in order:
 * 1. GOOGLE_GENAI_USE_GCA=true -> LOGIN_WITH_GOOGLE
 * 2. GOOGLE_GENAI_USE_VERTEXAI=true -> USE_VERTEX_AI
 * 3. GEMINI_API_KEY -> USE_GEMINI
 */
export function getAuthTypeFromEnv(): AuthType | undefined {
  if (process.env['GOOGLE_GENAI_USE_GCA'] === 'true') {
    return AuthType.LOGIN_WITH_GOOGLE;
  }
  if (process.env['GOOGLE_GENAI_USE_VERTEXAI'] === 'true') {
    return AuthType.USE_VERTEX_AI;
  }
  if (process.env['GOOGLE_GEMINI_BASE_URL']) {
    return AuthType.GATEWAY;
  }
  if (process.env['GEMINI_API_KEY']) {
    return AuthType.USE_GEMINI;
  }
  if (
    process.env['CLOUD_SHELL'] === 'true' ||
    process.env['GEMINI_CLI_USE_COMPUTE_ADC'] === 'true'
  ) {
    return AuthType.COMPUTE_ADC;
  }
  return undefined;
}

export function getProviderTypeForAuth(authType: AuthType): ProviderType {
  switch (authType) {
    case AuthType.GITHUB_COPILOT:
      return ProviderType.COPILOT;
    case AuthType.LOGIN_WITH_GOOGLE:
    case AuthType.USE_GEMINI:
    case AuthType.USE_VERTEX_AI:
    case AuthType.LEGACY_CLOUD_SHELL:
    case AuthType.COMPUTE_ADC:
    case AuthType.GATEWAY:
      return ProviderType.GEMINI;
    default:
      return ProviderType.GEMINI;
  }
}

export type ContentGeneratorConfig = {
  apiKey?: string;
  vertexai?: boolean;
  authType?: AuthType;
  proxy?: string;
  baseUrl?: string;
  customHeaders?: Record<string, string>;
  vertexAiRouting?: VertexAiRoutingConfig;
};

export type VertexAiRequestType = 'dedicated' | 'shared';
export type VertexAiSharedRequestType = 'priority' | 'flex';

export interface VertexAiRoutingConfig {
  requestType?: VertexAiRequestType;
  sharedRequestType?: VertexAiSharedRequestType;
}

export async function createContentGeneratorConfig(
  config: Config,
  authType: AuthType | undefined,
  apiKey?: string,
  baseUrl?: string,
  customHeaders?: Record<string, string>,
  vertexAiRouting?: VertexAiRoutingConfig,
): Promise<ContentGeneratorConfig> {
  const contentGeneratorConfig: ContentGeneratorConfig = {
    authType,
    proxy: config?.getProxy(),
    baseUrl,
    customHeaders,
    vertexAiRouting,
  };

  // If we are using Google auth or we are in Cloud Shell, there is nothing else to validate for now.
  // Return before touching the API-key keychain: on Linux without a Secret Service
  // (WSL/SSH/Docker/CI) keytar can block indefinitely on its functional probe.
  if (
    authType === AuthType.LOGIN_WITH_GOOGLE ||
    authType === AuthType.COMPUTE_ADC
  ) {
    return contentGeneratorConfig;
  }

  const geminiApiKey =
    apiKey ||
    process.env['GEMINI_API_KEY'] ||
    (await loadApiKey()) ||
    undefined;
  const googleApiKey = process.env['GOOGLE_API_KEY'] || undefined;
  const googleCloudProject =
    process.env['GOOGLE_CLOUD_PROJECT'] ||
    process.env['GOOGLE_CLOUD_PROJECT_ID'] ||
    undefined;
  const googleCloudLocation = process.env['GOOGLE_CLOUD_LOCATION'] || undefined;

  if (authType === AuthType.USE_GEMINI && geminiApiKey) {
    contentGeneratorConfig.apiKey = geminiApiKey;
    contentGeneratorConfig.vertexai = false;

    return contentGeneratorConfig;
  }

  if (
    authType === AuthType.USE_VERTEX_AI &&
    (googleApiKey || (googleCloudProject && googleCloudLocation))
  ) {
    contentGeneratorConfig.apiKey = googleApiKey;
    contentGeneratorConfig.vertexai = true;

    return contentGeneratorConfig;
  }

  if (authType === AuthType.GATEWAY) {
    contentGeneratorConfig.apiKey =
      apiKey || process.env['GEMINI_API_KEY'] || '';
    contentGeneratorConfig.vertexai = false;

    return contentGeneratorConfig;
  }

  return contentGeneratorConfig;
}

// Pre-register Gemini provider
defaultProviderRegistry.register(
  ProviderType.GEMINI,
  createGeminiContentGenerator,
);

export async function createContentGenerator(
  config: ContentGeneratorConfig,
  gcConfig: Config,
  sessionId?: string,
): Promise<ContentGenerator> {
  const generator = await (async () => {
    if (gcConfig.fakeResponsesNonStrict) {
      const fakeGenerator = await FakeContentGenerator.fromFile(
        gcConfig.fakeResponsesNonStrict,
        { nonStrict: true },
      );
      return new LoggingContentGenerator(fakeGenerator, gcConfig);
    }
    if (gcConfig.fakeResponses) {
      const fakeGenerator = await FakeContentGenerator.fromFile(
        gcConfig.fakeResponses,
      );
      return new LoggingContentGenerator(fakeGenerator, gcConfig);
    }

    const providerType =
      typeof gcConfig?.getProviderType === 'function'
        ? gcConfig.getProviderType()
        : ProviderType.GEMINI;
    return defaultProviderRegistry.create(
      providerType,
      config,
      gcConfig,
      sessionId,
    );
  })();

  if (gcConfig.recordResponses) {
    return new RecordingContentGenerator(generator, gcConfig.recordResponses);
  }

  return generator;
}
