'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { MandyalLogo } from '@/components/brand/MandyalLogo';
import { siteConfig } from '@/config/site';
import { getAccountHomePath } from '@/lib/auth/redirect';

type SiteHeaderProps = { user: { firstName: string; role: string } | null };

export function SiteHeader({ user }: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const isActivePage = (href: string) =>
    href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-logo" href="/" onClick={closeMenu}>
          <MandyalLogo size="compact" />
        </Link>

        <button
          aria-controls="primary-navigation"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="site-header__menu-button"
          onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
          type="button"
        >
          {isMenuOpen ? 'Close' : 'Menu'}
        </button>

        <nav
          aria-label="Primary navigation"
          className={`site-navigation ${isMenuOpen ? 'site-navigation--open' : ''}`}
          id="primary-navigation"
        >
          {siteConfig.navigation.map((item) => (
            <Link
              aria-current={isActivePage(item.href) ? 'page' : undefined}
              className="site-navigation__link"
              href={item.href}
              key={item.href}
              onClick={closeMenu}
            >
              {item.label}
            </Link>
          ))}

          <Link
            className="site-navigation__cta"
            href={user ? getAccountHomePath(user.role) : '/login'}
            onClick={closeMenu}
          >
            {user ? `Hi, ${user.firstName}` : 'Sign in'}
          </Link>
        </nav>
      </div>
    </header>
  );
}
