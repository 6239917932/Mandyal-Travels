import Link from 'next/link';

import { MandyalLogo } from '@/components/brand/MandyalLogo';
import { siteConfig } from '@/config/site';

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <Link aria-label="Mandyal Travels home" className="site-footer__logo" href="/">
            <MandyalLogo appearance="inverse" eager showTagline />
          </Link>
          <p className="site-footer__description">{siteConfig.description}</p>
          <p className="site-footer__origin">
            Registered office: Joginder Nagar · Corporate office: Bir, Himachal Pradesh, India.
          </p>
        </div>

        <div>
          <p className="site-footer__heading">Explore</p>
          <nav aria-label="Footer navigation" className="site-footer__links">
            {siteConfig.footerNavigation.map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <p className="site-footer__heading">Legal</p>
          <nav aria-label="Legal navigation" className="site-footer__links">
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/cancellation-refunds">Cancellation &amp; refunds</Link>
            <Link href="/legal/cookies">Cookie notice</Link>
          </nav>
        </div>

        <div>
          <p className="site-footer__heading">Need help?</p>
          <div className="site-footer__contacts">
            <a href={`tel:${siteConfig.supportPhone.href}`}>{siteConfig.supportPhone.display}</a>
            <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>
            <Link href="/contact">Contact us and office locations</Link>
          </div>
        </div>
      </div>

      <div className="site-footer__trust" aria-label="Payment and website security information">
        <div>
          <strong>Secure website</strong>
          <span>Encrypted connections · Protected account access · Human support</span>
        </div>
        <div className="site-footer__payments" aria-label="Supported payment methods">
          <span>Visa</span>
          <span>Mastercard</span>
          <span>RuPay</span>
          <span>UPI</span>
          <span>PayPal</span>
        </div>
        <small>
          Payment options are shown at checkout and depend on the active payment provider.
        </small>
      </div>

      <div className="site-footer__bottom">
        <p>© {currentYear} Mandyal Travels. All rights reserved.</p>
      </div>
    </footer>
  );
}
