import type { ReactNode } from 'react';
import Link from 'next/link';

import { requirePartnerType } from '@/lib/partnerRouteGuard';
import { pmsModuleGroups, pmsModules } from '@/lib/pms/moduleRegistry';

export default async function PmsLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requirePartnerType('HOTEL');
  return (
    <div className="pms-shell">
      <aside aria-label="PMS modules" className="pms-sidebar">
        <div className="pms-sidebar__brand">
          <span>MT</span>
          <div>
            <strong>Mandyal PMS</strong>
            <small>Property control</small>
          </div>
        </div>
        <nav>
          {pmsModuleGroups.map((group) => (
            <details className="pms-sidebar__group" key={group} open>
              <summary>{group}</summary>
              <div className="pms-sidebar__links">
                {pmsModules
                  .filter((module) => module.group === group)
                  .map((module) =>
                    module.href ? (
                      <Link href={module.href} key={module.name}>
                        <span aria-hidden="true">{module.code}</span>
                        <strong>{module.name}</strong>
                      </Link>
                    ) : (
                      <span
                        aria-disabled="true"
                        className="pms-sidebar__disabled"
                        key={module.name}
                      >
                        <span aria-hidden="true">{module.code}</span>
                        <strong>{module.name}</strong>
                        <small>Phase {module.phase}</small>
                      </span>
                    ),
                  )}
              </div>
            </details>
          ))}
        </nav>
        <Link className="pms-sidebar__workspace-link" href="/partner">
          Return to partner workspace
        </Link>
      </aside>
      <div className="pms-shell__content">{children}</div>
    </div>
  );
}
