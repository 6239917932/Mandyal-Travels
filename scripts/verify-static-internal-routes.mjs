import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const appRoot = path.join(root, 'app');
const sourceRoots = ['app', 'components', 'lib'].map((entry) => path.join(root, entry));
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolutePath) : [absolutePath];
  });
}

function routePattern(filePath) {
  const relativeDirectory = path.relative(appRoot, path.dirname(filePath));
  const segments = relativeDirectory
    .split(path.sep)
    .filter(Boolean)
    .filter((segment) => !segment.startsWith('(') && !segment.startsWith('@'))
    .map((segment) => {
      if (/^\[\[\.\.\..+\]\]$/.test(segment)) return '.*';
      if (/^\[\.\.\..+\]$/.test(segment)) return '.+';
      if (/^\[.+\]$/.test(segment)) return '[^/]+';
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
  return new RegExp(`^/${segments.join('/')}${segments.length ? '' : ''}/?$`);
}

const routePatterns = walk(appRoot)
  .filter((filePath) => /(?:^|[\\/])(?:page|route)\.(?:ts|tsx|js|jsx)$/.test(filePath))
  .map(routePattern);

const failures = [];
let checkedLinks = 0;

for (const filePath of sourceRoots.flatMap(walk)) {
  if (!sourceExtensions.has(path.extname(filePath))) continue;
  const source = fs.readFileSync(filePath, 'utf8');
  const linkPattern = /\bhref\s*(?:=|:)\s*["'`]([^"'`]+)["'`]/g;
  for (const match of source.matchAll(linkPattern)) {
    const href = match[1]?.trim() ?? '';
    if (!href.startsWith('/') || href.startsWith('//') || href.includes('${')) continue;
    const pathname = new URL(href, 'https://portal.invalid').pathname;
    checkedLinks += 1;
    if (routePatterns.some((pattern) => pattern.test(pathname))) continue;
    const publicPath = path.join(root, 'public', ...pathname.split('/').filter(Boolean));
    if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) continue;

    const line = source.slice(0, match.index).split('\n').length;
    failures.push(`${path.relative(root, filePath)}:${line} links to missing route ${pathname}`);
  }
}

if (failures.length) {
  console.error('Static internal route verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Verified ${checkedLinks} static internal links against the application route map.`);
}
