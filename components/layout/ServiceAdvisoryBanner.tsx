'use client';

import { usePathname } from 'next/navigation';
import { useMemo, useSyncExternalStore } from 'react';

import type { PublicServiceAdvisory } from '@/services/serviceAdvisoryService';
import { doesServiceAdvisoryMatchPath } from '@/services/serviceAdvisoryPolicy';

const DISMISSED_ADVISORIES_KEY = 'mandyal-dismissed-service-advisories';
const DISMISSED_ADVISORIES_EVENT = 'mandyal:service-advisories-dismissed';

function readDismissedAdvisories(stored: string): string[] {
  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

function subscribeToDismissedAdvisories(onStoreChange: () => void) {
  window.addEventListener(DISMISSED_ADVISORIES_EVENT, onStoreChange);
  return () => window.removeEventListener(DISMISSED_ADVISORIES_EVENT, onStoreChange);
}

function getDismissedAdvisoriesSnapshot() {
  try {
    return window.sessionStorage.getItem(DISMISSED_ADVISORIES_KEY) ?? '[]';
  } catch {
    return '[]';
  }
}

export function ServiceAdvisoryBanner({
  advisories,
}: Readonly<{ advisories: PublicServiceAdvisory[] }>) {
  const pathname = usePathname();
  const dismissedSnapshot = useSyncExternalStore(
    subscribeToDismissedAdvisories,
    getDismissedAdvisoriesSnapshot,
    () => '[]',
  );
  const dismissed = useMemo(() => readDismissedAdvisories(dismissedSnapshot), [dismissedSnapshot]);

  const visibleAdvisories = useMemo(
    () =>
      advisories
        .filter(
          (advisory) =>
            doesServiceAdvisoryMatchPath(advisory.surface, pathname) &&
            !dismissed.includes(advisory.publicReference),
        )
        .slice(0, 3),
    [advisories, dismissed, pathname],
  );

  function dismiss(publicReference: string) {
    const nextDismissed = Array.from(new Set([...dismissed, publicReference]));
    window.sessionStorage.setItem(DISMISSED_ADVISORIES_KEY, JSON.stringify(nextDismissed));
    window.dispatchEvent(new Event(DISMISSED_ADVISORIES_EVENT));
  }

  if (visibleAdvisories.length === 0) return null;

  return (
    <section className="service-advisories" aria-label="Current service updates">
      {visibleAdvisories.map((advisory) => {
        const isUrgent = advisory.severity !== 'INFO';
        return (
          <article
            className={`service-advisory service-advisory--${advisory.severity.toLowerCase()}`}
            key={advisory.publicReference}
            role={isUrgent ? 'alert' : 'status'}
            aria-live={isUrgent ? 'assertive' : 'polite'}
          >
            <div>
              <p className="service-advisory__eyebrow">
                {advisory.severity === 'CRITICAL' ? 'Important service notice' : 'Service update'}
              </p>
              <p className="service-advisory__title">{advisory.title}</p>
              <p className="service-advisory__message">{advisory.message}</p>
              <p className="service-advisory__meta">
                Reference {advisory.publicReference}
                {advisory.endsAt
                  ? ` · Expected until ${new Intl.DateTimeFormat('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(advisory.endsAt))}`
                  : ''}
              </p>
            </div>
            <button
              className="service-advisory__dismiss"
              type="button"
              onClick={() => dismiss(advisory.publicReference)}
              aria-label={`Dismiss ${advisory.title}`}
            >
              Dismiss
            </button>
          </article>
        );
      })}
    </section>
  );
}
