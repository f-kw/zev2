import { timingSafeEqual } from 'node:crypto';

export function trimText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function bearerTokenFromHeader(value: unknown): string {
  const text = Array.isArray(value) ? value[0] : value;
  if (typeof text !== 'string') {
    return '';
  }

  const prefix = 'Bearer ';
  return text.startsWith(prefix) ? text.slice(prefix.length).trim() : '';
}

export function secretTextMatches(actual: string, expected: string): boolean {
  if (!actual || !expected) {
    return false;
  }

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
