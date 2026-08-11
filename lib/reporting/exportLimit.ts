export const MAX_EXPORT_ROWS = 5_000;

export function exportLimitExceededResponse(message: string) {
  return Response.json(
    {
      code: 'EXPORT_LIMIT_EXCEEDED',
      error: message,
      limit: MAX_EXPORT_ROWS,
    },
    { headers: { 'Cache-Control': 'private, no-store' }, status: 422 },
  );
}
