import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

interface NavigationProps {
  notificationCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({ notificationCount = 0 }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="navigation" role="navigation" aria-label="Main navigation">
      <div className="navigation__container">
        <Link to="/" className="navigation__logo">
          <span className="navigation__logo-text">Zena</span>
        </Link>

        <div className="navigation__links">
          <Link
            to="/focus"
            className={`navigation__link ${isActive('/focus') ? 'navigation__link--active' : ''}`}
            aria-current={isActive('/focus') ? 'page' : undefined}
          >
            Focus
          </Link>
          <Link
            to="/waiting"
            className={`navigation__link ${isActive('/waiting') ? 'navigation__link--active' : ''}`}
            aria-current={isActive('/waiting') ? 'page' : undefined}
          >
            Waiting
          </Link>
          <Link
            to="/contacts"
            className={`navigation__link ${isActive('/contacts') ? 'navigation__link--active' : ''}`}
            aria-current={isActive('/contacts') ? 'page' : undefined}
          >
            Contacts
          </Link>
          <Link
            to="/properties"
            className={`navigation__link ${isActive('/properties') ? 'navigation__link--active' : ''}`}
            aria-current={isActive('/properties') ? 'page' : undefined}
          >
            Properties
          </Link>
          <Link
            to="/ask-zena"
            className={`navigation__link ${isActive('/ask-zena') ? 'navigation__link--active' : ''}`}
            aria-current={isActive('/ask-zena') ? 'page' : undefined}
          >
            Ask Zena
          </Link>
        </div>

        <div className="navigation__actions">
          {notificationCount > 0 && (
            <span className="navigation__badge" aria-label={`${notificationCount} notifications`}>
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
          <Link
            to="/search"
            className={`navigation__link ${isActive('/search') ? 'navigation__link--active' : ''}`}
            aria-current={isActive('/search') ? 'page' : undefined}
            aria-label="Search"
          >
            🔍
          </Link>
          <Link
            to="/settings"
            className={`navigation__link ${isActive('/settings') ? 'navigation__link--active' : ''}`}
            aria-current={isActive('/settings') ? 'page' : undefined}
            aria-label="Settings"
          >
            ⚙️
          </Link>

        </div>
      </div>
    </nav>
  );
};
