import type express from 'express';
import { timingSafeEqual } from 'node:crypto';

function trimText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function configuredAgentApiToken(): string {
  return trimText(process.env.ZEV2_AGENT_API_TOKEN);
}

function bearerTokenFromHeader(value: unknown): string {
  const text = Array.isArray(value) ? value[0] : value;
  if (typeof text !== 'string') {
    return '';
  }

  const prefix = 'Bearer ';
  return text.startsWith(prefix) ? text.slice(prefix.length).trim() : '';
}

function secretTextMatches(actual: string, expected: string): boolean {
  if (!actual || !expected) {
    return false;
  }

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function requireAgentApiToken(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction
): void {
  const expectedToken = configuredAgentApiToken();
  if (!expectedToken) {
    next();
    return;
  }

  const actualToken = bearerTokenFromHeader(request.headers.authorization);
  if (!secretTextMatches(actualToken, expectedToken)) {
    response.status(401).json({ error: 'AIエージェントAPIの認証が必要です' });
    return;
  }

  next();
}
