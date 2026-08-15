export type OutboxRetryDecision = {
  nextAttemptAt: Date;
  status: 'DEAD_LETTER' | 'PENDING';
};

export function outboxRetryDecision(input: {
  attempts: number;
  maxAttempts: number;
  now: Date;
}): OutboxRetryDecision {
  const nextAttempts = input.attempts + 1;
  if (nextAttempts >= input.maxAttempts) {
    return { nextAttemptAt: input.now, status: 'DEAD_LETTER' };
  }
  const delayMinutes = Math.min(360, 2 ** Math.max(0, nextAttempts - 1));
  return {
    nextAttemptAt: new Date(input.now.getTime() + delayMinutes * 60_000),
    status: 'PENDING',
  };
}

export function safeOutboxError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown integration delivery failure.';
  return message
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 500);
}
