import type { RequestDraftActivityEvent } from './api';

export type ActivityLogCategory = 'agent' | 'user' | 'external' | 'system';
export type ActivityFilter = 'all' | ActivityLogCategory;

export type ActivityLogItem = {
  id: string;
  timeText: string;
  title: string;
  detail: string;
  className: string;
  actorText: string;
  category: ActivityLogCategory;
};

export const activityFilterOptions: Array<{ value: ActivityFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'agent', label: 'AI作業' },
  { value: 'user', label: '人間判断' },
  { value: 'external', label: '外部レビュー' }
];

export function activityKindClass(kind: RequestDraftActivityEvent['kind']): string {
  if (kind === 'human_review_required') {
    return 'needs-review';
  }

  if (kind === 'human_review_action' || kind === 'final_review_action') {
    return 'user-action';
  }

  if (
    kind === 'agent_request_status' ||
    kind === 'agent_operation_log' ||
    kind === 'agent_decision' ||
    kind === 'web_gemini_review_status'
  ) {
    return 'agent-action';
  }

  return 'system-action';
}

export function activityCategory(event: RequestDraftActivityEvent): ActivityLogCategory {
  if (event.kind === 'web_gemini_review_status') {
    return 'external';
  }

  if (event.kind === 'publish_package_status') {
    return 'system';
  }

  if (
    event.kind === 'human_review_action' ||
    event.kind === 'final_review_action' ||
    event.kind === 'human_review_required'
  ) {
    return 'user';
  }

  if (
    event.kind === 'agent_request_created' ||
    event.kind === 'agent_request_status' ||
    event.kind === 'agent_operation_log' ||
    event.kind === 'agent_decision'
  ) {
    return 'agent';
  }

  return 'system';
}

export function activityActorText(actor: RequestDraftActivityEvent['actor']): string {
  if (actor === 'user') {
    return 'ユーザー';
  }

  if (actor === 'agent') {
    return 'AI';
  }

  if (actor === 'runner') {
    return '実行処理';
  }

  if (actor === 'backend') {
    return 'アプリ';
  }

  return 'システム';
}

export function activityLogItemFromEvent(
  event: RequestDraftActivityEvent,
  timeText: string
): ActivityLogItem {
  return {
    id: event.id,
    timeText,
    title: event.title,
    detail: event.detail,
    className: activityKindClass(event.kind),
    actorText: activityActorText(event.actor),
    category: activityCategory(event)
  };
}

export function fallbackActivityLogItem(message: string): ActivityLogItem {
  return {
    id: message,
    timeText: '--',
    title: message,
    detail: '',
    className: 'system-action',
    actorText: '',
    category: 'system'
  };
}

export function filterActivityLogItems(
  items: ActivityLogItem[],
  filter: ActivityFilter,
  emptyMessage = 'この種類の履歴はまだありません'
): ActivityLogItem[] {
  if (filter === 'all') {
    return items;
  }

  const filteredItems = items.filter((item) => item.category === filter);
  return filteredItems.length > 0 ? filteredItems : [fallbackActivityLogItem(emptyMessage)];
}
