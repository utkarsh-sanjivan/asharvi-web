'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

import Button from '@/components/atoms/Button';
import ThemeToggle from '@/components/atoms/ThemeToggle';
import SearchBar from '@/components/molecules/SearchBar';

import { useAppSelector } from '@/hooks/useAppSelector';
import { useLogoutMutation, useProfileQuery } from '@/store/api/auth.api';
import { selectIsAuthenticated, selectUserProfile } from '@/store/selectors/user.selectors';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { clearUser } from '@/store/user.slice';

import './index.css';

export interface PublicNavbarProps {
  isAuthenticated?: boolean;
  showSearch?: boolean;
  transparent?: boolean;
}

export default function PublicNavbar(props: PublicNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { showSearch = true } = props;
  const userState = useAppSelector(selectUserProfile);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  useProfileQuery(undefined, { skip: !isAuthenticated });
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const displayUser = isAuthenticated
    ? {
        name: userState.name ?? '',
        email: userState.email ?? '',
      }
    : null;

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      dispatch(clearUser());
    } catch (error) {
      console.error('Logout error:', error);
    }
    setIsMenuOpen(false);
    router.push('/');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      router.push(`/courses?q=${encodeURIComponent(query)}`);
    }
  };

  const isActivePath = (path: string): boolean => {
    return pathname === path;
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const navbarClassName = props.transparent
    ? 'public-navbar public-navbar--transparent'
    : 'public-navbar';

  return (
    <nav className={navbarClassName}>
      <div className="public-navbar-container">
        {/* Logo */}
        <Link href="/" className="public-navbar-logo" onClick={closeMenu}>
          <img
            src="/images/logo.jpg"
            alt="Asharvi Web"
            className="public-navbar-logo-image"
          />
        </Link>

        {/* Desktop Navigation Links */}
        <div className="public-navbar-nav">
          <Link
            href="/courses"
            className={`public-navbar-link ${isActivePath('/courses') ? 'public-navbar-link--active' : ''}`}
            onClick={closeMenu}
          >
            Courses
          </Link>
          <Link
            href="/about"
            className={`public-navbar-link ${isActivePath('/about') ? 'public-navbar-link--active' : ''}`}
            onClick={closeMenu}
          >
            About
          </Link>
          <Link
            href="/contact"
            className={`public-navbar-link ${isActivePath('/contact') ? 'public-navbar-link--active' : ''}`}
            onClick={closeMenu}
          >
            Contact
          </Link>
        </div>

        {/* Search Bar - Desktop */}
        {showSearch && (
          <div className="public-navbar-search">
            <SearchBar placeholder="Search for parenting courses..." />
          </div>
        )}

        {/* Desktop Actions */}
        <div className="public-navbar-actions">
          <ThemeToggle />

          {displayUser ? (
            <>
              <div className="public-navbar-user">
                <span className="public-navbar-user-name">
                  Hello, {displayUser.name.split(' ')[0]}
                </span>
              </div>
              <Button onClick={handleLogout} variant="secondary" size="sm" disabled={isLoggingOut}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="secondary" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="primary" size="sm">
                  Sign Up
                </Button>
              </Link>
            </>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="public-navbar-mobile-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
          >
            <svg
              className="public-navbar-mobile-toggle-icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="public-navbar-mobile-menu">
          {/* Mobile Search */}
          {showSearch && (
            <div className="public-navbar-mobile-search">
              <SearchBar placeholder="Search for parenting courses..." />
            </div>
          )}

          <div className="public-navbar-mobile-links">
            <Link
              href="/courses"
              className={`public-navbar-mobile-link ${isActivePath('/courses') ? 'public-navbar-mobile-link--active' : ''}`}
              onClick={closeMenu}
            >
              Courses
            </Link>
            <Link
              href="/about"
              className={`public-navbar-mobile-link ${isActivePath('/about') ? 'public-navbar-mobile-link--active' : ''}`}
              onClick={closeMenu}
            >
              About
            </Link>
            <Link
              href="/contact"
              className={`public-navbar-mobile-link ${isActivePath('/contact') ? 'public-navbar-mobile-link--active' : ''}`}
              onClick={closeMenu}
            >
              Contact
            </Link>
          </div>

          <div className="public-navbar-mobile-actions">
            {displayUser ? (
              <>
                <div className="public-navbar-mobile-user">
                  <span className="public-navbar-mobile-user-name">
                    Hello, {displayUser.name}
                  </span>
                  <span className="public-navbar-mobile-user-email">
                    {displayUser.email}
                  </span>
                </div>
                <Button onClick={handleLogout} variant="secondary" className="public-navbar-mobile-button">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="public-navbar-mobile-button-link" onClick={closeMenu}>
                  <Button variant="secondary" className="public-navbar-mobile-button">
                    Login
                  </Button>
                </Link>
                <Link href="/auth/signup" className="public-navbar-mobile-button-link" onClick={closeMenu}>
                  <Button variant="primary" className="public-navbar-mobile-button">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
