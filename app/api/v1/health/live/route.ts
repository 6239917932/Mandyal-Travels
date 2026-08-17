const RESPONSE_HEADERS = { 'Cache-Control': 'no-store' };

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    {
      data: {
        checkedAt: new Date().toISOString(),
        service: 'mandyal-travels-portal',
        status: 'alive',
      },
    },
    { headers: RESPONSE_HEADERS },
  );
}
