export function recordValue(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

export function arrayField(record: Record<string, unknown> | undefined, key: string): unknown[] {
  const value = record?.[key];
  return Array.isArray(value) ? value : [];
}

export function stringField(record: Record<string, unknown> | undefined, key: string): string {
  const value = record?.[key];
  return typeof value === 'string' ? value : '';
}

export function numberField(record: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = record?.[key];
  return typeof value === 'number' ? value : undefined;
}

export function booleanField(record: Record<string, unknown> | undefined, key: string): boolean | undefined {
  const value = record?.[key];
  return typeof value === 'boolean' ? value : undefined;
}

export function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function findById<T extends { id: string }>(
  items: readonly T[],
  id: string | undefined
): T | undefined {
  if (!id) {
    return undefined;
  }

  return items.find((item) => item.id === id);
}

export function isStatusIn(status: string, statuses: readonly string[]): boolean {
  return statuses.includes(status);
}

export function filterByStatus<T extends { status: string }>(
  items: readonly T[],
  statuses: readonly string[]
): T[] {
  return items.filter((item) => isStatusIn(item.status, statuses));
}

export function compareCreatedAtDesc<T extends { createdAt: string }>(left: T, right: T): number {
  return right.createdAt.localeCompare(left.createdAt);
}

export function sortByCreatedAtDesc<T extends { createdAt: string }>(items: readonly T[]): T[] {
  return [...items].sort(compareCreatedAtDesc);
}

export function latestByCreatedAt<T extends { createdAt: string }>(
  items: readonly T[]
): T | undefined {
  return sortByCreatedAtDesc(items)[0];
}

export function lastMatching<T>(
  items: readonly T[],
  predicate: (item: T) => boolean
): T | undefined {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (predicate(item)) {
      return item;
    }
  }

  return undefined;
}

export function uriWithRef(uri: string, refId: string | undefined): string {
  if (!refId) {
    return uri;
  }

  return `${uri}${uri.includes('?') ? '&' : '?'}ref=${encodeURIComponent(refId)}`;
}
