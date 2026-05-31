/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  GenerateContentParameters,
  GenerateContentResponse,
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
} from '@google/genai';
import { CopilotAuthService } from './CopilotAuthService.js';
import { CopilotContentConverter } from './CopilotContentConverter.js';
import type { LlmRole } from '../../telemetry/llmRole.js';
import { debugLogger } from '../../utils/debugLogger.js';
import type { ContentGenerator } from '../../core/contentGenerator.js';

const COPILOT_API_URL = 'https://api.githubcopilot.com/chat/completions';

/**
 * Content generator for GitHub Copilot.
 * Implements the universal ContentGenerator interface.
 */
export class CopilotContentGenerator implements ContentGenerator {
  private readonly authService = new CopilotAuthService();

  async generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
    role: LlmRole,
  ): Promise<GenerateContentResponse> {
    const stream = await this.generateContentStream(request, userPromptId, role);
    let finalResponse: GenerateContentResponse | undefined;

    for await (const chunk of stream) {
      if (!finalResponse) {
        finalResponse = chunk;
      } else {
        // Merge chunks into a single response
        if (chunk.candidates?.[0]?.content?.parts) {
          if (!finalResponse.candidates) {
            finalResponse.candidates = [];
          }
          if (!finalResponse.candidates[0]) {
            finalResponse.candidates[0] = { content: { role: 'model', parts: [] } };
          }
          if (!finalResponse.candidates[0].content) {
            finalResponse.candidates[0].content = { role: 'model', parts: [] };
          }
          if (!finalResponse.candidates[0].content.parts) {
            finalResponse.candidates[0].content.parts = [];
          }
          finalResponse.candidates[0].content.parts.push(
            ...chunk.candidates[0].content.parts,
          );
        }
        if (chunk.usageMetadata) {
          finalResponse.usageMetadata = chunk.usageMetadata;
        }
        if (chunk.candidates?.[0]?.finishReason) {
          if (finalResponse.candidates?.[0]) {
            finalResponse.candidates[0].finishReason = chunk.candidates[0].finishReason;
          }
        }
      }
    }

    if (!finalResponse) {
      throw new Error('No response received from Copilot');
    }
    return finalResponse;
  }

  async generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
    role: LlmRole,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    return this.generateContentStreamInternal(request, userPromptId, role);
  }

  private async *generateContentStreamInternal(
    request: GenerateContentParameters,
    _userPromptId: string,
    _role: LlmRole,
  ): AsyncGenerator<GenerateContentResponse> {
    const token = await this.authService.getToken();
    const payload = CopilotContentConverter.toCopilotPayload(request);

    const response = await fetch(COPILOT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-initiator': 'agent',
        'Openai-Intent': 'conversation-edits',
        'User-Agent': 'PoleStar-CLI/0.1.0',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Copilot API error (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.substring(6));
              yield CopilotContentConverter.fromCopilotChunk(json);
            } catch (e) {
              debugLogger.warn('Failed to parse Copilot SSE chunk:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
    // Copilot doesn't expose a public token counting API in this endpoint.
    // For now, we'll return a rough estimate based on character count (1 token ~= 4 chars).
    const text = JSON.stringify(request.contents);
    const estimate = Math.ceil(text.length / 4);
    return { totalTokens: estimate };
  }

  async embedContent(_request: EmbedContentParameters): Promise<EmbedContentResponse> {
    throw new Error('Embeddings not yet supported for Copilot provider');
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

/**
 * Factory function for creating a CopilotContentGenerator.
 */
export async function createCopilotContentGenerator(): Promise<ContentGenerator> {
  return new CopilotContentGenerator();
}
