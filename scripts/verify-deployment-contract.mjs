import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath} is missing.`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function requireText(source, expected, message) {
  if (!source.includes(expected)) failures.push(message);
}

const nextConfig = read('next.config.ts');
const dockerfile = read('Dockerfile');
const dockerignore = read('.dockerignore');
const compose = read('compose.portable-preview.yaml');
const deploymentGuide = read('docs/PORTABLE_DEPLOYMENT.md');
const schema = read('prisma/schema.prisma');
const packageJson = read('package.json');
const databaseRuntime = read('lib/database/runtime.ts');
const cutoverVerifier = read('scripts/rehearse-postgresql-cutover.mjs');
const releaseVerifier = read('scripts/verify-release-env.mjs');

requireText(
  nextConfig,
  "process.env.NEXT_OUTPUT_MODE === 'standalone'",
  'Next.js must support the isolated standalone container output mode.',
);
requireText(
  dockerfile,
  'FROM node:22-bookworm-slim',
  'The container must use the approved Node 22 base.',
);
requireText(dockerfile, 'USER nextjs', 'The web container must run as a non-root user.');
requireText(dockerfile, 'HEALTHCHECK', 'The web container must define a readiness health check.');
requireText(
  dockerfile,
  'ENV NEXT_OUTPUT_MODE=standalone',
  'The container builder must enable standalone output.',
);
requireText(
  dockerfile,
  'CMD ["node", "server.js"]',
  'The web container must start the standalone server.',
);
requireText(dockerignore, '.env.*', 'Container context must exclude environment files.');
requireText(dockerignore, '*.db', 'Container context must exclude local database files.');
requireText(dockerignore, 'backups', 'Container context must exclude database backups.');
requireText(
  compose,
  'condition: service_completed_successfully',
  'Portable preview must complete migrations before starting the portal.',
);
requireText(compose, 'cap_drop:', 'Portable preview must drop Linux capabilities.');
requireText(
  compose,
  'no-new-privileges:true',
  'Portable preview must prevent privilege escalation.',
);
requireText(
  deploymentGuide,
  'not a production database architecture',
  'Deployment documentation must state that the SQLite preview is not production architecture.',
);
requireText(
  schema,
  'provider = "sqlite"',
  'The verifier must be updated when the Prisma provider changes.',
);
requireText(
  packageJson,
  '"@prisma/adapter-pg"',
  'Production dependencies must include the PostgreSQL driver adapter.',
);
requireText(
  databaseRuntime,
  'validatePostgreSqlRuntimeUrl',
  'The database runtime must validate PostgreSQL before constructing its client.',
);
requireText(
  cutoverVerifier,
  'compareDatabaseSnapshots',
  'The deployment contract must include deterministic cutover reconciliation.',
);
requireText(
  releaseVerifier,
  'validateProductionDatabaseContract',
  'Production preflight must verify the managed PostgreSQL contract.',
);

if (/COPY\s+.*\.env/im.test(dockerfile)) {
  failures.push('Dockerfile must never copy an environment file explicitly.');
}

if (/gho_[a-z0-9]+|sk_live_[a-z0-9]+/i.test(`${dockerfile}\n${compose}`)) {
  failures.push('Deployment files appear to contain a live credential.');
}

if (failures.length) {
  console.error('Deployment contract verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    'Deployment contract verified. Runtime PostgreSQL support is ready; live infrastructure and cutover approval remain gated.',
  );
}
