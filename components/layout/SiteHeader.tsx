'use client';

import Link from 'next/link';
import { useState } from 'react';

import { siteConfig } from '@/config/site';

type SiteHeaderProps = { user: { firstName: string } | null };

export function SiteHeader({ user }: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-logo" href="/" onClick={closeMenu}>
          <span className="site-logo__mark">M</span>
          <span>
            Mandyal <strong>Travels</strong>
          </span>
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
              className="site-navigation__link"
              href={item.href}
              key={item.href}
              onClick={closeMenu}
            >
              {item.label}
            </Link>
          ))}

          <Link className="site-navigation__cta" href={user ? '/account' : '/login'} onClick={closeMenu}>
            {user ? `Hi, ${user.firstName}` : 'Sign in'}
          </Link>
        </nav>
      </div>
    </header>
  );
}
