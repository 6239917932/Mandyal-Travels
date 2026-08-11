export function getSafeReturnTo(value: unknown) {
  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    /[\r\n\0]/.test(value)
  ) {
    return null;
  }
  return value;
}
