/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ContentGeneratorConfig } from '../../core/contentGenerator.js';

/**
 * Configuration for OpenAI-compatible provider.
 * Extends ContentGeneratorConfig with OpenAI-specific options.
 */
export interface OpenAIClientConfig extends ContentGeneratorConfig {
  /**
   * Explicit provider type override (e.g., 'dashscope', 'deepseek', 'openrouter').
   * If omitted, auto-detection is attempted based on baseUrl.
   */
  providerType?: string;
}

/**
 * Streaming text delta state for cumulative-delta normalization.
 * Tracks whether a provider replays the entire buffer on each SSE chunk.
 */
export interface StreamingTextDeltaState {
  /** Rolling baseline for prefix/exact-repeat detection. */
  emittedText: string;
  /** Monotonic count of user-visible bytes emitted. */
  emittedLength: number;
  /** Whether cumulative-mode is active. */
  cumulativeMode: boolean;
}

/**
 * Per-stream request context for conversion and logging.
 */
export interface RequestContext {
  model: string;
  startTime: number;
  /** Optional tool-call parser state. */
  toolCallParser?: StreamingToolCallParser;
  /** Optional thinking/reasoning parser state. */
  thinkingParser?: TaggedThinkingParser;
  /** Per-stream state for cumulative-delta normalization (content channel). */
  textDeltaState?: StreamingTextDeltaState;
  /** Per-stream state for cumulative-delta normalization (reasoning channel). */
  reasoningDeltaState?: StreamingTextDeltaState;
}

/**
 * Result of parsing a JSON chunk in tool calls.
 */
export interface ToolCallParseResult {
  /** Whether the JSON parsing is complete. */
  complete: boolean;
  /** The parsed JSON value (only present when complete). */
  value?: Record<string, unknown>;
  /** Error information if parsing failed. */
  error?: Error;
  /** Whether the JSON was repaired. */
  repaired?: boolean;
}

/**
 * Placeholder types for parser classes.
 * Full implementations come in Phase 2.
 */
export interface StreamingToolCallParser {
  addChunk(
    index: number,
    chunk: string,
    id?: string,
    name?: string,
  ): ToolCallParseResult;
}

export interface TaggedThinkingParser {
  parse(text: string): { thinking: string; content: string } | null;
}
