const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function calendarDateInTimezone(timezone: string, instant = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: timezone,
    year: 'numeric',
  }).formatToParts(instant);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function isIsoCalendarDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function resolveOperationalDate(
  storedDate: string | null | undefined,
  timezone: string,
  instant = new Date(),
): string {
  return storedDate && isIsoCalendarDate(storedDate)
    ? storedDate
    : calendarDateInTimezone(timezone, instant);
}

export function nextOperationalDate(value: string): string {
  if (!isIsoCalendarDate(value)) throw new Error('A valid operational date is required.');
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
