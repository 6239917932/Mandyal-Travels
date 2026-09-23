import { timingSafeEqual } from 'node:crypto';

import { readJsonObject } from '@/lib/api/request';
import { kycStorageEnvironment } from '@/services/partnerKycStorageService';
import {
  PartnerKycGovernanceError,
  recordPartnerKycScanResult,
} from '@/services/partnerKycGovernanceService';

export const runtime = 'nodejs';

function authorized(request: Request): boolean {
  const expected = kycStorageEnvironment().callbackSecret;
  const supplied = request.headers.get('x-kyc-callback-secret');
  if (!expected || !supplied) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  if (!authorized(request))
    return Response.json({ error: 'Unauthorized callback.' }, { status: 401 });
  const body = await readJsonObject(request);
  if (
    !body ||
    typeof body.versionId !== 'string' ||
    typeof body.objectKey !== 'string' ||
    typeof body.sha256 !== 'string' ||
    !Number.isSafeInteger(body.byteSize) ||
    (body.status !== 'CLEAN' && body.status !== 'REJECTED')
  )
    return Response.json({ error: 'Invalid scan result.' }, { status: 400 });
  try {
    const result = await recordPartnerKycScanResult({
      byteSize: body.byteSize as number,
      objectKey: body.objectKey,
      sha256: body.sha256,
      status: body.status,
      versionId: body.versionId,
    });
    return Response.json({ data: result });
  } catch (error) {
    const status = error instanceof PartnerKycGovernanceError ? error.status : 500;
    return Response.json(
      { error: status === 500 ? 'Scan result could not be recorded.' : (error as Error).message },
      { status },
    );
  }
}
