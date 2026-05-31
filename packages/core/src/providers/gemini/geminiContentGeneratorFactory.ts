/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GoogleGenAI,
} from '@google/genai';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as os from 'node:os';
import { createCodeAssistContentGenerator } from '../../code_assist/codeAssist.js';
import { isCloudShell } from '../../ide/detect-ide.js';
import type { Config } from '../../config/config.js';
import type { ContentGenerator } from '../../core/contentGenerator.js';
import { AuthType } from '../../core/contentGenerator.js';
import type { ContentGeneratorConfig } from '../../core/contentGenerator.js';
import { LoggingContentGenerator } from '../../core/loggingContentGenerator.js';
import { InstallationManager } from '../../utils/installationManager.js';
import { parseCustomHeaders } from '../../utils/customHeaderUtils.js';
import { determineSurface } from '../../utils/surface.js';
import { getVersion, resolveModel } from '../../../index.js';

const VERTEX_AI_REQUEST_TYPE_HEADER = 'X-Vertex-AI-LLM-Request-Type';
const VERTEX_AI_SHARED_REQUEST_TYPE_HEADER =
  'X-Vertex-AI-LLM-Shared-Request-Type';

function validateBaseUrl(baseUrl: string): void {
  try {
    new URL(baseUrl);
  } catch {
    throw new Error(`Invalid custom base URL: ${baseUrl}`);
  }
}

/**
 * Factory for creating Google Gemini content generators.
 */
export async function createGeminiContentGenerator(
  config: ContentGeneratorConfig,
  gcConfig: Config,
  sessionId?: string,
): Promise<ContentGenerator> {
  const version = await getVersion();
  const model = resolveModel(
    gcConfig.getModel(),
    config.authType === AuthType.USE_GEMINI ||
      config.authType === AuthType.USE_VERTEX_AI ||
      ((await gcConfig.getGemini31Launched?.()) ?? false),
    false,
    gcConfig.getHasAccessToPreviewModel?.() ?? true,
    gcConfig,
  );
  const customHeadersEnv =
    process.env['GEMINI_CLI_CUSTOM_HEADERS'] || undefined;
  const clientName = gcConfig.getClientName();
  const surface = determineSurface();

  let userAgent: string;
  // Use unified format for VS Code traffic.
  if (clientName === 'acp-vscode' || surface === 'vscode') {
    const osTypeMap: Record<string, string> = {
      darwin: 'macOS',
      win32: 'Windows',
      linux: 'Linux',
    };
    const osType = osTypeMap[process.platform] || process.platform;
    const osVersion = os.release();
    const arch = process.arch;

    const vscodeVersion = process.env['TERM_PROGRAM_VERSION'] || 'unknown';
    let hostPath = `VSCode/${vscodeVersion}`;
    if (isCloudShell()) {
      const cloudShellVersion =
        process.env['CLOUD_SHELL_VERSION'] || 'unknown';
      hostPath += ` > CloudShell/${cloudShellVersion}`;
    }

    userAgent = `CloudCodeVSCode/${version} (aidev_client; os_type=${osType}; os_version=${osVersion}; arch=${arch}; host_path=${hostPath}; proxy_client=geminicli)`;
  } else {
    const userAgentPrefix = clientName
      ? `GeminiCLI-${clientName}`
      : 'GeminiCLI';
    userAgent = `${userAgentPrefix}/${version}/${model} (${process.platform}; ${process.arch}; ${surface})`;
  }

  const customHeadersMap = parseCustomHeaders(customHeadersEnv);
  const apiKeyAuthMechanism =
    process.env['GEMINI_API_KEY_AUTH_MECHANISM'] || 'x-goog-api-key';
  const apiVersionEnv = process.env['GOOGLE_GENAI_API_VERSION'];

  const baseHeaders: Record<string, string> = {
    'User-Agent': userAgent,
    ...customHeadersMap,
  };

  if (
    apiKeyAuthMechanism === 'bearer' &&
    (config.authType === AuthType.USE_GEMINI ||
      config.authType === AuthType.USE_VERTEX_AI) &&
    config.apiKey
  ) {
    baseHeaders['Authorization'] = `Bearer ${config.apiKey}`;
  }

  if (
    config.authType === AuthType.LOGIN_WITH_GOOGLE ||
    config.authType === AuthType.COMPUTE_ADC
  ) {
    const httpOptions = { headers: baseHeaders };
    return new LoggingContentGenerator(
      await createCodeAssistContentGenerator(
        httpOptions,
        config.authType,
        gcConfig,
        sessionId,
      ),
      gcConfig,
    );
  }

  if (
    config.authType === AuthType.USE_GEMINI ||
    config.authType === AuthType.USE_VERTEX_AI ||
    config.authType === AuthType.GATEWAY
  ) {
    let headers: Record<string, string> = { ...baseHeaders };
    if (config.customHeaders) {
      headers = { ...headers, ...config.customHeaders };
    }
    if (
      config.authType === AuthType.USE_VERTEX_AI &&
      config.vertexAiRouting
    ) {
      const { requestType, sharedRequestType } = config.vertexAiRouting;
      headers = {
        ...headers,
        ...(requestType
          ? { [VERTEX_AI_REQUEST_TYPE_HEADER]: requestType }
          : {}),
        ...(sharedRequestType
          ? { [VERTEX_AI_SHARED_REQUEST_TYPE_HEADER]: sharedRequestType }
          : {}),
      };
    }
    if (gcConfig?.getUsageStatisticsEnabled()) {
      const installationManager = new InstallationManager();
      const installationId = installationManager.getInstallationId();
      headers = {
        ...headers,
        'x-gemini-api-privileged-user-id': `${installationId}`,
      };
    }
    if (config.authType === AuthType.GATEWAY && config.apiKey === '') {
      headers['x-goog-api-key'] = '';
    }
    let baseUrl = config.baseUrl;
    if (!baseUrl) {
      const envBaseUrl =
        config.authType === AuthType.USE_VERTEX_AI
          ? process.env['GOOGLE_VERTEX_BASE_URL']
          : process.env['GOOGLE_GEMINI_BASE_URL'];
      if (envBaseUrl) {
        validateBaseUrl(envBaseUrl);
        baseUrl = envBaseUrl;
      }
    } else {
      validateBaseUrl(baseUrl);
    }

    const httpOptions: {
      baseUrl?: string;
      headers: Record<string, string>;
    } = { headers };

    if (baseUrl) {
      httpOptions.baseUrl = baseUrl;
    }

    const proxyUrl = config.proxy?.trim();
    const proxyAgent = proxyUrl
      ? baseUrl?.startsWith('http://')
        ? new HttpProxyAgent(proxyUrl)
        : new HttpsProxyAgent(proxyUrl)
      : undefined;

    const googleGenAI = new GoogleGenAI({
      apiKey:
        config.authType === AuthType.GATEWAY
          ? config.apiKey
          : config.apiKey === ''
            ? undefined
            : config.apiKey,
      vertexai: config.vertexai ?? config.authType === AuthType.USE_VERTEX_AI,
      httpOptions,
      ...(apiVersionEnv && { apiVersion: apiVersionEnv }),
      ...(proxyAgent && {
        googleAuthOptions: {
          clientOptions: {
            transporterOptions: { agent: proxyAgent },
          },
        },
      }),
    });
    return new LoggingContentGenerator(googleGenAI.models, gcConfig);
  }
  throw new Error(
    `Error creating contentGenerator: Unsupported authType: ${config.authType}`,
  );
}
