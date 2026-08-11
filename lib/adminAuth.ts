import { getCurrentUser } from '@/lib/auth/session';

export const PLATFORM_ADMIN_ROLE = 'PLATFORM_ADMIN';

export async function getPlatformAdmin() {
  const user = await getCurrentUser();
  return user?.role === PLATFORM_ADMIN_ROLE ? user : null;
}
