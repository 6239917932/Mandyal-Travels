'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';

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
  if (publicPaths.includes(pathname)) return children;
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

  return (
    <div className={`workspace-shell${navigationOpen ? 'workspace-shell--nav-open' : ''}`}>
      <button
        aria-label="Close workspace navigation"
        className="workspace-shell__backdrop"
        onClick={() => setNavigationOpen(false)}
        type="button"
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
                      onClick={() => setNavigationOpen(false)}
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
            <button
              aria-controls="workspace-navigation"
              aria-expanded={navigationOpen}
              className="workspace-topbar__menu"
              onClick={() => setNavigationOpen((open) => !open)}
              type="button"
            >
              <span aria-hidden="true">☰</span>
              <span>Menu</span>
            </button>
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
