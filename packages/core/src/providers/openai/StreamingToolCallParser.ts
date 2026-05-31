/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ToolCallParseResult } from './types.js';

/**
 * Stateful parser for streaming tool calls.
 * Handles fragmented JSON arguments across SSE chunks with index-collision detection.
 *
 * State is per-stream and must be instantiated fresh for each generateContentStream() call.
 */
export class StreamingToolCallParser {
  /** Accumulated buffer per tool call index. */
  private buffers = new Map<number, string>();
  /** JSON depth tracking per tool call index. */
  private depths = new Map<number, number>();

  /**
   * Processes a chunk of streaming tool call data.
   * Reconstructs complete JSON when the structure is balanced (depth === 0).
   */
  addChunk(
    index: number,
    chunk: string,
    id?: string,
    name?: string,
  ): ToolCallParseResult {
    // TODO(Phase 2.5): Implement tool-call streaming parser
    return {
      complete: false,
      error: undefined,
      repaired: false,
    };
  }
}
