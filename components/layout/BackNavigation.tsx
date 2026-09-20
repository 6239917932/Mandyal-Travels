'use client';

import { usePathname, useRouter } from 'next/navigation';

export function BackNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  const isWorkspacePath =
    /^\/(account|admin|agent|partner)(\/|$)/.test(pathname) ||
    /^\/business\/(audit|dashboard|members|reports|requests|statements|support)(\/|$)/.test(
      pathname,
    );
  const isPrimaryPublicPage = [
    '/',
    '/contact',
    '/destinations',
    '/login',
    '/manage-booking',
    '/offers',
    '/trip-planner',
  ].includes(pathname);

  if (isWorkspacePath || isPrimaryPublicPage) return null;

  function goBack() {
    const previousPage = document.referrer;
    const isPreviousPageInPortal = previousPage
      ? new URL(previousPage).origin === window.location.origin
      : false;

    if (isPreviousPageInPortal) {
      router.back();
      return;
    }

    router.push('/');
  }

  return (
    <div className="back-navigation">
      <div className="back-navigation__inner">
        <button aria-label="Return to previous page" onClick={goBack} type="button">
          <span aria-hidden="true">&larr;</span> Back to previous page
        </button>
      </div>
    </div>
  );
}
