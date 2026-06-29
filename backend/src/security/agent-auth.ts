import type express from 'express';
import { bearerTokenFromHeader, secretTextMatches, trimText } from './api-token.js';

export function configuredAgentApiToken(): string {
  return trimText(process.env.ZEV2_AGENT_API_TOKEN);
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
