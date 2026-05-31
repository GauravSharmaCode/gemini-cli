/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Parser for extracting `<thinking>` tags from LLM responses.
 * Used for reasoning/thinking models (Claude, DeepSeek, Qwen3-Plus).
 */
export class TaggedThinkingParser {
  /**
   * Extracts thinking content from text wrapped in `<thinking>...</thinking>` tags.
   * Returns null if no tags are found.
   */
  parse(text: string): { thinking: string; content: string } | null {
    // TODO(Phase 2.6): Implement tagged thinking parser
    return null;
  }
}
