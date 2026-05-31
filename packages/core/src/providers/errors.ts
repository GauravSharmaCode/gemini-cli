/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ProviderType } from './providerTypes.js';

/**
 * Base class for provider-related errors.
 * Provider adapters should throw subclasses of this error so the CLI
 * can render them consistently regardless of the underlying provider.
 */
export class ProviderError extends Error {
  readonly providerType: ProviderType;
  readonly code: string;

  constructor(
    message: string,
    providerType: ProviderType,
    code: string,
  ) {
    super(message);
    this.name = 'ProviderError';
    this.providerType = providerType;
    this.code = code;
  }
}

/**
 * Thrown when a provider's authentication fails or credentials are missing.
 */
export class ProviderAuthError extends ProviderError {
  constructor(message: string, providerType: ProviderType) {
    super(message, providerType, 'AUTH_ERROR');
    this.name = 'ProviderAuthError';
  }
}

/**
 * Thrown when a provider rate-limits the request.
 * Contains an optional `retryAfterMs` hint for the retry logic.
 */
export class ProviderRateLimitError extends ProviderError {
  readonly retryAfterMs: number | undefined;

  constructor(
    message: string,
    providerType: ProviderType,
    retryAfterMs?: number,
  ) {
    super(message, providerType, 'RATE_LIMIT');
    this.name = 'ProviderRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Thrown when a requested provider type is not registered in the registry.
 */
export class ProviderNotFoundError extends ProviderError {
  constructor(providerType: ProviderType) {
    super(
      `Provider "${providerType}" is not registered. ` +
        `Available providers can be listed via ProviderRegistry.getRegisteredProviders().`,
      providerType,
      'PROVIDER_NOT_FOUND',
    );
    this.name = 'ProviderNotFoundError';
  }
}
