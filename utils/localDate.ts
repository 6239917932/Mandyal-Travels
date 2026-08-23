export function formatLocalCalendarDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function offsetLocalCalendarDate(baseDate: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) return '';
  const value = new Date(`${baseDate}T12:00:00`);
  if (Number.isNaN(value.valueOf())) return '';
  value.setDate(value.getDate() + days);
  return formatLocalCalendarDate(value);
}
