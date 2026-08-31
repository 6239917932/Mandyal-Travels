export type NotificationVariable = string | number | boolean | null;
export type NotificationVariables = Readonly<Record<string, NotificationVariable>>;

export interface NotificationRetryDecision {
  attempts: number;
  nextAttemptAt: Date;
  status: 'QUEUED' | 'DEAD_LETTER';
}

const TEMPLATE_TOKEN = /{{\s*([A-Za-z][A-Za-z0-9_.-]{0,63})\s*}}/g;
const VARIABLE_KEY = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;

export function notificationRetryAt(attempts: number, now = new Date()): Date {
  const boundedAttempts = Math.max(0, Math.min(attempts, 20));
  const delayMinutes = Math.min(24 * 60, 2 ** boundedAttempts);
  return new Date(now.getTime() + delayMinutes * 60_000);
}

export function notificationRetryDecision(input: {
  attempts: number;
  maxAttempts: number;
  now?: Date;
}): NotificationRetryDecision {
  const now = input.now ?? new Date();
  const attempts = Math.max(0, input.attempts) + 1;
  const maxAttempts = Math.max(1, input.maxAttempts);
  const status = attempts >= maxAttempts ? 'DEAD_LETTER' : 'QUEUED';

  return {
    attempts,
    status,
    nextAttemptAt: status === 'DEAD_LETTER' ? now : notificationRetryAt(attempts, now),
  };
}

export function parseNotificationVariables(value: string): NotificationVariables {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('NOTIFICATION_VARIABLES_INVALID');
  }

  const variables: Record<string, NotificationVariable> = {};
  for (const [key, item] of Object.entries(parsed)) {
    if (!VARIABLE_KEY.test(key)) throw new Error('NOTIFICATION_VARIABLE_KEY_INVALID');
    if (
      item !== null &&
      typeof item !== 'string' &&
      typeof item !== 'number' &&
      typeof item !== 'boolean'
    ) {
      throw new Error('NOTIFICATION_VARIABLE_VALUE_INVALID');
    }
    variables[key] = item;
  }
  return variables;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderNotificationTemplate(
  template: string,
  variables: NotificationVariables,
  options: { escapeValues?: boolean } = {},
): string {
  return template.replace(TEMPLATE_TOKEN, (_token, key: string) => {
    if (!Object.hasOwn(variables, key)) throw new Error(`NOTIFICATION_VARIABLE_MISSING:${key}`);
    const rawValue = variables[key];
    const value = rawValue === null ? '' : String(rawValue);
    return options.escapeValues ? escapeHtml(value) : value;
  });
}

export function htmlToNotificationText(value: string): string {
  let text = '';
  let index = 0;
  let suppressedTag: 'script' | 'style' | null = null;

  while (index < value.length) {
    if (value[index] !== '<') {
      if (!suppressedTag) text += value[index];
      index += 1;
      continue;
    }

    const tagEnd = value.indexOf('>', index + 1);
    if (tagEnd === -1) {
      if (!suppressedTag) text += value.slice(index);
      break;
    }

    const tag = value.slice(index + 1, tagEnd).trim();
    const closingName = tag.match(/^\/\s*([A-Za-z][A-Za-z0-9:-]*)/)?.[1]?.toLowerCase();
    const openingName = tag.match(/^([A-Za-z][A-Za-z0-9:-]*)/)?.[1]?.toLowerCase();

    if (suppressedTag) {
      if (closingName === suppressedTag) suppressedTag = null;
    } else if ((openingName === 'script' || openingName === 'style') && !tag.endsWith('/')) {
      suppressedTag = openingName;
      text += ' ';
    } else {
      text += ' ';
    }
    index = tagEnd + 1;
  }

  return text.replace(/\s+/g, ' ').trim();
}

export function sanitizeDeliveryError(value: unknown): string {
  return (value instanceof Error ? value.message : String(value))
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 500);
}
