/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ToolCallParseResult } from './types.js';

/**
 * Stateful parser for streaming tool calls.
 */
export class StreamingToolCallParser {
  private buffers = new Map<number, string>();
  private depths = new Map<number, number>();

  addChunk(
    index: number,
    chunk: string,
    id?: string,
    name?: string,
  ): ToolCallParseResult {
    // TODO(Phase 2.5): Implement tool-call streaming parser
    return { complete: false };
  }
}
