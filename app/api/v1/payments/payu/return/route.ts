import { NextResponse } from 'next/server';

import { resolvePublicPortalOrigin } from '@/lib/url/publicOrigin';
import {
  getPayuCheckoutContext,
  reconcilePayuCheckout,
} from '@/services/payuPaymentReconciliationService';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const transactionId = new URL(request.url).searchParams.get('txnid') ?? '';
  const origin = resolvePublicPortalOrigin();
  const context = await getPayuCheckoutContext(transactionId);
  if (!context) {
    return NextResponse.redirect(new URL('/hotels?paymentReturn=unmatched', origin), 303);
  }
  let state = 'pending';
  try {
    const result = await reconcilePayuCheckout(transactionId);
    state = result?.state.toLowerCase() ?? state;
  } catch {
    // The local payment page continues bounded reconciliation polling after this redirect.
  }
  const destination = new URL(
    `/hotels/${encodeURIComponent(context.quote.hotelSlug)}/booking/payment`,
    origin,
  );
  destination.searchParams.set('paymentReturn', '1');
  destination.searchParams.set('paymentStatus', state);
  const response = NextResponse.redirect(destination, 303);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
