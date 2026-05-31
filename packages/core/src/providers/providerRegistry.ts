/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ContentGenerator } from '../core/contentGenerator.js';
import type { ContentGeneratorConfig } from '../core/contentGenerator.js';
import type { Config } from '../config/config.js';
import { ProviderType } from './providerTypes.js';
import type { ContentGeneratorFactory } from './providerTypes.js';
import { ProviderNotFoundError } from './errors.js';

/**
 * A registry for model provider backends.
 * Decouples content generation routing from specific provider implementations.
 */
export class ProviderRegistry {
  private readonly factories = new Map<ProviderType, ContentGeneratorFactory>();

  /**
   * Registers a new provider factory.
   */
  register(type: ProviderType, factory: ContentGeneratorFactory): void {
    this.factories.set(type, factory);
  }

  /**
   * Checks if a provider factory is registered.
   */
  has(type: ProviderType): boolean {
    return this.factories.has(type);
  }

  /**
   * Creates a ContentGenerator using the registered factory for the given provider type.
   * Throws ProviderNotFoundError if no factory is registered.
   */
  async create(
    type: ProviderType,
    cgConfig: ContentGeneratorConfig,
    config: Config,
    sessionId?: string,
  ): Promise<ContentGenerator> {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new ProviderNotFoundError(type);
    }
    return factory(cgConfig, config, sessionId);
  }

  /**
   * Returns a list of all currently registered provider types.
   */
  getRegisteredProviders(): ProviderType[] {
    return Array.from(this.factories.keys());
  }
}

/**
 * Global default registry instance.
 */
export const defaultProviderRegistry = new ProviderRegistry();
