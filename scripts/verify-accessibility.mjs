import process from 'node:process';

import { fetchRuntimePath, runtimeBaseUrl } from './lib/runtime-http.mjs';

const routes = [
  '/',
  '/hotels',
  '/flights',
  '/buses',
  '/cars',
  '/offers',
  '/business',
  '/partners',
  '/contact',
];
const failures = [];

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match?.[1]?.trim() ?? null;
}

function visibleText(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|#160);/gi, ' ')
    .trim();
}

function auditHtml(path, html) {
  const routeFailures = [];
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? '';
  if (!attribute(htmlTag, 'lang')) routeFailures.push('has no document language');
  if (!/<title>\s*[^<]+\s*<\/title>/i.test(html)) routeFailures.push('has no non-empty title');
  if ((html.match(/<main\b/gi) ?? []).length !== 1)
    routeFailures.push('must render exactly one main landmark');
  if (!/<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html)) routeFailures.push('has no level-one heading');

  const skipLink = html.match(/<a\b[^>]*class=["'][^"']*skip-link[^"']*["'][^>]*>/i)?.[0];
  const skipTarget = skipLink ? attribute(skipLink, 'href') : null;
  if (!skipTarget?.startsWith('#') || !html.includes(`id="${skipTarget.slice(1)}"`))
    routeFailures.push('has no valid skip-to-content link');

  for (const image of html.match(/<img\b[^>]*>/gi) ?? []) {
    if (attribute(image, 'alt') === null) routeFailures.push('contains an image without alt text');
  }

  for (const buttonMatch of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const tag = `<button${buttonMatch[1]}>`;
    if (!visibleText(buttonMatch[2]) && !attribute(tag, 'aria-label') && !attribute(tag, 'title'))
      routeFailures.push('contains an unnamed button');
  }

  const labels = new Set(
    [...html.matchAll(/<label\b[^>]*for=["']([^"']+)["']/gi)].map((match) => match[1]),
  );
  const wrappingLabels = [...html.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/gi)].map((match) => ({
    end: (match.index ?? 0) + match[0].length,
    start: match.index ?? 0,
  }));
  for (const match of html.matchAll(/<(?:input|select|textarea)\b[^>]*>/gi)) {
    const input = match[0];
    if (/type=["']hidden["']/i.test(input)) continue;
    const id = attribute(input, 'id');
    const inputIndex = match.index ?? -1;
    const hasWrappingLabel = wrappingLabels.some(
      (label) => inputIndex > label.start && inputIndex < label.end,
    );
    if (
      !attribute(input, 'aria-label') &&
      !attribute(input, 'aria-labelledby') &&
      !(id && labels.has(id)) &&
      !hasWrappingLabel
    )
      routeFailures.push(`contains an unlabeled form control${id ? ` (${id})` : ''}`);
  }

  failures.push(...new Set(routeFailures.map((message) => `${path} ${message}`)));
}

for (const path of routes) {
  try {
    const result = await fetchRuntimePath(path);
    if (result.status < 200 || result.status >= 400)
      failures.push(`${path} returned HTTP ${result.status}`);
    else auditHtml(path, result.body);
  } catch (error) {
    failures.push(`${path} failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

console.log(
  JSON.stringify({
    baseUrl: runtimeBaseUrl.href,
    checkedRoutes: routes.length,
    failureCount: failures.length,
  }),
);
if (failures.length) {
  console.error(`Accessibility contract failed:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('Automated accessibility baseline passed.');
}
