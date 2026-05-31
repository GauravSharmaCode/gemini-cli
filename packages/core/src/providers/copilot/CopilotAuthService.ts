/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { Storage } from '../../config/storage.js';
import { debugLogger } from '../../utils/debugLogger.js';
import { coreEvents } from '../../utils/events.js';
import { getConsentForOauth } from '../../utils/authConsent.js';
import { openBrowserSecurely } from '../../utils/secure-browser-launcher.js';
import { getErrorMessage } from '../../utils/errors.js';

const CLIENT_ID = 'Ov23li8tweQw6odWQebz'; // GitHub Copilot CLI Client ID
const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const OAUTH_POLLING_SAFETY_MARGIN_MS = 3000;

export interface CopilotToken {
  accessToken: string;
  user?: string;
}

/**
 * Service for handling GitHub Copilot authentication using the Device Flow.
 */
export class CopilotAuthService {
  private cachedToken: CopilotToken | null = null;

  constructor() {}

  /**
   * Returns a valid access token, initiating authentication if necessary.
   */
  async getToken(): Promise<string> {
    if (this.cachedToken) {
      return this.cachedToken.accessToken;
    }

    const token = await this.loadToken();
    if (token) {
      this.cachedToken = token;
      return token.accessToken;
    }

    const authenticatedToken = await this.authenticateInteractively();
    this.cachedToken = authenticatedToken;
    await this.saveToken(authenticatedToken);
    return authenticatedToken.accessToken;
  }

  private async loadToken(): Promise<CopilotToken | null> {
    const tokenPath = Storage.getCopilotTokenPath();
    if (!fs.existsSync(tokenPath)) {
      return null;
    }
    try {
      const content = fs.readFileSync(tokenPath, 'utf8');
      return JSON.parse(content) as CopilotToken;
    } catch (error) {
      debugLogger.warn('Failed to load Copilot token:', getErrorMessage(error));
      return null;
    }
  }

  private async saveToken(token: CopilotToken): Promise<void> {
    const tokenPath = Storage.getCopilotTokenPath();
    try {
      fs.writeFileSync(tokenPath, JSON.stringify(token, null, 2));
    } catch (error) {
      debugLogger.warn('Failed to save Copilot token:', getErrorMessage(error));
    }
  }

  /**
   * Performs the GitHub Device OAuth flow.
   */
  private async authenticateInteractively(): Promise<CopilotToken> {
    const consent = await getConsentForOauth(
      'Authentication required for GitHub Copilot.',
    );
    if (!consent) {
      throw new Error('Authentication cancelled by user.');
    }

    debugLogger.debug('Initiating GitHub Copilot device flow...');

    const deviceResponse = await fetch(DEVICE_CODE_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        scope: 'read:user',
      }),
    });

    if (!deviceResponse.ok) {
      throw new Error('Failed to initiate device authorization with GitHub');
    }

    const deviceData = (await deviceResponse.json()) as {
      verification_uri: string;
      user_code: string;
      device_code: string;
      interval: number;
    };

    coreEvents.emitFeedback(
      'info',
      `\nTo authenticate with GitHub Copilot:\n` +
        `1. Open this URL in your browser: ${deviceData.verification_uri}\n` +
        `2. Enter the code: ${deviceData.user_code}\n`,
    );

    try {
      await openBrowserSecurely(deviceData.verification_uri);
    } catch (error) {
      debugLogger.warn(
        'Failed to open browser automatically:',
        getErrorMessage(error),
      );
    }

    debugLogger.debug('Waiting for authorization...');

    while (true) {
      const response = await fetch(ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          device_code: deviceData.device_code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to poll for GitHub access token');
      }

      const data = (await response.json()) as {
        access_token?: string;
        error?: string;
        interval?: number;
      };

      if (data.access_token) {
        debugLogger.debug('✓ GitHub Copilot authentication successful!');
        return { accessToken: data.access_token };
      }

      if (data.error === 'authorization_pending') {
        await sleep(
          deviceData.interval * 1000 + OAUTH_POLLING_SAFETY_MARGIN_MS,
        );
        continue;
      }

      if (data.error === 'slow_down') {
        const newInterval =
          (data.interval || deviceData.interval + 5) * 1000 +
          OAUTH_POLLING_SAFETY_MARGIN_MS;
        await sleep(newInterval);
        continue;
      }

      throw new Error(`GitHub authentication failed: ${data.error}`);
    }
  }
}
