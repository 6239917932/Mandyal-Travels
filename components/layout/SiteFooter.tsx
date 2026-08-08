import Link from 'next/link';

import { siteConfig } from '@/config/site';

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <p className="site-footer__brand">{siteConfig.name}</p>
          <p className="site-footer__description">{siteConfig.description}</p>
        </div>

        <div>
          <p className="site-footer__heading">Explore</p>
          <nav aria-label="Footer navigation" className="site-footer__links">
            {siteConfig.navigation.slice(1).map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <p className="site-footer__heading">Need help?</p>
          <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>
        </div>
      </div>

      <div className="site-footer__bottom">
        <p>© {currentYear} Mandyal Travels. All rights reserved.</p>
      </div>
    </footer>
  );
}
