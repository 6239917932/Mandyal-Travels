import process from 'node:process';

import { boundedInteger, runtimeBaseUrl } from './lib/runtime-http.mjs';

const maximumPages = boundedInteger(process.env.LINK_AUDIT_MAX_PAGES, 120, 1, 500);
const requestTimeoutMs = boundedInteger(process.env.RUNTIME_HTTP_TIMEOUT_MS, 10_000, 500, 60_000);
const errorPattern =
  /internal server error|application error|we could not open this page|invalid\s+`?prisma|does not exist in the current database/i;
const ignoredPathPrefixes = ['/_next/', '/api/'];
const ignoredProtocols = ['javascript:', 'mailto:', 'tel:'];

function decodeAttribute(value) {
  return value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
}

function discoverInternalLinks(html, pageUrl) {
  const links = new Set();
  for (const match of html.matchAll(/<a\b[^>]*\shref\s*=\s*["']([^"']+)["']/gi)) {
    const rawHref = decodeAttribute(match[1]?.trim() ?? '');
    if (!rawHref || rawHref.startsWith('#')) continue;
    if (ignoredProtocols.some((protocol) => rawHref.toLowerCase().startsWith(protocol))) continue;

    let url;
    try {
      url = new URL(rawHref, pageUrl);
    } catch {
      continue;
    }

    if (url.origin !== runtimeBaseUrl.origin) continue;
    if (ignoredPathPrefixes.some((prefix) => url.pathname.startsWith(prefix))) continue;
    if (url.pathname === '/logout') continue;
    url.hash = '';
    links.add(url.href);
  }
  return links;
}

const queued = [new URL('/', runtimeBaseUrl).href];
const visited = new Set();
const failures = [];
const checkedPages = [];

while (queued.length > 0 && visited.size < maximumPages) {
  const requestedUrl = queued.shift();
  if (!requestedUrl || visited.has(requestedUrl)) continue;
  visited.add(requestedUrl);

  try {
    const startedAt = performance.now();
    const response = await fetch(requestedUrl, {
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    const body = await response.text();
    const contentType = response.headers.get('content-type') ?? '';
    const finalUrl = new URL(response.url);

    checkedPages.push({
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      path: new URL(requestedUrl).pathname,
      status: response.status,
    });

    if (response.status < 200 || response.status >= 400) {
      failures.push(`${requestedUrl} returned HTTP ${response.status}`);
      continue;
    }
    if (finalUrl.origin !== runtimeBaseUrl.origin) {
      failures.push(`${requestedUrl} redirected outside the portal to ${finalUrl.origin}`);
      continue;
    }
    if (!contentType.toLowerCase().includes('text/html')) continue;
    if (errorPattern.test(body)) failures.push(`${requestedUrl} rendered an application error`);

    for (const link of discoverInternalLinks(body, finalUrl)) {
      if (!visited.has(link) && !queued.includes(link)) queued.push(link);
    }
  } catch (error) {
    failures.push(
      `${requestedUrl} failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }
}

if (queued.length > 0) {
  failures.push(`internal link crawl exceeded the ${maximumPages}-page safety limit`);
}

console.log(
  JSON.stringify(
    {
      baseUrl: runtimeBaseUrl.href,
      checkedPages,
      failureCount: failures.length,
    },
    null,
    2,
  ),
);

if (failures.length > 0) {
  console.error(`Internal link audit failed:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('Internal portal link audit passed.');
}
