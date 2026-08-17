import 'dotenv/config';

import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  datasource: {
    url: env('DIRECT_DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/postgresql/migrations',
  },
  schema: 'prisma/postgresql/schema.prisma',
});
