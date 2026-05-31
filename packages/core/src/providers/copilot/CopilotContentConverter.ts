/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  GenerateContentParameters,
  Content,
  Part,
  GenerateContentResponse,
  Candidate,
} from '@google/genai';

/**
 * Utility for converting between Gemini types and GitHub Copilot types.
 */
export class CopilotContentConverter {
  /**
   * Translates Gemini GenerateContentParameters to Copilot JSON payload.
   */
  static toCopilotPayload(params: GenerateContentParameters): any {
    const messages = params.contents.map((content) => ({
      role: this.mapRole(content.role || 'user'),
      content: this.mapParts(content.parts),
    }));

    // If there's a system instruction, prepend it
    if (params.config?.systemInstruction) {
      const systemContent = this.toContent(params.config.systemInstruction);
      messages.unshift({
        role: 'system',
        content: this.mapParts(systemContent.parts),
      });
    }

    return {
      model: params.model,
      messages,
      temperature: params.config?.temperature,
      top_p: params.config?.topP,
      max_tokens: params.config?.maxOutputTokens,
      stream: true, // We always stream
      // Add tool calling if supported by the model and present in params
      ...(params.config?.tools && {
        tools: this.mapTools(params.config.tools),
      }),
    };
  }

  private static mapRole(role: string): string {
    switch (role) {
      case 'user':
        return 'user';
      case 'model':
        return 'assistant';
      case 'system':
        return 'system';
      default:
        return 'user';
    }
  }

  private static mapParts(parts: Part[]): any {
    // For now, we support simple text parts. 
    // Copilot also supports images in some models, but we'll start with text.
    return parts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join('\n');
  }

  private static toContent(instruction: string | Part | Part[] | Content): Content {
    if (typeof instruction === 'string') {
      return { role: 'system', parts: [{ text: instruction }] };
    }
    if (Array.isArray(instruction)) {
      return { role: 'system', parts: instruction };
    }
    if ('parts' in instruction) {
      return instruction;
    }
    return { role: 'system', parts: [instruction] };
  }

  private static mapTools(tools: any[]): any[] {
    // Translate Gemini FunctionDeclarations to OpenAI/Copilot tool format
    // This is a simplified version; real implementation needs full JSON Schema translation.
    return tools.flatMap((tool) => {
      if (tool.functionDeclarations) {
        return tool.functionDeclarations.map((fd: any) => ({
          type: 'function',
          function: {
            name: fd.name,
            description: fd.description,
            parameters: fd.parameters,
          },
        }));
      }
      return [];
    });
  }

  /**
   * Translates a Copilot chunk to a Gemini GenerateContentResponse.
   */
  static fromCopilotChunk(chunk: any): GenerateContentResponse {
    const choice = chunk.choices?.[0];
    const delta = choice?.delta;

    const candidate: Candidate = {
      content: {
        role: 'model',
        parts: [],
      },
      finishReason: choice?.finish_reason,
    };

    if (delta?.content) {
      candidate.content.parts.push({ text: delta.content });
    }

    if (delta?.tool_calls) {
      candidate.content.parts.push(
        ...delta.tool_calls.map((tc: any) => ({
          functionCall: {
            name: tc.function.name,
            args: tc.function.arguments ? JSON.parse(tc.function.arguments) : {},
          },
        })),
      );
    }

    return {
      candidates: [candidate],
      usageMetadata: chunk.usage
        ? {
            promptTokenCount: chunk.usage.prompt_tokens,
            candidatesTokenCount: chunk.usage.completion_tokens,
            totalTokenCount: chunk.usage.total_tokens,
          }
        : undefined,
    };
  }
}
