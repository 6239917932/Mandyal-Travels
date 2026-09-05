import { NextResponse } from 'next/server';

import { resolvePublicPortalOrigin } from '@/lib/url/publicOrigin';
import { reconcilePartnerOnboardingPayment } from '@/services/partnerEnrollmentService';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const transactionId = new URL(request.url).searchParams.get('txnid') ?? '';
  const destination = new URL('/partners/apply', resolvePublicPortalOrigin());
  destination.searchParams.set('paymentReturn', '1');
  let state = 'unmatched';
  try {
    const result = await reconcilePartnerOnboardingPayment(transactionId);
    state = result?.status.toLowerCase() ?? state;
  } catch {
    state = 'pending';
  }
  destination.searchParams.set('paymentStatus', state);
  const response = NextResponse.redirect(destination, 303);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
