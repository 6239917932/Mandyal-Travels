export function hasSameGeneratedContent(actual, expected) {
  const normalizeLineEndings = (value) => value.replace(/\r\n?/g, '\n');
  return normalizeLineEndings(actual) === normalizeLineEndings(expected);
}
