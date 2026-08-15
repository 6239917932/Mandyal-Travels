const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

export function correlationIdFromHeader(value: string | null): string {
  const candidate = value?.trim() ?? '';
  return REQUEST_ID_PATTERN.test(candidate) ? candidate : crypto.randomUUID();
}
