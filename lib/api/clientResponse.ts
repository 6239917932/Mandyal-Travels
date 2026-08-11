export async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const responseText = await response.text();
  if (!responseText) return null;

  try {
    return JSON.parse(responseText) as T;
  } catch {
    return null;
  }
}
