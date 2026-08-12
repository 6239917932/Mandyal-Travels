import { readJsonObject } from '@/lib/api/request';
import { getCurrentUser } from '@/lib/auth/session';
import {
  PartnerOperationsError,
  partnerOperationsService,
} from '@/services/partnerOperationsService';
import type { ApiErrorResponse } from '@/types/commerce';

function failure(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } } satisfies ApiErrorResponse, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return failure('AUTH_REQUIRED', 'Sign in before requesting supplier access.', 401);
  const body = await readJsonObject(request);
  if (!body) return failure('INVALID_JSON', 'Enter valid onboarding details.', 400);
  const required = [
    'businessName',
    'partnerType',
    'contactName',
    'contactEmail',
    'contactPhone',
    'city',
    'inventorySummary',
  ] as const;
  if (required.some((key) => typeof body[key] !== 'string'))
    return failure('INVALID_APPLICATION', 'Complete every onboarding field.', 400);
  try {
    const data = await partnerOperationsService.createApplication({
      applicantUserId: user.id,
      businessName: String(body.businessName),
      city: String(body.city),
      contactEmail: String(body.contactEmail),
      contactName: String(body.contactName),
      contactPhone: String(body.contactPhone),
      inventorySummary: String(body.inventorySummary),
      partnerType: String(body.partnerType),
    });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return error instanceof PartnerOperationsError
      ? failure(error.code, error.message, 409)
      : failure('APPLICATION_FAILED', 'The request could not be submitted.', 500);
  }
}
