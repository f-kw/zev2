import type express from 'express';
import { createHash } from 'node:crypto';
import { bearerTokenFromHeader, secretTextMatches, trimText } from './api-token.js';

const humanSessionCookieName = 'zev2_human_session';

export function configuredHumanApiToken(): string {
  return trimText(process.env.ZEV2_HUMAN_API_TOKEN);
}

function humanSessionValue(token: string): string {
  return createHash('sha256').update(`zev2-human-ui:${token}`).digest('hex');
}

function cookieValueFromHeader(cookieHeader: unknown, name: string): string {
  const text = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
  if (typeof text !== 'string') {
    return '';
  }

  for (const part of text.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (rawKey === name) {
      try {
        return decodeURIComponent(rawValue.join('='));
      } catch {
        return '';
      }
    }
  }

  return '';
}

export function isHumanApiRequestAuthenticated(request: express.Request): boolean {
  const expectedToken = configuredHumanApiToken();
  if (!expectedToken) {
    return true;
  }

  const bearerToken = bearerTokenFromHeader(request.headers.authorization);
  if (secretTextMatches(bearerToken, expectedToken)) {
    return true;
  }

  const cookieValue = cookieValueFromHeader(request.headers.cookie, humanSessionCookieName);
  return secretTextMatches(cookieValue, humanSessionValue(expectedToken));
}

export function createHumanSessionCookie(): string {
  const expectedToken = configuredHumanApiToken();
  const cookieValue = encodeURIComponent(humanSessionValue(expectedToken));
  return `${humanSessionCookieName}=${cookieValue}; HttpOnly; SameSite=Lax; Path=/`;
}

export function clearHumanSessionCookie(): string {
  return `${humanSessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export function requireHumanApiToken(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction
): void {
  if (isHumanApiRequestAuthenticated(request)) {
    next();
    return;
  }

  response.status(401).json({ error: '人間UIの認証が必要です' });
}

export function verifyHumanLoginToken(token: unknown): boolean {
  return secretTextMatches(trimText(token), configuredHumanApiToken());
}
