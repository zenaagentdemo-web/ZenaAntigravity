import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';
import { WeatherTimeWidget } from '../WeatherTimeWidget/WeatherTimeWidget';
import { useTheme } from '../../hooks/useTheme';
import './DashboardHeader.css';

interface DashboardHeaderProps {
  agentName?: string;
  notificationCount?: number;
  onMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

interface NavigationItem {
  path: string;
  label: string;
  icon: string;
}

const navigationItems: NavigationItem[] = [
  { path: '/focus', label: 'Focus', icon: '🎯' },
  { path: '/waiting', label: 'Waiting', icon: '⏳' },
  { path: '/contacts', label: 'Contacts', icon: '👥' },
  { path: '/properties', label: 'Properties', icon: '🏠' },
  { path: '/ask-zena', label: 'Ask Zena', icon: '🤖' },
];

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  agentName = 'Agent',
  notificationCount = 0,
  onMenuToggle,
  isMobileMenuOpen = false
}) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="dashboard-header" role="banner">
      <div className="dashboard-header__container">
        {/* Brand Section */}
        <div className="dashboard-header__brand">
          <Link to="/" className="dashboard-header__logo" aria-label="Zena AI - Go to home">
            <div className="dashboard-header__logo-icon">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect width="32" height="32" rx="8" fill="currentColor" />
                <path
                  d="M8 12L16 8L24 12V20C24 21.1046 23.1046 22 22 22H10C8.89543 22 8 21.1046 8 20V12Z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 22V16H20V22"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="dashboard-header__logo-text">Zena AI</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="dashboard-header__nav" role="navigation" aria-label="Main navigation">
          <ul className="dashboard-header__nav-list">
            {navigationItems.map((item) => (
              <li key={item.path} className="dashboard-header__nav-item">
                <Link
                  to={item.path}
                  className={`dashboard-header__nav-link ${
                    isActive(item.path) ? 'dashboard-header__nav-link--active' : ''
                  }`}
                  aria-current={isActive(item.path) ? 'page' : undefined}
                >
                  <span className="dashboard-header__nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="dashboard-header__nav-label">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Actions Section */}
        <div className="dashboard-header__actions">
          {/* Search */}
          <Link
            to="/search"
            className={`dashboard-header__action-btn ${
              isActive('/search') ? 'dashboard-header__action-btn--active' : ''
            }`}
            aria-label="Search"
            title="Search"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </Link>

          {/* Notifications */}
          <button
            className="dashboard-header__action-btn dashboard-header__notifications"
            aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
            title="Notifications"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {notificationCount > 0 && (
              <span className="dashboard-header__badge" aria-hidden="true">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          {/* Weather & Time */}
          <div className="dashboard-header__weather">
            <WeatherTimeWidget />
          </div>

          {/* Theme Toggle */}
          <ThemeToggle
            currentTheme={theme}
            onToggle={toggleTheme}
            position="header"
          />

          {/* Profile Menu */}
          <div className="dashboard-header__profile">
            <button
              className="dashboard-header__profile-btn"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              aria-label={`User menu for ${agentName}`}
            >
              <div className="dashboard-header__avatar">
                {getInitials(agentName)}
              </div>
              <span className="dashboard-header__profile-name">{agentName}</span>
              <svg
                className={`dashboard-header__profile-chevron ${
                  isProfileMenuOpen ? 'dashboard-header__profile-chevron--open' : ''
                }`}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6,9 12,15 18,9" />
              </svg>
            </button>

            {/* Profile Dropdown */}
            {isProfileMenuOpen && (
              <div className="dashboard-header__profile-menu" role="menu">
                <Link
                  to="/settings"
                  className="dashboard-header__profile-item"
                  role="menuitem"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V12a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Settings
                </Link>
                <button
                  className="dashboard-header__profile-item dashboard-header__profile-item--logout"
                  role="menuitem"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    // Handle logout logic here
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16,17 21,12 16,7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="dashboard-header__mobile-toggle"
            onClick={onMenuToggle}
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle mobile menu"
          >
            <span className="dashboard-header__hamburger">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="dashboard-header__mobile-nav">
          <nav role="navigation" aria-label="Mobile navigation">
            <ul className="dashboard-header__mobile-nav-list">
              {navigationItems.map((item) => (
                <li key={item.path} className="dashboard-header__mobile-nav-item">
                  <Link
                    to={item.path}
                    className={`dashboard-header__mobile-nav-link ${
                      isActive(item.path) ? 'dashboard-header__mobile-nav-link--active' : ''
                    }`}
                    onClick={onMenuToggle}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                  >
                    <span className="dashboard-header__mobile-nav-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="dashboard-header__mobile-nav-label">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
};