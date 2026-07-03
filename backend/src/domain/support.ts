import { nanoid } from 'nanoid';
import type { HumanReviewActionType } from '@zev2/shared';

export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(prefix: string): string {
  return `${prefix}_${nanoid()}`;
}

export function compactActivityText(value: unknown, fallback: string): string {
  const text = typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ')
    : '';
  const normalized = text || fallback;
  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
}


export const reviewActionLabelByType: Record<HumanReviewActionType, string> = {
  approve: '承認',
  reject: '却下',
  request_changes: '修正依頼'
};

export function reviewActionLabel(action: HumanReviewActionType): string {
  return reviewActionLabelByType[action];
}
