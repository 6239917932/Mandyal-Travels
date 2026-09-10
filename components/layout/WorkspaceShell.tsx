'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';

import { getWorkspaceActiveNavigationKey } from '@/lib/navigation/workspaceActiveRoute';

export type WorkspaceNavigationItem = Readonly<{
  code: string;
  href?: string;
  label: string;
  note?: string;
}>;

export type WorkspaceNavigationGroup = Readonly<{
  items: readonly WorkspaceNavigationItem[];
  label: string;
}>;

type WorkspaceShellProps = Readonly<{
  children: ReactNode;
  groups: readonly WorkspaceNavigationGroup[];
  identity: string;
  publicPaths?: readonly string[];
  subtitle: string;
  title: string;
}>;

export function WorkspaceShell({
  children,
  groups,
  identity,
  publicPaths = [],
  subtitle,
  title,
}: WorkspaceShellProps) {
  const pathname = usePathname();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigationToggleRef = useRef<HTMLInputElement>(null);
  const isPublicPath = publicPaths.includes(pathname);
  const activeNavigationKey = getWorkspaceActiveNavigationKey(pathname, groups);
  const activeCoordinates = activeNavigationKey?.split(':').map(Number);
  const activeGroup = activeCoordinates ? groups[activeCoordinates[0]] : undefined;
  const activeItem = activeCoordinates ? activeGroup?.items[activeCoordinates[1]] : undefined;
  const pageLabel = activeItem?.label ?? title;
  const initials = title
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!navigationOpen) return;
    document.body.classList.add('workspace-navigation-open');
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (navigationToggleRef.current) navigationToggleRef.current.checked = false;
      setNavigationOpen(false);
    }
    function closeOnHistoryNavigation() {
      if (navigationToggleRef.current) navigationToggleRef.current.checked = false;
      setNavigationOpen(false);
    }
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('popstate', closeOnHistoryNavigation);
    return () => {
      document.body.classList.remove('workspace-navigation-open');
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('popstate', closeOnHistoryNavigation);
    };
  }, [navigationOpen]);

  function closeNavigation() {
    if (navigationToggleRef.current) navigationToggleRef.current.checked = false;
    setNavigationOpen(false);
  }

  function activateNavigationLabel(event: ReactKeyboardEvent<HTMLLabelElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    navigationToggleRef.current?.click();
  }

  if (isPublicPath) return children;

  return (
    <div className={`workspace-shell${navigationOpen ? 'workspace-shell--nav-open' : ''}`}>
      <input
        aria-hidden="true"
        className="workspace-shell__nav-toggle"
        defaultChecked={false}
        id="workspace-navigation-toggle"
        onChange={(event) => setNavigationOpen(event.currentTarget.checked)}
        ref={navigationToggleRef}
        tabIndex={-1}
        type="checkbox"
      />
      <label
        aria-label="Close workspace navigation"
        className="workspace-shell__backdrop"
        htmlFor="workspace-navigation-toggle"
        onKeyDown={activateNavigationLabel}
        role="button"
        tabIndex={navigationOpen ? 0 : -1}
      />
      <aside
        aria-label={`${title} navigation`}
        className="workspace-sidebar"
        id="workspace-navigation"
      >
        <div className="workspace-sidebar__brand">
          <span aria-hidden="true">{initials}</span>
          <div>
            <small>Mandyal workspace</small>
            <strong>{title}</strong>
            <span>{subtitle}</span>
          </div>
          <label
            aria-controls="workspace-navigation"
            aria-expanded={navigationOpen}
            aria-label="Close workspace menu"
            className="workspace-sidebar__close"
            htmlFor="workspace-navigation-toggle"
            onKeyDown={activateNavigationLabel}
            role="button"
            tabIndex={0}
          >
            <span aria-hidden="true">×</span>
          </label>
        </div>
        <nav aria-label={`${title} sections`}>
          {groups.map((group, groupIndex) => (
            <details className="workspace-sidebar__group" key={group.label} open>
              <summary>{group.label}</summary>
              <div className="workspace-sidebar__links">
                {group.items.map((item, itemIndex) =>
                  item.href ? (
                    <Link
                      aria-current={
                        activeNavigationKey === `${groupIndex}:${itemIndex}` ? 'page' : undefined
                      }
                      href={item.href}
                      key={`${group.label}-${item.label}`}
                      onClick={closeNavigation}
                      prefetch={false}
                    >
                      <span aria-hidden="true">{item.code}</span>
                      <strong>{item.label}</strong>
                      {item.note ? <small>{item.note}</small> : null}
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="workspace-sidebar__disabled"
                      key={`${group.label}-${item.label}`}
                    >
                      <span aria-hidden="true">{item.code}</span>
                      <strong>{item.label}</strong>
                      {item.note ? <small>{item.note}</small> : null}
                    </span>
                  ),
                )}
              </div>
            </details>
          ))}
        </nav>
      </aside>
      <div className="workspace-shell__stage">
        <header className="workspace-topbar">
          <div className="workspace-topbar__context">
            <label
              aria-controls="workspace-navigation"
              aria-expanded={navigationOpen}
              aria-label={navigationOpen ? 'Close workspace menu' : 'Open workspace menu'}
              className="workspace-topbar__menu"
              htmlFor="workspace-navigation-toggle"
              onKeyDown={activateNavigationLabel}
              role="button"
              tabIndex={0}
            >
              <span aria-hidden="true">☰</span>
              <span>Menu</span>
            </label>
            <div>
              <span>{activeGroup?.label ?? subtitle}</span>
              <strong>{pageLabel}</strong>
            </div>
          </div>
          <div className="workspace-topbar__status">
            <span className="workspace-topbar__secure">
              <i /> Secure workspace
            </span>
            <span aria-hidden="true" className="workspace-topbar__avatar">
              {initials}
            </span>
            <span className="workspace-topbar__identity">{identity}</span>
            <form action="/api/v1/auth/logout" method="post">
              <button className="workspace-topbar__signout" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="workspace-shell__content" id="workspace-main">
          {children}
        </main>
      </div>
    </div>
  );
}
