import { PrismaClient } from '@/generated/prisma/client';
import { createDatabaseClient } from '@/lib/database/runtime';

const databaseUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createDatabaseClient(databaseUrl);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
