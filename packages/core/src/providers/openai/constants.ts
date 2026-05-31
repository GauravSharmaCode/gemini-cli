/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** Default timeout for OpenAI API requests (milliseconds). */
export const DEFAULT_TIMEOUT = 120000;

/** Default maximum retries for rate-limit errors. */
export const DEFAULT_MAX_RETRIES = 3;

/** Default base URLs for known providers. */
export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
export const DEFAULT_DASHSCOPE_BASE_URL =
  'https://dashscope.aliyuncs.com/compatible-mode/v1';
export const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
export const DEFAULT_OPEN_ROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/** Optional DashScope proxy override (for development/private deployments). */
export const DASHSCOPE_PROXY_BASE_URL = process.env['DASHSCOPE_PROXY_BASE_URL'];

/** Threshold for treating an exact-repeat chunk as cumulative mode. */
export const CUMULATIVE_DELTA_EXACT_REPEAT_MIN_LENGTH = 64;

/** Window size for cumulative-delta detection. */
export const CUMULATIVE_DETECTION_WINDOW_BYTES = 1024;

/** Default capped output tokens (to optimize slot allocation). */
export const CAPPED_DEFAULT_MAX_TOKENS = 8192;
