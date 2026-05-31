/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { ProviderRegistry, defaultProviderRegistry } from './providerRegistry.js';
import { ProviderType } from './providerTypes.js';
import { ProviderNotFoundError } from './errors.js';
import '../core/contentGenerator.js';
import type { ContentGenerator } from '../core/contentGenerator.js';
import type { Config } from '../config/config.js';

describe('ProviderRegistry', () => {
  it('should pre-register GEMINI on the defaultProviderRegistry', () => {
    expect(defaultProviderRegistry.has(ProviderType.GEMINI)).toBe(true);
    expect(defaultProviderRegistry.getRegisteredProviders()).toContain(ProviderType.GEMINI);
  });

  it('should allow registering and creating a custom provider', async () => {
    const registry = new ProviderRegistry();
    const mockGenerator = {} as ContentGenerator;
    const mockFactory = vi.fn().mockResolvedValue(mockGenerator);

    registry.register(ProviderType.OPENAI, mockFactory);

    expect(registry.has(ProviderType.OPENAI)).toBe(true);
    expect(registry.getRegisteredProviders()).toEqual([ProviderType.OPENAI]);

    const cgConfig = { authType: 'api-key' } as any;
    const config = {} as Config;

    const result = await registry.create(ProviderType.OPENAI, cgConfig, config, 'session-123');

    expect(result).toBe(mockGenerator);
    expect(mockFactory).toHaveBeenCalledWith(cgConfig, config, 'session-123');
  });

  it('should throw ProviderNotFoundError when creating unregistered provider', async () => {
    const registry = new ProviderRegistry();
    const cgConfig = {} as any;
    const config = {} as Config;

    await expect(
      registry.create(ProviderType.COPILOT, cgConfig, config),
    ).rejects.toThrow(ProviderNotFoundError);
  });
});
