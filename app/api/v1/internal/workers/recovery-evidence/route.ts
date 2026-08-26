import { timingSafeEqual } from 'node:crypto';

import {
  DatabaseRecoveryEvidenceError,
  recordDatabaseRecoveryEvidence,
} from '@/services/databaseRecoveryEvidenceService';

export const runtime = 'nodejs';

const MINIMUM_SECRET_LENGTH = 32;

function authorized(request: Request): boolean {
  const configured = process.env.AUTOPILOT_WORKER_SECRET?.trim() ?? '';
  const header = request.headers.get('authorization') ?? '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (configured.length < MINIMUM_SECRET_LENGTH || supplied.length !== configured.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(configured));
}

export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body: unknown = await request.json();
    const result = await recordDatabaseRecoveryEvidence(body);
    return Response.json({
      canonicalTableCount: result.canonicalTableCount,
      evidenceId: result.evidenceId,
      financialMetricCount: result.financialMetricCount,
      recoveryVerified: true,
      verifiedAt: result.verifiedAt,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }
    if (error instanceof DatabaseRecoveryEvidenceError) {
      const status = error.code === 'RECOVERY_EVIDENCE_CONFLICT' ? 409 : 400;
      return Response.json({ error: 'Recovery evidence was not accepted' }, { status });
    }
    return Response.json({ error: 'Recovery evidence could not be recorded' }, { status: 500 });
  }
}
