import { readJsonObject } from '@/lib/api/request';
import { hotelDiscoveryService } from '@/services/hotelDiscoveryService';

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonObject(request, 4 * 1024);
  const intent = typeof body?.intent === 'string' ? body.intent.trim() : '';
  if (intent.length < 3 || intent.length > 300) {
    return Response.json(
      {
        error: {
          code: 'INVALID_TRAVEL_INTENT',
          message: 'Describe the stay you want in 3 to 300 characters.',
        },
      },
      { status: 400 },
    );
  }
  return Response.json({ data: await hotelDiscoveryService.interpret(intent) });
}
