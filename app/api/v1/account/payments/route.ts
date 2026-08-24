import { getCurrentUser } from '@/lib/auth/session';
import {
  CustomerPaymentHistoryLimitError,
  getCustomerPaymentActivity,
} from '@/services/customerPaymentActivityService';
import { normalizeCustomerPaymentPage } from '@/services/customerPaymentActivityRules';

function errorResponse(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse('AUTH_REQUIRED', 'Sign in to view your payment activity.', 401);
  }

  const page = normalizeCustomerPaymentPage(new URL(request.url).searchParams.get('page') ?? '1');
  try {
    const activity = await getCustomerPaymentActivity(user.email, page);
    return Response.json({ data: activity });
  } catch (error) {
    if (error instanceof CustomerPaymentHistoryLimitError) {
      return errorResponse(
        'PAYMENT_HISTORY_LIMIT',
        'Your hotel payment history is larger than the online view. Contact support for help.',
        409,
      );
    }
    console.error('Customer payment activity lookup failed.', error);
    return errorResponse(
      'PAYMENT_HISTORY_UNAVAILABLE',
      'Your hotel payment activity is temporarily unavailable.',
      500,
    );
  }
}
