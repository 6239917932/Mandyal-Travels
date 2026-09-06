'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

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
  if (publicPaths.includes(pathname)) return children;

  const isActive = (href: string) => {
    if (pathname === href) return true;
    const root = href.split('/').filter(Boolean).length === 1;
    return !root && pathname.startsWith(`${href}/`);
  };

  return (
    <div className="workspace-shell">
      <aside aria-label={`${title} navigation`} className="workspace-sidebar">
        <div className="workspace-sidebar__brand">
          <span aria-hidden="true">MT</span>
          <div>
            <strong>{title}</strong>
            <small>{subtitle}</small>
          </div>
        </div>
        <nav aria-label={`${title} sections`}>
          {groups.map((group) => (
            <details className="workspace-sidebar__group" key={group.label} open>
              <summary>{group.label}</summary>
              <div className="workspace-sidebar__links">
                {group.items.map((item) =>
                  item.href ? (
                    <Link
                      aria-current={isActive(item.href) ? 'page' : undefined}
                      href={item.href}
                      key={`${group.label}-${item.label}`}
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
        <div className="workspace-sidebar__account">
          <span>{identity}</span>
          <form action="/api/v1/auth/logout" method="post">
            <button type="submit">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="workspace-shell__content">{children}</div>
    </div>
  );
}
