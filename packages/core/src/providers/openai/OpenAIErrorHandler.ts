/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProviderError } from '../errors.js';
import { ProviderType } from '../providerTypes.js';

export class OpenAIErrorHandler {
  handle(error: unknown, context?: { startTime: number }): never {
    // TODO(Phase 1.3): Implement error classification
    throw new ProviderError(
      error instanceof Error ? error.message : String(error),
      ProviderType.OPENAI,
      'OPENAI_ERROR',
    );
  }
}
