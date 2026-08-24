import { getCurrentUser } from '@/lib/auth/session';
import { boundedCustomerDocumentPage } from '@/lib/customerDocuments';
import { listCustomerDocuments } from '@/services/customerDocumentService';

export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: { code: 'AUTH_REQUIRED', message: 'Sign in to view your travel documents.' } },
      { status: 401 },
    );
  }

  const parameters = new URL(request.url).searchParams;
  try {
    const data = await listCustomerDocuments({
      email: user.email,
      hotelPage: boundedCustomerDocumentPage(parameters.get('hotelPage') ?? undefined),
      tripPage: boundedCustomerDocumentPage(parameters.get('tripPage') ?? undefined),
      userId: user.id,
    });
    return Response.json({ data });
  } catch (error) {
    console.error('Customer document index failed.', error);
    return Response.json(
      {
        error: {
          code: 'DOCUMENT_INDEX_UNAVAILABLE',
          message: 'Your travel documents could not be loaded. Please try again.',
        },
      },
      { status: 500 },
    );
  }
}
