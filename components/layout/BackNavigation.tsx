'use client';

import { usePathname, useRouter } from 'next/navigation';

export function BackNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/') return null;

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
          <span aria-hidden="true">â†</span> Back to previous page
        </button>
      </div>
    </div>
  );
}
